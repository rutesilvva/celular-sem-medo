import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, MetricCard, SectionTitle, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { managedClasses } from '@/data/admin';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { managedUsers } = useApp();
  const { currentUser } = useAuth();
  const firstName = currentUser?.name.split(/\s+/)[0] || 'Administrador';
  const count = (role: 'participant' | 'admin') => managedUsers.filter((user) => user.role === role).length;
  const activityFeed = [
    { title: 'Pedido de ajuda pendente', meta: '3 alunos aguardando resposta', tone: 'yellow' as const },
    { title: 'Turma Conectados ativa', meta: '89% de conclusão geral', tone: 'green' as const },
    { title: 'Nova inscrição confirmada', meta: '1 participante entrou nesta semana', tone: 'purple' as const },
  ];

  return (
    <Screen footer={<AdminNav active="home" />}>
      <Header title="Administração" subtitle="Acesso global ao aplicativo" />
      <View style={styles.welcome}>
        <View style={styles.icon}><Ionicons name="shield-checkmark" size={28} color={colors.primary} /></View>
        <View style={styles.copy}>
          <AppText variant="heading" weight="800">Olá, {firstName}!</AppText>
          <AppText color={colors.textMuted}>Acompanhe o uso, os alunos e os pedidos de apoio.</AppText>
        </View>
      </View>
      <View style={styles.grid}>
        <MetricCard icon="person-outline" value={`${count('participant')}`} label="participantes" tone="purple" />
        <MetricCard icon="school-outline" value={`${managedClasses.length}`} label="turmas ativas" tone="green" />
      </View>
      <View style={styles.grid}>
        <MetricCard icon="shield-outline" value={`${count('admin')}`} label="admins globais" tone="yellow" />
        <MetricCard icon="bar-chart-outline" value="Visão" label="acompanhamento geral" tone="blue" />
      </View>
      <SectionTitle>Ações rápidas</SectionTitle>
      <Card style={styles.actions}>
        <Action icon="people-outline" label="Gerenciar pessoas" onPress={() => router.push('/admin/users')} />
        <Action icon="school-outline" label="Gerenciar turmas" onPress={() => router.push('/admin/classes')} />
        <Action icon="people-outline" label="Acompanhar alunos" onPress={() => router.push('/admin/participants')} />
        <Action icon="people-outline" label="Pedidos de ajuda" onPress={() => router.push('/admin/help-requests')} />
      </Card>
      <SectionTitle>Atividade recente</SectionTitle>
      <Card style={styles.activityCard}>
        {activityFeed.map((item) => (
          <View key={item.title} style={styles.activityRow}>
            <View style={[styles.activityDot, { backgroundColor: item.tone === 'yellow' ? colors.warning : item.tone === 'green' ? colors.success : colors.primary }]} />
            <View style={styles.copy}>
              <AppText weight="700">{item.title}</AppText>
              <AppText variant="small" color={colors.textMuted}>{item.meta}</AppText>
            </View>
          </View>
        ))}
      </Card>
      <Card style={styles.security}>
        <Ionicons name="lock-closed-outline" size={25} color={colors.primary} />
        <View style={styles.copy}>
          <AppText weight="800">Ações protegidas</AppText>
          <AppText variant="small" color={colors.textMuted}>Alterações administrativas exigem autenticação recente e ficam registradas para auditoria.</AppText>
        </View>
        <Tag label="Auditável" tone="purple" />
      </Card>
    </Screen>
  );
}

function Action({ icon, label, onPress }: { icon: 'people-outline' | 'school-outline'; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <AppText weight="700" style={styles.copy}>{label}</AppText>
      <Ionicons name="chevron-forward" size={22} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  welcome: { alignItems: 'center', backgroundColor: '#F9F4FF', borderColor: colors.primaryMuted, borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 56, justifyContent: 'center', width: 56 },
  copy: { flex: 1, gap: spacing.xs },
  grid: { flexDirection: 'row', gap: spacing.md },
  actions: { gap: spacing.sm },
  action: { alignItems: 'center', backgroundColor: '#FFFDFB', borderBottomColor: colors.border, borderBottomWidth: 1, borderRadius: radius.md, flexDirection: 'row', gap: spacing.md, minHeight: 58, paddingHorizontal: spacing.sm },
  activityCard: { gap: spacing.md, padding: spacing.md },
  activityRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  activityDot: { borderRadius: radius.round, height: 12, width: 12 },
  security: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderRadius: radius.xl, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  pressed: { opacity: 0.65 },
});
