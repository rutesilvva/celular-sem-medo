import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, Tag } from '@/components/ui';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { createLearningRequest, getMissionRecommendations, type MissionRecommendation, type ParticipantMission } from '@/lib/backend';
import { colors, radius, spacing, type } from '@/theme/tokens';

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantMissionsScreen() {
  const router = useRouter();
  const query = useMissionCatalog();
  const [wanted, setWanted] = useState('');
  const [recommendations, setRecommendations] = useState<MissionRecommendation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const search = async () => { setSearching(true); setMessage(''); try { const result=await getMissionRecommendations(wanted); setRecommendations(result); if (!result.length) setMessage('Ainda não temos essa missão. Você pode enviar essa sugestão.'); } catch { setMessage('Não foi possível pesquisar agora.'); } finally { setSearching(false); } };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Escolha uma missão" subtitle="Comece por algo que faça parte do seu dia a dia." audio />

      <Card style={styles.introCard}>
        <View style={styles.introIcon}><Ionicons name="flag" size={28} color={colors.primary} /></View>
        <View style={styles.introCopy}>
          <AppText weight="800">Qual habilidade você quer treinar?</AppText>
          <AppText variant="small" color={colors.textMuted}>O catálogo mostra apenas conteúdos publicados e liberados para sua turma.</AppText>
        </View>
      </Card>
      <Card style={styles.searchCard}><AppText weight="800">Quero aprender isto</AppText><TextInput accessibilityLabel="O que você quer aprender" placeholder="Ex.: reconhecer uma mensagem falsa" placeholderTextColor={colors.placeholder} value={wanted} onChangeText={setWanted} style={styles.input} /><Button label={searching ? 'Buscando…' : 'Encontrar uma missão'} disabled={wanted.trim().length < 3 || searching} icon="search" onPress={() => void search()} />{message ? <AppText variant="small" color={colors.textMuted}>{message}</AppText> : null}{recommendations?.length === 0 ? <Button label="Enviar sugestão de nova missão" variant="soft" onPress={() => void createLearningRequest(wanted).then(() => setMessage('Sugestão registrada para a equipe.'))} /> : null}</Card>

      {query.loading ? (
        <DataState kind="loading" title="Carregando missões" message="Buscando o conteúdo publicado para sua turma." />
      ) : query.error ? (
        <DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente novamente." onRetry={query.retry} />
      ) : !query.data?.length ? (
        <DataState kind="empty" title="Nenhuma missão disponível" message="Sua turma ainda não possui uma missão publicada." />
      ) : (
        <>
          <View accessibilityRole="list" style={styles.list}>
            {(recommendations ? recommendations.map((item) => query.data!.find((mission) => mission.assignmentId === item.assignment_id)).filter((mission): mission is ParticipantMission => Boolean(mission)) : query.data).map((mission, index) => (
              <MissionCard
                key={mission.assignmentId}
                mission={mission}
                recommended={index === 0}
                onPress={() => router.push({
                  pathname: '/participant/mission-details',
                  params: { assignmentId: mission.assignmentId },
                })}
              />
            ))}
          </View>
          <AudioButton
            label="Ouvir as missões"
            message={query.data.map((mission) => `${mission.title}, ${mission.estimatedMinutes} minutos, dificuldade ${difficultyLabels[mission.difficulty]}`).join('. ')}
          />
        </>
      )}
    </Screen>
  );
}

function MissionCard({ mission, recommended, onPress }: {
  mission: ParticipantMission;
  recommended: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${mission.title}. ${mission.category}. ${mission.estimatedMinutes} minutos. Dificuldade ${difficultyLabels[mission.difficulty]}.`}
      accessibilityHint="Abre os detalhes da versão publicada"
      onPress={onPress}
      style={({ pressed }) => [styles.mission, recommended && styles.missionRecommended, pressed && styles.pressed]}
    >
      <View style={styles.missionIcon}><Ionicons name="school-outline" size={30} color={colors.primary} /></View>
      <View style={styles.missionBody}>
        <View style={styles.missionHeading}>
          <AppText variant="subheading" weight="800" style={styles.missionTitle}>{mission.title}</AppText>
          {recommended ? <Tag label="Recomendada" tone="purple" /> : null}
        </View>
        <AppText variant="small" color={colors.textMuted}>{mission.category}</AppText>
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
  missionHeading: { alignItems: 'flex-start', gap: spacing.sm },
  missionTitle: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xs },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  searchCard: { gap: spacing.md },
  input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: type.family, fontSize: type.body, minHeight: 56, paddingHorizontal: spacing.md },
});
