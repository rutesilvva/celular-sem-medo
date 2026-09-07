import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfidencePicker } from '@/components/ConfidencePicker';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { saveDiagnosticResilient } from '@/lib/learning-path-cache';
import type { LearningDiagnosticInput } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

const experiences = [
  { value: 'beginner', label: 'Estou começando', icon: 'leaf-outline' },
  { value: 'sometimes', label: 'Consigo às vezes', icon: 'walk-outline' },
  { value: 'independent', label: 'Já faço sozinho', icon: 'star-outline' },
] as const;
const formats = [
  { value: 'read', label: 'Ler', icon: 'reader-outline' },
  { value: 'listen', label: 'Ouvir', icon: 'volume-high-outline' },
  { value: 'practice', label: 'Praticar', icon: 'hand-left-outline' },
] as const;
const formatSummary = { read: 'lendo', listen: 'ouvindo', practice: 'praticando' } as const;
const fallbackCategories = ['Segurança digital', 'Comunicação', 'Serviços Públicos', 'Compras e pagamentos'];
const barrierOptions: { value: LearningDiagnosticInput['barriers'][number]; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'fear_wrong_tap', label: 'Tenho medo de tocar no lugar errado', icon: 'hand-left-outline' },
  { value: 'small_text', label: 'Tenho dificuldade para ler as letras', icon: 'text-outline' },
  { value: 'unclear_symbols', label: 'Não entendo alguns símbolos e botões', icon: 'help-circle-outline' },
  { value: 'forget_steps', label: 'Esqueço a ordem dos passos', icon: 'list-outline' },
  { value: 'scam_fear', label: 'Tenho receio de golpes', icon: 'shield-outline' },
  { value: 'prefer_audio', label: 'Prefiro receber ajuda em áudio', icon: 'volume-high-outline' },
  { value: 'unsure', label: 'Ainda não sei dizer', icon: 'ellipsis-horizontal-outline' },
];
const scamOptions: { value: LearningDiagnosticInput['scamResponse']; label: string }[] = [
  { value: 'send_money', label: 'Enviaria o dinheiro para ajudar rapidamente' },
  { value: 'verify_known_contact', label: 'Ligaria para o número antigo para confirmar' },
  { value: 'open_link', label: 'Abriria o link recebido na mensagem' },
  { value: 'ask_help', label: 'Pediria ajuda a alguém de confiança' },
  { value: 'unsure', label: 'Ainda não sei o que faria' },
];
const actionOptions: { value: LearningDiagnosticInput['independentActions'][number]; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'whatsapp', label: 'Conversar pelo WhatsApp', icon: 'chatbubbles-outline' },
  { value: 'install_apps', label: 'Baixar aplicativos', icon: 'download-outline' },
  { value: 'photos', label: 'Tirar e enviar fotos', icon: 'camera-outline' },
  { value: 'pix', label: 'Fazer um Pix', icon: 'cash-outline' },
  { value: 'gov_br', label: 'Usar o Gov.br', icon: 'document-text-outline' },
  { value: 'youtube', label: 'Assistir a vídeos no YouTube', icon: 'play-circle-outline' },
  { value: 'calls', label: 'Fazer chamadas', icon: 'call-outline' },
  { value: 'none', label: 'Ainda não faço essas ações sozinho', icon: 'heart-outline' },
];
const supportOptions: { value: LearningDiagnosticInput['supportResponse']; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'try_again', label: 'Tento novamente com calma', icon: 'refresh-outline' },
  { value: 'ask_help', label: 'Peço ajuda a alguém', icon: 'people-outline' },
  { value: 'give_up', label: 'Desisto naquele momento', icon: 'stop-circle-outline' },
  { value: 'avoid_task', label: 'Evito fazer essa tarefa', icon: 'arrow-back-circle-outline' },
  { value: 'unsure', label: 'Ainda não sei dizer', icon: 'ellipsis-horizontal-outline' },
];
const barrierSummary: Record<LearningDiagnosticInput['barriers'][number], string> = {
  fear_wrong_tap: 'mais segurança para tocar na tela', small_text: 'letras maiores', unclear_symbols: 'explicação de símbolos e botões',
  forget_steps: 'repetição dos passos', scam_fear: 'práticas contra golpes', prefer_audio: 'ajuda em áudio', unsure: 'apoio para descobrir suas dificuldades',
};

export default function ParticipantDiagnosticScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { setPreference, showNotice } = useApp();
  const catalog = useMissionCatalog();
  const categories = useMemo(() => {
    const available = Array.from(new Set((catalog.data ?? []).map((item) => item.category))).slice(0, 6);
    return available.length ? available : fallbackCategories;
  }, [catalog.data]);
  const [experienceLevel, setExperience] = useState<LearningDiagnosticInput['experienceLevel'] | null>(null);
  const [preferredFormat, setFormat] = useState<LearningDiagnosticInput['preferredFormat'] | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [barriers, setBarriers] = useState<LearningDiagnosticInput['barriers']>([]);
  const [scamResponse, setScamResponse] = useState<LearningDiagnosticInput['scamResponse'] | null>(null);
  const [independentActions, setIndependentActions] = useState<LearningDiagnosticInput['independentActions']>([]);
  const [supportResponse, setSupportResponse] = useState<LearningDiagnosticInput['supportResponse'] | null>(null);
  const [saving, setSaving] = useState(false);
  const valid = Boolean(currentUser && experienceLevel && preferredFormat && goals.length && goals.every((goal) => confidence[goal]) && barriers.length && scamResponse && independentActions.length && supportResponse);

  const toggleGoal = (goal: string) => setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]);
  const toggleBarrier = (barrier: LearningDiagnosticInput['barriers'][number]) => setBarriers((current) => current.includes(barrier) ? current.filter((item) => item !== barrier) : [...current.filter((item) => item !== 'unsure'), barrier]);
  const toggleAction = (action: LearningDiagnosticInput['independentActions'][number]) => setIndependentActions((current) => current.includes(action) ? current.filter((item) => item !== action) : [...current.filter((item) => item !== 'none'), action]);
  const save = async () => {
    if (!valid || saving || !currentUser || !experienceLevel || !preferredFormat || !scamResponse || !supportResponse) return;
    setSaving(true);
    if (barriers.includes('small_text')) setPreference('largerText', true);
    if (barriers.includes('prefer_audio')) setPreference('autoAudio', true);
    if (barriers.includes('forget_steps')) setPreference('repeatInstructions', true);
    const synced = await saveDiagnosticResilient(currentUser.id, { experienceLevel, preferredFormat, goals, categoryConfidence: confidence, barriers, scamResponse, independentActions, supportResponse });
    showNotice(synced ? 'Plano de aprendizagem criado' : 'Plano salvo no aparelho e será sincronizado depois');
    router.dismissAll();
    router.replace('/participant/home');
  };

  return <Screen contentStyle={styles.content}>
    <Header title="Seu ponto de partida" subtitle="Diagnóstico inicial" onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/home')} audio />
    <Card style={styles.intro}>
      <Ionicons name="compass-outline" size={32} color={colors.primary} />
      <View style={styles.flex}><AppText weight="800">Não é uma prova</AppText><AppText variant="small" color={colors.textMuted}>Suas respostas servem apenas para escolher práticas adequadas ao seu ritmo. Você poderá alterá-las.</AppText></View>
    </Card>

    <Question title="Como você se sente usando o celular?">
      {experiences.map((item) => <Choice key={item.value} selected={experienceLevel === item.value} label={item.label} icon={item.icon} onPress={() => setExperience(item.value)} />)}
    </Question>
    <Question title="Como você prefere aprender?">
      {formats.map((item) => <Choice key={item.value} selected={preferredFormat === item.value} label={item.label} icon={item.icon} onPress={() => setFormat(item.value)} />)}
    </Question>
    <Question title="O que você já consegue fazer sozinho?" helper="Escolha todas as ações que já realiza sem ajuda.">
      {actionOptions.map((item) => <Choice key={item.value} selected={independentActions.includes(item.value)} label={item.label} icon={item.icon} onPress={() => item.value === 'none' ? setIndependentActions(['none']) : toggleAction(item.value)} />)}
    </Question>
    <Question title="O que mais dificulta quando você usa o celular?" helper="Você pode escolher mais de uma opção.">
      {barrierOptions.map((item) => <Choice key={item.value} selected={barriers.includes(item.value)} label={item.label} icon={item.icon} onPress={() => item.value === 'unsure' ? setBarriers(['unsure']) : toggleBarrier(item.value)} />)}
    </Question>
    <Card style={styles.scenario}>
      <View style={styles.scenarioTitle}><Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.warning} /><AppText variant="subheading" weight="800" style={styles.flex}>Uma mensagem urgente diz ser de um familiar e pede dinheiro. O que você faria primeiro?</AppText></View>
      <AppText variant="small" color={colors.textMuted}>É apenas uma situação de aprendizagem, não uma prova.</AppText>
      <View style={styles.options}>{scamOptions.map((item) => <Choice key={item.value} selected={scamResponse === item.value} label={item.label} icon="radio-button-on-outline" onPress={() => setScamResponse(item.value)} />)}</View>
    </Card>
    <Question title="Quando surge uma dificuldade, o que você costuma fazer?">
      {supportOptions.map((item) => <Choice key={item.value} selected={supportResponse === item.value} label={item.label} icon={item.icon} onPress={() => setSupportResponse(item.value)} />)}
    </Question>
    <Question title="O que você quer aprender primeiro?" helper="Escolha uma ou mais áreas.">
      {categories.map((category) => <Choice key={category} selected={goals.includes(category)} label={category} icon="checkmark-circle-outline" onPress={() => toggleGoal(category)} />)}
    </Question>
    {goals.map((goal) => <Card key={goal} style={styles.confidence}><ConfidencePicker label={`Hoje, quanta confiança você tem em ${goal}?`} value={confidence[goal] ?? null} onChange={(value) => setConfidence((current) => ({ ...current, [goal]: value }))} /></Card>)}
    {valid && preferredFormat ? <Card style={styles.summary}>
      <View style={styles.scenarioTitle}><Ionicons name="sparkles-outline" size={26} color={colors.primary} /><AppText variant="subheading" weight="800" style={styles.flex}>Confira o que entendemos</AppText></View>
      <AppText>Você prefere aprender {formatSummary[preferredFormat]} e quer começar por {goals.join(', ')}.</AppText>
      <AppText variant="small" color={colors.textMuted}>Você já consegue: {independentActions.map((value) => actionOptions.find((item) => item.value === value)?.label.toLowerCase()).join(', ')}.</AppText>
      <AppText variant="small" color={colors.textMuted}>Seu plano dará atenção a: {barriers.map((value) => barrierSummary[value]).join(', ')}.</AppText>
      <AppText variant="small" weight="700" color={colors.primary}>Se algo não estiver certo, toque nas respostas acima para corrigir antes de criar o plano.</AppText>
    </Card> : null}
    <Button label={saving ? 'Salvando…' : 'Criar meu plano'} icon="sparkles-outline" disabled={!valid || saving} onPress={() => void save()} />
  </Screen>;
}

function Question({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return <View style={styles.question}><AppText variant="subheading" weight="800">{title}</AppText>{helper ? <AppText variant="small" color={colors.textMuted}>{helper}</AppText> : null}<View style={styles.options}>{children}</View></View>;
}

function Choice({ selected, label, icon, onPress }: { selected: boolean; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Ionicons name={icon} size={22} color={selected ? colors.surface : colors.primary} /><AppText weight="700" color={selected ? colors.surface : colors.text} style={styles.flex}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl }, flex: { flex: 1 }, intro: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  question: { gap: spacing.sm }, options: { gap: spacing.sm },
  choice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.md, borderWidth: 2, flexDirection: 'row', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, confidence: { gap: spacing.md }, scenario: { backgroundColor: colors.warningSoft, gap: spacing.md }, scenarioTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, summary: { backgroundColor: colors.primarySoft, gap: spacing.md },
});
