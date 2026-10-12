import Ionicons from '@expo/vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, MetricCard, ProgressBar, Tag } from '@/components/ui';
import { competitionDemoSteps as presentationSteps, COMPETITION_DEMO_TARGET_SECONDS } from '@/features/impact/story';
import { colors, radius, spacing } from '@/theme/tokens';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { getPresentationReadiness } from '@/lib/presentation-readiness';

type DemoMission = {
  id: string;
  title: string;
  category: string;
  difficulty: 'Fácil' | 'Média' | 'Difícil';
  duration: string;
  summary: string;
  accent: string;
};

const missions: DemoMission[] = [
  {
    id: 'pix',
    title: 'Fazer um Pix seguro',
    category: 'Financeiro',
    difficulty: 'Média',
    duration: '8 min',
    summary: 'Você aprende a verificar a chave Pix, conferir o valor e confirmar apenas depois de revisar os dados.',
    accent: '#4a2d7b',
  },
  {
    id: 'whatsapp',
    title: 'Enviar uma foto pelo WhatsApp',
    category: 'Comunicação',
    difficulty: 'Fácil',
    duration: '6 min',
    summary: 'A missão mostra como anexar uma imagem, revisar o contato e enviar somente para o destino certo.',
    accent: '#1DBB4F',
  },
  {
    id: 'localizacao',
    title: 'Compartilhar localização',
    category: 'Segurança digital',
    difficulty: 'Difícil',
    duration: '7 min',
    summary: 'Você pratica o cuidado ao compartilhar localização e evita enviar dados sensíveis para qualquer pessoa.',
    accent: '#4A90E2',
  },
];
export default function DemoScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('pix');
  const [presentationStep, setPresentationStep] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [networkAvailable, setNetworkAvailable] = useState<boolean | null>(null);
  useEffect(() => { if (startedAt === null) return; const timer=setInterval(()=>setElapsedSeconds(Math.floor((Date.now()-startedAt)/1000)),1000);return()=>clearInterval(timer); }, [startedAt]);
  useEffect(() => { let active=true;void NetInfo.fetch().then((state)=>{if(active)setNetworkAvailable(state.isConnected!==false&&state.isInternetReachable!==false);}).catch(()=>{if(active)setNetworkAvailable(false);});return()=>{active=false}; }, []);

  const selected = useMemo<DemoMission>(() => {
    return missions.find((mission) => mission.id === selectedId) ?? {
      id: 'pix',
      title: 'Fazer um Pix seguro',
      category: 'Financeiro',
      difficulty: 'Média',
      duration: '8 min',
      summary: 'Você aprende a verificar a chave Pix, conferir o valor e confirmar apenas depois de revisar os dados.',
      accent: '#4a2d7b',
    };
  }, [selectedId]);
  const presentation = presentationSteps[presentationStep] ?? presentationSteps[0];
  const readiness = useMemo(() => getPresentationReadiness(), []);
  const resetPresentation = () => { setPresentationStep(0); setStartedAt(null); setElapsedSeconds(0); setSelectedId('pix'); };
  const startPresentation = () => { setPresentationStep(0); setStartedAt(Date.now()); setElapsedSeconds(0); setSelectedId('pix'); };

  if (!isDemoModeEnabled()) return <Redirect href="/login" />;

  return (
    <Screen contentStyle={styles.content}>
      <Header title="Missões de demonstração" subtitle="Modo controlado e sem dados reais" onBack={() => router.replace('/login')} />
      <Tag label="Modo seguro de teste" tone="green" />

      <Card style={styles.readinessCard}>
        <View style={styles.presentationTitle}><View style={styles.presentationIcon}><Ionicons name="pulse-outline" size={28} color={colors.primary}/></View><View style={styles.flex}><AppText variant="subheading" weight="800">Verificação da apresentação</AppText><AppText variant="small" color={colors.textMuted}>Nenhum token, e-mail ou segredo é exibido.</AppText></View><Tag label={networkAvailable===null?'Verificando rede':networkAvailable?'Online':'Offline seguro'} tone={networkAvailable===false?'yellow':'green'}/></View>
        <View style={styles.checkList}>{readiness.map((check)=><View key={check.id} style={styles.checkRow}><Ionicons name={check.status==='ready'?'checkmark-circle':'alert-circle'} size={22} color={check.status==='ready'?colors.success:colors.warning}/><View style={styles.flex}><AppText weight="800" variant="small">{check.label}</AppText><AppText variant="caption" color={colors.textMuted}>{check.detail}</AppText></View></View>)}</View>
      </Card>

      <Card style={styles.dynamicCard}>
        <View style={styles.presentationTitle}><View style={styles.presentationIcon}><Ionicons name="sparkles-outline" size={28} color={colors.primary}/></View><View style={styles.flex}><AppText variant="subheading" weight="800">Missões montadas por JSON seguro</AppText><AppText variant="small" color={colors.textMuted}>Funcionam offline e usam somente componentes permitidos pelo aplicativo.</AppText></View></View>
        <View style={styles.detailActions}><Button label="Assistir e buscar vídeos" onPress={()=>router.push({pathname:'/dynamic-mission',params:{id:'video'}})}/><Button label="Abrir fallback" variant="secondary" onPress={()=>router.push({pathname:'/dynamic-mission',params:{id:'fallback'}})}/></View>
      </Card>

      <Card style={styles.presentationCard}>
        <View style={styles.missionHeader}><Tag label={`Roteiro ${presentationStep + 1} de ${presentationSteps.length}`} tone="purple" /><Tag label={`${Math.floor(elapsedSeconds/60)}:${String(elapsedSeconds%60).padStart(2,'0')} / 3:00`} tone={elapsedSeconds <= COMPETITION_DEMO_TARGET_SECONDS ? 'green' : 'yellow'}/><AppText variant="caption" weight="800" color={colors.primary}>APRESENTAÇÃO PARA A BANCA</AppText></View>
        <View style={styles.stepTrack}>{presentationSteps.map((step,index)=><View accessibilityLabel={`${step.title}${index===presentationStep?', etapa atual':''}`} key={step.key} style={[styles.stepDot,index<=presentationStep&&styles.stepDotActive]}/>)}</View>
        <View style={styles.presentationTitle}><View style={styles.presentationIcon}><Ionicons name={presentation.icon} size={28} color={colors.primary}/></View><AppText variant="heading" weight="800" style={styles.flex}>{presentationStep + 1}. {presentation.title}</AppText></View>
        <AppText>{presentation.text}</AppText>
        <Tag label={presentation.metric} tone="green" />
        <DemoJourneyEvidence step={presentationStep} onOpenMission={()=>router.push({pathname:'/dynamic-mission',params:{id:'video'}})}/>
        {startedAt === null ? <Button label="Iniciar roteiro de 3 minutos" icon="play-outline" onPress={startPresentation}/> : <View style={styles.detailActions}>
          <Button label="Anterior" variant="secondary" disabled={presentationStep === 0} onPress={() => setPresentationStep((value) => Math.max(0, value - 1))} />
          <Button label={presentationStep === presentationSteps.length - 1 ? 'Concluir e reiniciar' : 'Próximo'} onPress={() => { if (presentationStep === presentationSteps.length - 1) { resetPresentation(); return; } setPresentationStep((value) => value + 1); }} />
        </View>}
        {startedAt !== null ? <Button label="Reiniciar apresentação" icon="refresh-outline" variant="soft" onPress={resetPresentation}/> : null}
      </Card>

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
          </Pressable>
        ))}
      </View>

      <Card style={styles.detailCard}>
        <AppText variant="caption" weight="800" color={colors.primary}>{selected.category.toUpperCase()}</AppText>
        <AppText variant="heading" weight="800">Resumo da missão</AppText>
        <AppText variant="small" color={colors.textMuted}>{selected.summary}</AppText>

        <View style={styles.detailActions}>
          <Button label="Ver no roteiro da banca" onPress={() => setPresentationStep(2)} />
          <Button label="Voltar" variant="secondary" onPress={() => router.replace('/login')} />
        </View>
      </Card>

      <AppText variant="small" color={colors.textMuted} style={styles.note}>
        Este modo não usa conta real, banco ou Google. Ele só simula a jornada da missão para validar o fluxo visual e a navegação.
      </AppText>
    </Screen>
  );
}

function DemoJourneyEvidence({step,onOpenMission}:{step:number;onOpenMission:()=>void}){
  if(step===0)return <Card style={styles.evidenceCard}><AppText weight="800">Perfil fictício de Ana</AppText><View style={styles.pillRow}><Tag label="Prefere áudio" tone="purple"/><Tag label="Letras maiores" tone="purple"/><Tag label="Confiança 2/5" tone="yellow"/></View><AppText variant="small" color={colors.textMuted}>Objetivo: aprender Pix sem cair em golpes.</AppText></Card>;
  if(step===1)return <Card style={styles.evidenceCard}><AppText variant="caption" weight="800" color={colors.primary}>QUERO APRENDER ISTO</AppText><View style={styles.fakeInput}><AppText>Quero aprender a fazer um Pix com segurança</AppText></View><AppText variant="small" color={colors.textMuted}>Recomendamos esta prática porque Ana escolheu Pix e informou receio de golpes.</AppText></Card>;
  if(step===2)return <Card style={styles.evidenceCard}><View style={styles.presentationTitle}><Ionicons name="shield-checkmark-outline" size={28} color={colors.success}/><View style={styles.flex}><AppText weight="800">Simulação sem risco</AppText><AppText variant="small" color={colors.textMuted}>Componentes controlados, sem transferência ou ação externa.</AppText></View></View><Button label="Abrir missão dinâmica" onPress={onOpenMission}/></Card>;
  if(step===3)return <Card style={styles.evidenceCard}><AppText weight="800">História de evolução</AppText><View style={styles.metricGrid}><MetricCard icon="trending-up-outline" value="2 → 4" label="confiança" tone="blue"/><MetricCard icon="hand-left-outline" value="100%" label="autonomia" tone="green"/></View><AppText variant="small">Praticou em ambiente seguro e concluiu sem pedir ajuda.</AppText></Card>;
  return <Card style={styles.evidenceCard}><AppText weight="800">Impacto agregado da oficina</AppText><View style={styles.metricGrid}><MetricCard icon="people-outline" value="12" label="alunos"/><MetricCard icon="checkmark-done-outline" value="24" label="missões" tone="green"/></View><View style={styles.progressCopy}><AppText variant="small" weight="700">Autonomia da turma</AppText><AppText variant="small" weight="800" color={colors.primary}>78%</AppText></View><ProgressBar value={78}/><AppText variant="small" color={colors.textMuted}>Pedidos de ajuda: 8 antes → 4 depois.</AppText></Card>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  headerCard: { gap: spacing.sm },
  presentationCard: { backgroundColor: colors.primarySoft, borderColor: colors.primary, gap: spacing.md },
  dynamicCard: { borderColor: colors.primaryMuted, gap: spacing.md },
  readinessCard: { backgroundColor: colors.surface, borderColor: colors.primaryMuted, gap: spacing.md },
  checkList: { gap: spacing.sm },
  checkRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
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
  detailActions: { flexDirection: 'row', gap: spacing.md },
  note: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
