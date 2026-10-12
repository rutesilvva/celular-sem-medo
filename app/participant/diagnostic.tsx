import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ConfidencePicker } from '@/components/ConfidencePicker';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, ProgressBar } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useMissionCatalog } from '@/hooks/useMissionData';
import { clearDiagnosticDraft, readDiagnosticDraft, writeDiagnosticDraft } from '@/lib/diagnostic-draft';
import { loadDiagnosticResilient, saveDiagnosticResilient } from '@/lib/learning-path-cache';
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
  const { preferences, setPreference, showNotice } = useApp();
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
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const headingRef = useRef<View>(null);
  const valid = Boolean(currentUser && experienceLevel && preferredFormat && goals.length && goals.every((goal) => confidence[goal]) && barriers.length && scamResponse && independentActions.length && supportResponse);
  const stepValid = [Boolean(experienceLevel), Boolean(preferredFormat), independentActions.length > 0, barriers.length > 0, Boolean(scamResponse), Boolean(supportResponse), goals.length > 0 && goals.every((goal) => confidence[goal])][step] ?? valid;

  useEffect(() => {
    let active = true;
    if (!currentUser) return;
    void Promise.all([readDiagnosticDraft(currentUser.id), loadDiagnosticResilient(currentUser.id)]).then(([savedDraft, diagnostic]) => {
      if (!active) return;
      const draft = savedDraft ?? (diagnostic.draft ? { ...diagnostic.draft, step: 0 } : null);
      if (draft) {
        setStep(draft.step);
        setExperience(draft.experienceLevel ?? null);
        setFormat(draft.preferredFormat ?? null);
        setGoals(draft.goals ?? []);
        setConfidence(draft.categoryConfidence ?? {});
        setBarriers(draft.barriers ?? []);
        setScamResponse(draft.scamResponse ?? null);
        setIndependentActions(draft.independentActions ?? []);
        setSupportResponse(draft.supportResponse ?? null);
      }
      setHydrated(true);
    });
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!hydrated || !currentUser) return;
    const timer = setTimeout(() => void writeDiagnosticDraft(currentUser.id, {
      step, experienceLevel: experienceLevel ?? undefined, preferredFormat: preferredFormat ?? undefined,
      goals, categoryConfidence: confidence, barriers, scamResponse: scamResponse ?? undefined,
      independentActions, supportResponse: supportResponse ?? undefined,
    }), 150);
    return () => clearTimeout(timer);
  }, [barriers, confidence, currentUser, experienceLevel, goals, hydrated, independentActions, preferredFormat, scamResponse, step, supportResponse]);

  useEffect(() => {
    if (!hydrated) return;
    if (Platform.OS === 'web') {
      AccessibilityInfo.announceForAccessibility(step < 7 ? `Pergunta ${step + 1} de 7` : 'Confira suas respostas');
      return;
    }
    const target = findNodeHandle(headingRef.current);
    if (target) AccessibilityInfo.setAccessibilityFocus(target);
    else AccessibilityInfo.announceForAccessibility(step < 7 ? `Pergunta ${step + 1} de 7` : 'Confira suas respostas');
  }, [hydrated, step]);

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
    await clearDiagnosticDraft(currentUser.id);
    showNotice(synced ? 'Plano de aprendizagem criado' : 'Plano salvo no aparelho e será sincronizado depois');
    if (router.canDismiss()) router.dismissAll();
    router.replace('/participant/home');
  };

  const goBack = () => step > 0 ? setStep((current) => current - 1) : router.canGoBack() ? router.back() : router.replace('/participant/home');
  if (!hydrated) return <Screen contentStyle={styles.content}><Header title="Seu ponto de partida" subtitle="Carregando diagnóstico" onBack={goBack} /><Card><AppText accessibilityLiveRegion="polite">Recuperando suas respostas…</AppText></Card></Screen>;

  return <Screen key={step} contentStyle={styles.content}>
    <Header title="Seu ponto de partida" subtitle={step < 7 ? `Pergunta ${step + 1} de 7` : 'Confira suas respostas'} onBack={goBack} audio />
    <View accessibilityLabel={step < 7 ? `Progresso: pergunta ${step + 1} de 7` : 'Todas as perguntas respondidas'}>
      <ProgressBar value={step < 7 ? ((step + 1) / 7) * 100 : 100} height={12} />
    </View>
    <Card style={styles.intro}>
      <Ionicons name="compass-outline" size={32} color={colors.primary} />
      <View style={styles.flex}><AppText weight="800">Não é uma prova</AppText><AppText variant="small" color={colors.textMuted}>Cada resposta é salva neste aparelho. Você pode sair e continuar depois.</AppText></View>
    </Card>

    <View ref={headingRef} accessible accessibilityRole="header" accessibilityLabel={step < 7 ? `Pergunta ${step + 1} de 7` : 'Confira suas respostas'} style={styles.focusTarget} />
    <>
    {step === 0 ? <Question title="Como você se sente usando o celular?" single>
      {experiences.map((item) => <Choice key={item.value} selected={experienceLevel === item.value} label={item.label} icon={item.icon} single onPress={() => setExperience(item.value)} />)}
    </Question> : null}
    {step === 1 ? <Question title="Como você prefere aprender?" single>
      {formats.map((item) => <Choice key={item.value} selected={preferredFormat === item.value} label={item.label} icon={item.icon} single onPress={() => setFormat(item.value)} />)}
    </Question> : null}
    {step === 2 ? <Question title="O que você já consegue fazer sozinho?" helper="Escolha todas as ações que já realiza sem ajuda.">
      {actionOptions.map((item) => <Choice key={item.value} selected={independentActions.includes(item.value)} label={item.label} icon={item.icon} onPress={() => item.value === 'none' ? setIndependentActions(['none']) : toggleAction(item.value)} />)}
    </Question> : null}
    {step === 3 ? <Question title="O que mais dificulta quando você usa o celular?" helper="Você pode escolher mais de uma opção.">
      {barrierOptions.map((item) => <Choice key={item.value} selected={barriers.includes(item.value)} label={item.label} icon={item.icon} onPress={() => item.value === 'unsure' ? setBarriers(['unsure']) : toggleBarrier(item.value)} />)}
    </Question> : null}
    {step === 4 ? <Card style={styles.scenario}>
      <View style={styles.scenarioTitle}><Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.warning} /><AppText variant="subheading" weight="800" style={styles.flex}>Uma mensagem urgente diz ser de um familiar e pede dinheiro. O que você faria primeiro?</AppText></View>
      <AppText variant="small" color={colors.textMuted}>É apenas uma situação de aprendizagem, não uma prova.</AppText>
      <View accessibilityRole="radiogroup" style={styles.options}>{scamOptions.map((item) => <Choice key={item.value} selected={scamResponse === item.value} label={item.label} icon="radio-button-on-outline" single onPress={() => setScamResponse(item.value)} />)}</View>
    </Card> : null}
    {step === 5 ? <Question title="Quando surge uma dificuldade, o que você costuma fazer?" single>
      {supportOptions.map((item) => <Choice key={item.value} selected={supportResponse === item.value} label={item.label} icon={item.icon} single onPress={() => setSupportResponse(item.value)} />)}
    </Question> : null}
    {step === 6 ? <><Question title="O que você quer aprender primeiro?" helper="Escolha uma ou mais áreas.">
      {categories.map((category) => <Choice key={category} selected={goals.includes(category)} label={category} icon="checkmark-circle-outline" onPress={() => toggleGoal(category)} />)}
    </Question>
    {goals.map((goal) => <Card key={goal} style={styles.confidence}><ConfidencePicker label={`Hoje, quanta confiança você tem em ${goal}?`} value={confidence[goal] ?? null} onChange={(value) => setConfidence((current) => ({ ...current, [goal]: value }))} /></Card>)}</> : null}
    {step === 7 && valid && preferredFormat ? <Card style={styles.summary}>
      <View style={styles.scenarioTitle}><Ionicons name="sparkles-outline" size={26} color={colors.primary} /><AppText variant="subheading" weight="800" style={styles.flex}>Confira o que entendemos</AppText></View>
      <AppText>Você prefere aprender {formatSummary[preferredFormat]} e quer começar por {goals.join(', ')}.</AppText>
      <AppText variant="small" color={colors.textMuted}>Você já consegue: {independentActions.map((value) => actionOptions.find((item) => item.value === value)?.label.toLowerCase()).join(', ')}.</AppText>
      <AppText variant="small" color={colors.textMuted}>Seu plano dará atenção a: {barriers.map((value) => barrierSummary[value]).join(', ')}.</AppText>
      <AppText variant="small" weight="700" color={colors.primary}>Se algo não estiver certo, use o botão Voltar para corrigir antes de criar o plano.</AppText>
    </Card> : null}
    </>
    <View style={[styles.actions, preferences.largerText && styles.actionsStacked]}>
      {step > 0 ? <Button label="Voltar" variant="secondary" onPress={() => setStep((current) => current - 1)} style={styles.actionButton} /> : null}
      {step < 7 ? <Button label="Continuar" icon="arrow-forward" disabled={!stepValid} onPress={() => setStep((current) => current + 1)} style={styles.actionButton} /> : <Button label={saving ? 'Salvando…' : 'Confirmar e criar meu plano'} icon="sparkles-outline" disabled={!valid || saving} onPress={() => void save()} style={styles.actionButton} />}
    </View>
  </Screen>;
}

function Question({ title, helper, children, single = false }: { title: string; helper?: string; children: React.ReactNode; single?: boolean }) {
  return <View style={styles.question}><AppText variant="subheading" weight="800">{title}</AppText>{helper ? <AppText variant="small" color={colors.textMuted}>{helper}</AppText> : null}<View accessibilityRole={single ? 'radiogroup' : undefined} style={styles.options}>{children}</View></View>;
}

function Choice({ selected, label, icon, onPress, single = false }: { selected: boolean; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; single?: boolean }) {
  return <Pressable accessibilityRole={single ? 'radio' : 'checkbox'} accessibilityLabel={label} accessibilityState={{ checked: selected }} hitSlop={6} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Ionicons name={icon} size={22} color={selected ? colors.surface : colors.primary} /><AppText weight="700" color={selected ? colors.surface : colors.text} style={styles.flex}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl }, flex: { flex: 1 }, intro: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  question: { gap: spacing.sm }, options: { gap: spacing.sm },
  choice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.md, borderWidth: 2, flexDirection: 'row', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, confidence: { gap: spacing.md }, scenario: { backgroundColor: colors.warningSoft, gap: spacing.md }, scenarioTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, summary: { backgroundColor: colors.primarySoft, gap: spacing.md }, actions: { flexDirection: 'row', gap: spacing.md }, actionsStacked: { flexDirection: 'column' }, actionButton: { flex: 1 }, focusTarget: { height: 1 },
});
