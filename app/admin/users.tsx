import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { ManagedUser, ManagedUserRole } from '@/data/admin';
import { colors, radius, spacing } from '@/theme/tokens';

const roleLabels: Record<ManagedUserRole, string> = { participant: 'Participante', monitor: 'Monitor', admin: 'Admin global' };

export default function AdminUsersScreen() {
  const { managedUsers, removeManagedUser, showNotice } = useApp();

  const confirmRemoval = (user: ManagedUser) => {
    if (user.currentUser) {
      showNotice('Você não pode remover o próprio acesso nesta sessão.');
      return;
    }
    Alert.alert(
      `Remover acesso de ${user.name}?`,
      user.role === 'admin'
        ? 'Este administrador perderá o acesso global. O último admin ativo nunca pode ser removido.'
        : `O vínculo de ${roleLabels[user.role].toLowerCase()} será revogado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover acesso', style: 'destructive', onPress: () => showNotice(removeManagedUser(user.id) ? 'Acesso removido e ação registrada.' : 'Não foi possível remover este acesso.') },
      ],
    );
  };

  return (
    <Screen footer={<AdminNav active="users" />}>
      <Header title="Pessoas e acessos" subtitle={`${managedUsers.length} contas no ambiente`} />
      <Card style={styles.notice}>
        <Ionicons name="information-circle-outline" size={25} color={colors.blue} />
        <AppText variant="small" color={colors.textMuted} style={styles.copy}>Pode haver vários administradores globais. A aplicação sempre preserva pelo menos um admin ativo.</AppText>
      </Card>
      {managedUsers.map((user) => (
        <Card key={user.id} style={styles.userCard}>
          <View style={styles.avatar}><AppText weight="800" color={colors.primary}>{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</AppText></View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <AppText weight="800" style={styles.copy}>{user.name}{user.currentUser ? ' (você)' : ''}</AppText>
              <Tag label={roleLabels[user.role]} tone={user.role === 'admin' ? 'red' : user.role === 'monitor' ? 'yellow' : 'purple'} />
            </View>
            <AppText variant="small" color={colors.textMuted}>{user.email}</AppText>
            <AppText variant="caption" color={colors.textMuted}>{user.scope}</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover acesso de ${user.name}`}
              disabled={user.currentUser}
              onPress={() => confirmRemoval(user)}
              style={({ pressed }) => [styles.remove, user.currentUser && styles.disabled, pressed && styles.pressed]}
            >
              <Ionicons name="person-remove-outline" size={20} color={user.currentUser ? colors.textMuted : colors.danger} />
              <AppText variant="small" weight="800" color={user.currentUser ? colors.textMuted : colors.danger}>{user.currentUser ? 'Sessão atual protegida' : 'Remover acesso'}</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: colors.blueSoft, flexDirection: 'row', gap: spacing.md },
  userCard: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 48, justifyContent: 'center', width: 48 },
  copy: { flex: 1, gap: spacing.xs },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  remove: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: spacing.sm, minHeight: 44, paddingTop: spacing.sm },
  disabled: { opacity: 0.65 },
  pressed: { opacity: 0.6 },
});
