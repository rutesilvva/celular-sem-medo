import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, MetricCard, ProgressBar, Tag } from '@/components/ui';
import { publicDemoMissions } from '@/features/public-demo/catalog';
import { colors, radius, spacing } from '@/theme/tokens';

type DemoMission = {
  id: string;
  title: string;
  category: string;
  difficulty: 'Fácil' | 'Média' | 'Difícil';
  duration: string;
  summary: string;
  accent: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const missionAccents = ['#4A2D7B', '#176B5B', '#4A90E2', '#28323C', '#1769AA', '#C75B12', '#A63A2B', '#C93636', '#315A88', '#1351B4'];
const missions: DemoMission[] = publicDemoMissions.map((mission, index) => ({
  id: mission.key,
  title: mission.details.title,
  category: mission.details.category,
  difficulty: mission.details.difficulty === 'easy' ? 'Fácil' : mission.details.difficulty === 'medium' ? 'Média' : 'Difícil',
  duration: `${mission.details.estimatedMinutes} min`,
  summary: mission.details.summary,
  accent: missionAccents[index] ?? colors.primary,
  icon: mission.icon,
}));
export default function DemoScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('pix');
  const [showEducator, setShowEducator] = useState(true);

  const selected = useMemo<DemoMission>(() => {
    return missions.find((mission) => mission.id === selectedId) ?? missions[0]!;
  }, [selectedId]);
  return (
    <Screen footer={<ParticipantNav active="home" publicDemo />} contentStyle={styles.content}>
      <Header title="Celular Sem Medo" subtitle="Apresentação pública · nenhum dado real é usado" />
      <Tag label="Modo seguro de teste" tone="green" />

      <Card style={styles.publicAccessCard}>
        <AppText variant="heading" weight="800">Experimente o Celular Sem Medo</AppText>
        <AppText color={colors.textMuted}>Entre na demonstração e experimente as missões como um participante.</AppText>
        <View style={styles.publicActions}>
          <Button label="Começar demonstração" icon="play-outline" onPress={() => router.push('/demo-app')} />
          <Button label={showEducator ? 'Ocultar painel do educador' : 'Ver painel do educador'} icon="people-outline" variant="secondary" onPress={() => setShowEducator((current) => !current)} />
        </View>
      </Card>

      <Card style={styles.demoDisclosureCard}>
        <View style={styles.presentationTitle}>
          <Ionicons name="information-circle-outline" size={28} color={colors.primary} />
          <View style={styles.flex}>
            <AppText weight="800">Demonstração para conhecer o aplicativo</AppText>
            <AppText variant="small" color={colors.textMuted}>
              Todos os nomes, percentuais e resultados desta tela são exemplos fictícios. Eles não representam uma pesquisa com pessoas idosas.
            </AppText>
          </View>
        </View>
      </Card>

      <PublicProductOverview />
      {showEducator ? <PublicEducatorPreview /> : null}

      <Card style={styles.headerCard}>
        <AppText variant="caption" weight="800" color={colors.primary}>MISSÃO ATIVA</AppText>
        <AppText variant="heading" weight="800">{selected.title}</AppText>
        <AppText variant="small" color={colors.textMuted}>{selected.summary}</AppText>
      </Card>

      <View style={styles.list}>
        {missions.map((mission) => (
          <Pressable
            key={mission.id}
            accessibilityRole="button"
            onPress={() => setSelectedId(mission.id)}
            style={({ pressed }) => [
              styles.missionCard,
              selected.id === mission.id && styles.missionCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.missionAccent, { backgroundColor: mission.accent }]} />
            <View style={[styles.missionIcon, { backgroundColor: `${mission.accent}18` }]}>
              <Ionicons name={mission.icon} size={30} color={mission.accent} />
            </View>
            <View style={styles.missionBody}>
              <View style={styles.missionHeader}>
                <AppText variant="subheading" weight="800">{mission.title}</AppText>
                <Tag label={mission.difficulty} tone={mission.difficulty === 'Fácil' ? 'green' : mission.difficulty === 'Média' ? 'purple' : 'yellow'} />
              </View>

              <AppText variant="small" color={colors.textMuted}>{mission.category}</AppText>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.iconMuted} />
                  <AppText variant="small" color={colors.textMuted}>{mission.duration}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                  <AppText variant="small" color={colors.textMuted}>Simulação</AppText>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={25} color={colors.primary} />
          </Pressable>
        ))}
      </View>

      <Card style={styles.detailCard}>
        <View style={styles.detailHeading}>
          <View style={[styles.detailIcon, { backgroundColor: `${selected.accent}18` }]}><Ionicons name={selected.icon} size={34} color={selected.accent} /></View>
          <View style={styles.flex}><AppText variant="caption" weight="800" color={colors.primary}>{selected.category.toUpperCase()}</AppText><AppText variant="heading" weight="800">Resumo da missão</AppText></View>
        </View>
        <AppText variant="small" color={colors.textMuted}>{selected.summary}</AppText>

        <View style={styles.detailActions}>
          <Button label="Abrir esta missão passo a passo" onPress={() => router.push({ pathname: '/demo-mission-details', params: { mission: selected.id } })} />
        </View>
      </Card>

      <AppText variant="small" color={colors.textMuted} style={styles.note}>
        Este modo não usa conta real, banco ou Google. Ele só simula a jornada da missão para validar o fluxo visual e a navegação.
      </AppText>
    </Screen>
  );
}

function PublicProductOverview() {
  return <Card style={styles.overviewCard}>
    <Tag label="CONHEÇA O APLICATIVO" tone="purple" />
    <AppText variant="heading" weight="800">Aprender fazendo, sem medo de errar</AppText>
    <AppText>O Celular Sem Medo ensina pessoas idosas a usar recursos digitais e reconhecer golpes por meio de missões curtas e seguras.</AppText>
    <View style={styles.learningList}>
      <LearningItem icon="hand-left-outline" title="Passo a passo" text="Uma instrução principal e um local claro para tocar em cada etapa." />
      <LearningItem icon="shield-checkmark-outline" title="Simulações sem risco" text="Nenhum dinheiro, mensagem ou dado pessoal real é enviado." />
      <LearningItem icon="volume-high-outline" title="Apoio quando solicitado" text="Texto ampliado, contraste e áudio opcional ajudam sem tirar a autonomia." />
    </View>
  </Card>;
}

function PublicEducatorPreview() {
  return <Card style={styles.educatorCard}>
    <View style={styles.presentationTitle}><View style={styles.presentationIcon}><Ionicons name="people-outline" size={28} color={colors.primary}/></View><View style={styles.flex}><AppText variant="heading" weight="800">Painel do educador</AppText><AppText variant="small" color={colors.textMuted}>Prévia demonstrativa com dados inteiramente fictícios.</AppText></View></View>
    <Tag label="DADOS FICTÍCIOS" tone="yellow" />
    <View style={styles.metricGrid}><MetricCard icon="people-outline" value="12" label="participantes de exemplo"/><MetricCard icon="checkmark-done-outline" value="24" label="missões de exemplo" tone="green"/></View>
    <Card style={styles.educatorProgress}>
      <View style={styles.progressCopy}><AppText weight="800">Progresso demonstrativo da turma</AppText><AppText weight="800" color={colors.primary}>78%</AppText></View>
      <ProgressBar value={78} />
      <View style={styles.metricGrid}><MetricCard icon="hand-left-outline" value="78%" label="autonomia fictícia" tone="blue"/><MetricCard icon="help-circle-outline" value="8 → 4" label="pedidos de ajuda fictícios" tone="green"/></View>
      <AppText variant="caption" color={colors.textMuted}>Exemplo visual de como o educador acompanharia uma oficina. Estes números são simulados e não representam usuários ou pesquisa real.</AppText>
    </Card>
    <AppText variant="small">No uso real, somente profissionais autorizados visualizam as turmas sob sua responsabilidade. O painel ajuda a identificar dificuldades e planejar novas oficinas.</AppText>
  </Card>;
}

function LearningItem({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) {
  return <View style={styles.learningItem}><Ionicons name={icon} size={26} color={colors.primary}/><View style={styles.flex}><AppText weight="800">{title}</AppText><AppText variant="small" color={colors.textMuted}>{text}</AppText></View></View>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  publicAccessCard: { backgroundColor: colors.surface, borderColor: colors.primary, gap: spacing.md },
  publicActions: { gap: spacing.sm },
  overviewCard: { gap: spacing.md },
  educatorCard: { backgroundColor: colors.surface, borderColor: colors.primaryMuted, gap: spacing.md },
  educatorProgress: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, gap: spacing.md },
  learningList: { gap: spacing.md },
  learningItem: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  headerCard: { gap: spacing.sm },
  presentationCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary, gap: spacing.md },
  demoDisclosureCard: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, gap: spacing.md },
  evidenceCard: { backgroundColor: colors.surface, borderColor: colors.primaryMuted, gap: spacing.md },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  fakeInput: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.md },
  metricGrid: { flexDirection: 'row', gap: spacing.md },
  progressCopy: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  list: { gap: spacing.md },
  missionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 120,
    padding: spacing.md,
  },
  missionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F9F3FF',
  },
  missionAccent: {
    borderRadius: radius.lg,
    height: 72,
    width: 8,
  },
  missionIcon: { alignItems: 'center', borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  missionBody: { flex: 1, gap: spacing.sm },
  missionHeader: { alignItems: 'flex-start', gap: spacing.sm },
  presentationTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  presentationIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  stepTrack: { flexDirection: 'row', gap: spacing.xs },
  stepDot: { backgroundColor: colors.border, borderRadius: radius.round, flex: 1, height: 8 },
  stepDotActive: { backgroundColor: colors.primary },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  detailCard: { gap: spacing.md },
  detailHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  detailIcon: { alignItems: 'center', borderRadius: radius.lg, height: 62, justifyContent: 'center', width: 62 },
  detailActions: { flexDirection: 'row', gap: spacing.md },
  note: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
