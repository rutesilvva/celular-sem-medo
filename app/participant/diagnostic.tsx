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
const fallbackCategories = ['Segurança digital', 'Comunicação', 'Serviços públicos', 'Compras e pagamentos'];

export default function ParticipantDiagnosticScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { showNotice } = useApp();
  const catalog = useMissionCatalog();
  const categories = useMemo(() => {
    const available = Array.from(new Set((catalog.data ?? []).map((item) => item.category))).slice(0, 6);
    return available.length ? available : fallbackCategories;
  }, [catalog.data]);
  const [experienceLevel, setExperience] = useState<LearningDiagnosticInput['experienceLevel'] | null>(null);
  const [preferredFormat, setFormat] = useState<LearningDiagnosticInput['preferredFormat'] | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const valid = Boolean(currentUser && experienceLevel && preferredFormat && goals.length && goals.every((goal) => confidence[goal]));

  const toggleGoal = (goal: string) => setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]);
  const save = async () => {
    if (!valid || saving || !currentUser || !experienceLevel || !preferredFormat) return;
    setSaving(true);
    const synced = await saveDiagnosticResilient(currentUser.id, { experienceLevel, preferredFormat, goals, categoryConfidence: confidence });
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
    <Question title="O que você quer aprender primeiro?" helper="Escolha uma ou mais áreas.">
      {categories.map((category) => <Choice key={category} selected={goals.includes(category)} label={category} icon="checkmark-circle-outline" onPress={() => toggleGoal(category)} />)}
    </Question>
    {goals.map((goal) => <Card key={goal} style={styles.confidence}><ConfidencePicker label={`Hoje, quanta confiança você tem em ${goal}?`} value={confidence[goal] ?? null} onChange={(value) => setConfidence((current) => ({ ...current, [goal]: value }))} /></Card>)}
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
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, confidence: { gap: spacing.md },
});
