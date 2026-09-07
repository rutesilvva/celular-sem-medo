import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useRetentionChecks } from '@/hooks/useProgressData';
import { answerMyRetentionCheck } from '@/lib/backend';
import { colors, spacing } from '@/theme/tokens';

export default function RetentionScreen() {
  const router = useRouter();
  const query = useRetentionChecks();
  const [busy, setBusy] = useState<string | null>(null);
  const due = query.data.filter((item) => item.is_due && item.answered_correctly === null);
  const answer = async (id: string, correct: boolean) => { setBusy(id); try { await answerMyRetentionCheck(id, correct); query.retry(); } finally { setBusy(null); } };
  return <Screen footer={<ParticipantNav active="progress" />} contentStyle={styles.content}>
    <Header title="Revisar para não esquecer" subtitle="Validação prática de aprendizagem" onBack={() => router.back()} audio />
    <Card style={styles.intro}><Ionicons name="refresh-circle-outline" size={34} color={colors.primary} /><View style={styles.copy}><AppText weight="800">Uma lembrança curta, sem pressão</AppText><AppText variant="small" color={colors.textMuted}>Essas perguntas aparecem alguns dias depois da prática para verificar retenção.</AppText></View></Card>
    {query.loading ? <DataState kind="loading" title="Buscando revisões" message="Preparando suas perguntas." /> : query.error ? <DataState kind="error" title="Revisões indisponíveis" message="Tente novamente." onRetry={query.retry} /> : !due.length ? <DataState kind="empty" title="Tudo revisado por enquanto" message="Voltaremos a lembrar você no momento adequado." /> : due.map((item) => <Card key={item.check_id} style={styles.card}>
      <View style={styles.row}><Tag label="Revisão de 3 dias" tone="blue" /><AppText variant="small" color={colors.textMuted}>{item.title}</AppText></View>
      <AppText variant="subheading" weight="800">{item.question}</AppText>
      <AppText variant="small" color={colors.textMuted}>Você conseguiu lembrar como faria?</AppText>
      <Button label="Sim, lembrei com segurança" disabled={busy === item.check_id} onPress={() => void answer(item.check_id, true)} />
      <Button label="Ainda preciso praticar" variant="secondary" disabled={busy === item.check_id} onPress={() => void answer(item.check_id, false).then(() => router.push({ pathname: '/participant/mission-details', params: { assignmentId: item.assignment_id } }))} />
    </Card>)}
  </Screen>;
}
const styles=StyleSheet.create({content:{gap:spacing.lg},intro:{alignItems:'center',flexDirection:'row',gap:spacing.md},copy:{flex:1,gap:spacing.xs},card:{gap:spacing.md},row:{alignItems:'center',flexDirection:'row',flexWrap:'wrap',gap:spacing.sm}});
