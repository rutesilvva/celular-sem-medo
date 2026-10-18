import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { publicDemoMissions, type PublicDemoMission } from '@/features/public-demo/catalog';
import { colors, radius, spacing } from '@/theme/tokens';

type Answer = { label: string; mission: PublicDemoMission['key']; icon: React.ComponentProps<typeof Ionicons>['name'] };

const questions: { title: string; helper: string; answers: Answer[] }[] = [
  {
    title: 'O que você mais quer aprender agora?',
    helper: 'Escolha uma situação. Não existe resposta errada.',
    answers: [
      { label: 'Usar Pix e conferir antes de enviar', mission: 'pix', icon: 'cash-outline' },
      { label: 'Reconhecer mensagens e ligações de golpe', mission: 'scam-message', icon: 'shield-checkmark-outline' },
      { label: 'Usar serviços e aplicativos do dia a dia', mission: 'gov-br', icon: 'phone-portrait-outline' },
      { label: 'Comprar com mais segurança pela internet', mission: 'shopping', icon: 'cart-outline' },
    ],
  },
  {
    title: 'Qual situação causa mais insegurança?',
    helper: 'A resposta ajuda a escolher um treino prático para você.',
    answers: [
      { label: 'Uma pessoa se passar por familiar', mission: 'fake-family', icon: 'people-outline' },
      { label: 'Alguém ligar dizendo que é do banco', mission: 'fake-bank', icon: 'call-outline' },
      { label: 'Instalar um aplicativo que não conheço', mission: 'download-app', icon: 'download-outline' },
      { label: 'Compartilhar minha localização', mission: 'location', icon: 'location-outline' },
    ],
  },
  {
    title: 'O que você gostaria de praticar sozinho?',
    helper: 'Você fará tudo em um ambiente seguro, sem usar dados reais.',
    answers: [
      { label: 'Enviar uma foto numa conversa', mission: 'photo', icon: 'camera-outline' },
      { label: 'Pedir um carro por aplicativo', mission: 'mobility', icon: 'car-outline' },
      { label: 'Criar e proteger uma conta Gov.br', mission: 'gov-br', icon: 'document-text-outline' },
      { label: 'Fazer e revisar um Pix', mission: 'pix', icon: 'swap-horizontal-outline' },
    ],
  },
];

export default function PublicDiagnosticScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<PublicDemoMission['key'][]>([]);
  const finished = step === questions.length;
  const question = questions[step];
  const selected = answers[step];
  const recommendedKey = useMemo(() => {
    const counts = answers.reduce<Partial<Record<PublicDemoMission['key'], number>>>((result, key) => ({ ...result, [key]: (result[key] ?? 0) + 1 }), {});
    return answers.reduce((best, key) => (counts[key] ?? 0) > (counts[best] ?? 0) ? key : best, answers[0] ?? 'pix');
  }, [answers]);
  const recommended = publicDemoMissions.find((mission) => mission.key === recommendedKey) ?? publicDemoMissions[0]!;
  const choose = (mission: PublicDemoMission['key']) => setAnswers((current) => [...current.slice(0, step), mission]);
  const back = () => step > 0 ? setStep((value) => value - 1) : router.back();

  return <Screen contentStyle={styles.content}>
    <Header title="Descubra por onde começar" subtitle={finished ? 'Sua recomendação está pronta' : `Pergunta ${step + 1} de ${questions.length}`} onBack={back} />
    <Card style={styles.safe}><Ionicons name="shield-checkmark-outline" size={28} color={colors.success} /><View style={styles.flex}><AppText weight="800">É só uma orientação</AppText><AppText variant="small" color={colors.textMuted}>Não é prova, não exige conta e nenhuma resposta é enviada ao servidor.</AppText></View></Card>
    <ProgressBar value={finished ? 100 : ((step + 1) / questions.length) * 100} />
    {!finished && question ? <>
      <Card style={styles.question}><View style={styles.titleRow}><View style={styles.number}><AppText weight="800" color={colors.surface}>{step + 1}</AppText></View><View style={styles.flex}><AppText variant="subheading" weight="800">{question.title}</AppText><AppText variant="small" color={colors.textMuted}>{question.helper}</AppText></View><AudioButton compact label="Ouvir pergunta" message={`${question.title}. ${question.helper}`} /></View></Card>
      <View accessibilityRole="radiogroup" style={styles.options}>{question.answers.map((answer) => <Pressable key={answer.label} accessibilityRole="radio" accessibilityState={{ checked: selected === answer.mission }} onPress={() => choose(answer.mission)} style={[styles.option, selected === answer.mission && styles.optionSelected]}><Ionicons name={answer.icon} size={27} color={colors.primary} /><AppText weight="800" style={styles.flex}>{answer.label}</AppText><Ionicons name={selected === answer.mission ? 'checkmark-circle' : 'chevron-forward'} size={26} color={selected === answer.mission ? colors.success : colors.primary} /></Pressable>)}</View>
      <Button label="Continuar" icon="arrow-forward" disabled={!selected} onPress={() => setStep((value) => value + 1)} />
    </> : <Card style={styles.result}><Tag label="RECOMENDADA PARA VOCÊ" tone="green" /><View style={styles.resultIcon}><Ionicons name={recommended.icon} size={38} color={colors.primary} /></View><AppText variant="heading" weight="800">{recommended.details.title}</AppText><AppText>{recommended.details.summary}</AppText><AppText variant="small" color={colors.textMuted}>Você verá instruções passo a passo, poderá ouvir quando quiser e tentar novamente se errar.</AppText><Button label="Começar esta missão" icon="arrow-forward" onPress={() => router.replace({ pathname: '/demo-mission-details', params: { mission: recommended.key } })} /><Button label="Ver todas as missões" variant="secondary" onPress={() => router.replace({ pathname: '/demo-app', params: { section: 'missions' } })} /></Card>}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg }, flex: { flex: 1 }, safe: { alignItems: 'flex-start', backgroundColor: colors.successSoft, borderColor: colors.success, flexDirection: 'row', gap: spacing.md },
  question: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted }, titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, number: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 999, height: 46, justifyContent: 'center', width: 46 },
  options: { gap: spacing.md }, option: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 2, flexDirection: 'row', gap: spacing.md, minHeight: 76, padding: spacing.md }, optionSelected: { borderColor: colors.success, backgroundColor: colors.successSoft },
  result: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, gap: spacing.md }, resultIcon: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 999, height: 76, justifyContent: 'center', width: 76 },
});
