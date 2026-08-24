import { StyleSheet } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme/tokens';

export default function AdminProfileScreen() {
  const { currentUser, signOut } = useApp();
  const displayName = currentUser?.name || 'Administrador';
  return (
    <Screen footer={<AdminNav active="profile" />}>
      <Header title="Perfil" subtitle="Administrador global" />
      <Card style={styles.card}>
        <UserAvatar name={displayName} avatarUrl={currentUser?.avatarUrl ?? null} />
        <AppText variant="heading" weight="800">{displayName}</AppText>
        <AppText color={colors.textMuted}>{currentUser?.email || 'E-mail não informado'}</AppText>
        <Tag label="Admin global ativo" tone="red" />
      </Card>
      <Card style={styles.card}>
        <AppText weight="800">Segurança da conta</AppText>
        <AppText variant="small" color={colors.textMuted}>Acesso concedido pelo servidor. Operações sensíveis exigem login recente e geram eventos de auditoria.</AppText>
      </Card>
      <Button label="Sair da conta" icon="log-out-outline" variant="secondary" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { alignItems: 'flex-start', gap: spacing.md } });
