import { StyleSheet } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, spacing } from '@/theme/tokens';

export default function AdminProfileScreen() {
  const { signOut } = useApp();
  return (
    <Screen footer={<AdminNav active="profile" />}>
      <Header title="Perfil" subtitle="Administrador global" />
      <Card style={styles.card}>
        <AppText variant="heading" weight="800">Patrícia Souza</AppText>
        <AppText color={colors.textMuted}>patricia@exemplo.com</AppText>
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
