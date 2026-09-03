import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { generateAiMission } from '@/lib/ai-mission-generator';
import { createLearningRequest, getMissionRecommendations, type MissionRecommendation, type ParticipantMission } from '@/lib/backend';
import { colors, radius, spacing, type } from '@/theme/tokens';

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantMissionsScreen() {
  const router = useRouter();
  const query = useMissionCatalog();
  const [wanted, setWanted] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [recommendations, setRecommendations] = useState<MissionRecommendation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const search = async () => {
    setSearching(true);
    setMessage('');
    try {
      const result = await getMissionRecommendations(wanted);
      setRecommendations(result);
      if (!result.length) setMessage('Ainda não temos essa missão no catálogo. Você pode gerar com IA abaixo!');
    } catch {
      setMessage('Não foi possível pesquisar agora.');
    } finally {
      setSearching(false);
    }
  };

  const handleGenerateAi = async () => {
    if (!wanted.trim()) return;
    setAiGenerating(true);
    setMessage('');
    try {
      const aiSessionId = await generateAiMission(wanted);
      router.push({ pathname: '/participant/simulator', params: { aiSessionId } });
    } catch {
      setMessage('Não foi possível gerar o treino por IA no momento.');
    } finally {
      setAiGenerating(false);
    }
  };

  const categories = useMemo(() => {
    if (!query.data) return ['Todas'];
    const set = new Set(query.data.map((m) => m.category));
    return ['Todas', ...Array.from(set)];
  }, [query.data]);

  const displayedMissions = useMemo(() => {
    if (!query.data) return [];
    let list = recommendations
      ? recommendations
          .map((item) => query.data!.find((mission) => mission.assignmentId === item.assignment_id))
          .filter((mission): mission is ParticipantMission => Boolean(mission))
      : query.data;

    if (selectedCategory !== 'Todas') {
      list = list.filter((m) => m.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    return list;
  }, [query.data, recommendations, selectedCategory]);
  const recommendationReasons = useMemo(() => new Map(
    (recommendations ?? []).map((item) => [item.assignment_id, item.recommendation_reason]),
  ), [recommendations]);

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Escolha uma missão" subtitle="Comece por algo que faça parte do seu dia a dia." audio />
      {query.offline ? <Tag label="Catálogo salvo · sem internet" tone="yellow" /> : null}

      <Card style={styles.introCard}>
        <View style={styles.introIcon}><Ionicons name="flag" size={28} color={colors.primary} /></View>
        <View style={styles.introCopy}>
          <AppText weight="800">Qual habilidade você quer treinar?</AppText>
          <AppText variant="small" color={colors.textMuted}>O catálogo mostra conteúdos da sua turma e treinos por Inteligência Artificial.</AppText>
        </View>
      </Card>

      <Card style={styles.searchCard}>
        <AppText weight="800">Quero aprender isto</AppText>
        <TextInput accessibilityLabel="O que você quer aprender" placeholder="Ex.: agendar remédio, pedir comida" placeholderTextColor={colors.placeholder} value={wanted} onChangeText={setWanted} style={styles.input} />
        <View style={styles.searchActions}>
          <Button label={searching ? 'Buscando…' : 'Buscar no catálogo'} disabled={wanted.trim().length < 3 || searching || aiGenerating} icon="search" variant="secondary" onPress={() => void search()} />
          <Button label={aiGenerating ? 'Criando treino com IA… 🤖' : '✨ Gerar treino com IA'} disabled={wanted.trim().length < 3 || searching || aiGenerating} icon="sparkles" variant="primary" onPress={() => void handleGenerateAi()} />
        </View>
        {message ? <AppText variant="small" color={colors.textMuted}>{message}</AppText> : null}
        {recommendations?.length === 0 ? <Button label="Enviar sugestão de nova missão" variant="soft" onPress={() => void createLearningRequest(wanted).then(() => setMessage('Sugestão registrada para a equipe.'))} /> : null}
      </Card>

      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
          {categories.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filtrar por ${cat}`}
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <AppText variant="small" weight="700" color={active ? colors.surface : colors.primary}>
                  {cat}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {query.loading ? (
        <DataState kind="loading" title="Carregando missões" message="Buscando o conteúdo publicado para sua turma." />
      ) : query.error ? (
        <DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente novamente." onRetry={query.retry} />
      ) : !query.data?.length ? (
        <DataState kind="empty" title="Nenhuma missão disponível" message="Sua turma ainda não possui uma missão publicada." />
      ) : !displayedMissions.length ? (
        <DataState kind="empty" title="Nenhuma missão nesta categoria" message="Tente selecionar outra categoria nas pílulas acima." />
      ) : (
        <>
          <View accessibilityRole="list" style={styles.list}>
            {displayedMissions.map((mission, index) => (
              <MissionCard
                key={mission.assignmentId}
                mission={mission}
                recommended={index === 0 && selectedCategory === 'Todas' && !recommendations}
                recommendationReason={recommendationReasons.get(mission.assignmentId) ?? (mission.required ? 'Esta atividade faz parte da trilha da sua turma.' : index === 0 && !recommendations ? 'Uma boa próxima habilidade para continuar sua trilha.' : undefined)}
                onPress={() => router.push({
                  pathname: '/participant/mission-details',
                  params: { assignmentId: mission.assignmentId },
                })}
              />
            ))}
          </View>
          <AudioButton
            label="Ouvir as missões"
            message={displayedMissions.map((mission) => `${mission.title}, ${mission.estimatedMinutes} minutos, dificuldade ${difficultyLabels[mission.difficulty]}`).join('. ')}
          />
        </>
      )}
    </Screen>
  );
}

function iconForCategory(category: string): keyof typeof Ionicons.glyphMap {
  const cat = category.toLowerCase();
  if (cat.includes('segurança')) return 'shield-checkmark-outline';
  if (cat.includes('mensagem')) return 'chatbubbles-outline';
  if (cat.includes('mobilidade')) return 'car-outline';
  if (cat.includes('compra')) return 'cart-outline';
  if (cat.includes('aplicativo')) return 'apps-outline';
  return 'school-outline';
}

function MissionCard({ mission, recommended, recommendationReason, onPress }: {
  mission: ParticipantMission;
  recommended: boolean;
  recommendationReason?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mission.title}. ${mission.category}. ${mission.estimatedMinutes} minutos. Dificuldade ${difficultyLabels[mission.difficulty]}. ${recommendationReason ?? ''}`}
      accessibilityHint="Abre os detalhes da versão publicada"
      onPress={onPress}
      style={({ pressed }) => [styles.mission, recommended && styles.missionRecommended, pressed && styles.pressed]}
    >
      <View style={styles.missionIcon}>
        <Ionicons name={iconForCategory(mission.category)} size={28} color={colors.primary} />
      </View>
      <View style={styles.missionBody}>
        <View style={styles.missionHeading}>
          <AppText variant="subheading" weight="800" style={styles.missionTitle}>{mission.title}</AppText>
          {recommended ? <Tag label="Recomendada" tone="purple" /> : null}
        </View>
        <AppText variant="small" color={colors.textMuted}>{mission.category}</AppText>
        {recommendationReason ? <View style={styles.reason}><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><AppText variant="small" color={colors.primary} style={styles.reasonCopy}>{recommendationReason}</AppText></View> : null}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Ionicons name="time-outline" size={18} color={colors.iconMuted} /><AppText variant="small" color={colors.textMuted}>{mission.estimatedMinutes} min</AppText></View>
          <View style={styles.metaItem}><Ionicons name="leaf-outline" size={18} color={colors.success} /><AppText variant="small" color={colors.textMuted}>{difficultyLabels[mission.difficulty]}</AppText></View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={23} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  introCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  introIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  introCopy: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.md },
  mission: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 132, padding: spacing.lg },
  missionRecommended: { borderColor: colors.primary, borderWidth: 2, backgroundColor: '#FBF7FF' },
  missionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  missionBody: { flex: 1, gap: spacing.xs },
  reason: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  reasonCopy: { flex: 1 },
  missionHeading: { alignItems: 'flex-start', gap: spacing.sm },
  missionTitle: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xs },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  searchCard: { gap: spacing.md },
  searchActions: { gap: spacing.md },
  input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: type.family, fontSize: type.body, minHeight: 56, paddingHorizontal: spacing.md },
  pillsContainer: { gap: spacing.sm, paddingVertical: spacing.xs },
  pill: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderRadius: radius.round, borderWidth: 1.5, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
});
