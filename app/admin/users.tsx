import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAdminClasses, useAdminUsers } from '@/hooks/useAdminManagement';
import { addStudentToClass, removeStudentFromClass, setAdministrator, type AdminUser } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AdminUsersScreen() {
  const users = useAdminUsers(); const classes = useAdminClasses(); const { currentUser } = useAuth();
  if (users.loading || classes.loading) return <Screen footer={<AdminNav active="users" />}><Header title="Pessoas e acessos" /><DataState kind="loading" title="Carregando pessoas" message="Consultando os vínculos reais." /></Screen>;
  if (users.error || classes.error) return <Screen footer={<AdminNav active="users" />}><Header title="Pessoas e acessos" /><DataState kind="error" title="Não foi possível carregar" message="Tente novamente." onRetry={() => { users.retry(); classes.retry(); }} /></Screen>;
  const retry = () => { users.retry(); classes.retry(); };
  return <Screen footer={<AdminNav active="users" />} contentStyle={styles.content}>
    <Header title="Pessoas e acessos" subtitle={`${users.data.length} contas reais`} />
    <Card style={styles.notice}><Ionicons name="shield-checkmark-outline" size={25} color={colors.blue} /><AppText variant="small" color={colors.textMuted} style={styles.copy}>O servidor protege a sessão atual e impede remover o último administrador global.</AppText></Card>
    {users.data.map((user) => <UserCard key={user.user_id} user={user} current={user.user_id === currentUser?.id} classes={classes.data.filter((item) => item.class_status === 'active')} retry={retry} />)}
  </Screen>;
}

function UserCard({ user, current, classes, retry }: { user: AdminUser; current: boolean; classes: ReturnType<typeof useAdminClasses>['data']; retry: () => void }) {
  const run = async (action: () => Promise<unknown>) => { try { await action(); retry(); } catch (error) { Alert.alert('Ação não concluída', error instanceof Error ? error.message : 'Tente novamente.'); } };
  return <Card style={styles.userCard}><View style={styles.avatar}><AppText weight="800" color={colors.primary}>{initials(user.display_name)}</AppText></View><View style={styles.copy}><View style={styles.titleRow}><AppText weight="800" style={styles.copy}>{user.display_name}{current ? ' (você)' : ''}</AppText><Tag label={user.is_administrator ? 'Admin global' : 'Aluno'} tone={user.is_administrator ? 'red' : 'purple'} /></View><AppText variant="small" color={colors.textMuted}>{user.email}</AppText><AppText variant="caption" color={colors.textMuted}>Status: {user.account_status} · {user.active_class_count} turma(s)</AppText>
    {!current ? <Button label={user.is_administrator ? 'Remover administrador' : 'Conceder administrador'} variant="secondary" onPress={() => void run(() => setAdministrator(user.user_id, !user.is_administrator))} /> : null}
    {!user.is_administrator ? <View style={styles.classes}><AppText variant="small" weight="800">Vínculos de aluno</AppText>{classes.map((item) => <View key={item.class_id} style={styles.classRow}><AppText variant="small" style={styles.copy}>{item.class_name}</AppText><Button label="Adicionar" variant="soft" onPress={() => void run(() => addStudentToClass(item.class_id, user.user_id))} /><Button label="Remover" variant="secondary" onPress={() => void run(() => removeStudentFromClass(item.class_id, user.user_id))} /></View>)}</View> : null}
  </View></Card>;
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'; }
const styles = StyleSheet.create({ content: { gap: spacing.lg }, notice: { alignItems: 'center', backgroundColor: colors.blueSoft, flexDirection: 'row', gap: spacing.md }, userCard: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md }, avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, gap: spacing.sm }, titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, classes: { gap: spacing.sm, paddingTop: spacing.sm }, classRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs } });
