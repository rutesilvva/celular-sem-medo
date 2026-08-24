import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Card, Header, Tag } from '@/components/ui';
import { useMissionCatalog } from '@/hooks/useMissionData';
import type { ParticipantMission } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

const difficultyLabels = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

export default function ParticipantMissionsScreen() {
  const router = useRouter();
  const query = useMissionCatalog();

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title="Escolher missão" subtitle="Pratique uma habilidade por vez." audio />

      <Card style={styles.introCard}>
        <View style={styles.introIcon}><Ionicons name="flag" size={28} color={colors.primary} /></View>
        <View style={styles.introCopy}>
          <AppText weight="800">Qual habilidade você quer treinar?</AppText>
          <AppText variant="small" color={colors.textMuted}>O catálogo mostra apenas conteúdos publicados e liberados para sua turma.</AppText>
        </View>
      </Card>

      {query.loading ? (
        <DataState kind="loading" title="Carregando missões" message="Buscando o conteúdo publicado para sua turma." />
      ) : query.error ? (
        <DataState kind="error" title="Não foi possível carregar" message="Verifique sua conexão e tente novamente." onRetry={query.retry} />
      ) : !query.data?.length ? (
        <DataState kind="empty" title="Nenhuma missão disponível" message="Sua turma ainda não possui uma missão publicada." />
      ) : (
        <>
          <View accessibilityRole="list" style={styles.list}>
            {query.data.map((mission, index) => (
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
  introCard: { alignItems: 'center', backgroundColor: colors.primarySoft, flexDirection: 'row', gap: spacing.md },
  introIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  introCopy: { flex: 1, gap: spacing.xs },
  list: { gap: spacing.md },
  mission: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 132, padding: spacing.lg },
  missionRecommended: { borderColor: colors.primary, borderWidth: 2 },
  missionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  missionBody: { flex: 1, gap: spacing.xs },
  missionHeading: { alignItems: 'flex-start', gap: spacing.sm },
  missionTitle: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xs },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
