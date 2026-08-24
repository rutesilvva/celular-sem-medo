import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, LogoMark } from '@/components/ui';
import { Role, useApp } from '@/context/AppContext';
import { GoogleAuthError, signInWithGoogle } from '@/lib/google-auth';
import { colors, radius, spacing } from '@/theme/tokens';

const errorMessages = {
  cancelled: 'Entrada cancelada. Você pode tentar novamente quando quiser.',
  access_denied: 'O acesso foi negado pela conta Google.',
  invalid_configuration: 'O login Google não está configurado para este ambiente.',
  no_access: 'Esta conta Google ainda não possui acesso ao aplicativo.',
  unexpected: 'Não foi possível concluir a entrada. Tente novamente.',
};

export default function LoginScreen() {
  const router = useRouter();
  const { sessionRole, signIn } = useApp();
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionRole === 'participant') router.replace('/participant/welcome');
    if (sessionRole === 'monitor') router.replace('/monitor/home');
    if (sessionRole === 'admin') router.replace('/admin/home');
  }, [router, sessionRole]);

  const enterWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const roles = await signInWithGoogle();
      if (roles.length === 1) signIn(roles[0]!);
      else setAvailableRoles(roles);
    } catch (authError) {
      const code = authError instanceof GoogleAuthError ? authError.code : 'unexpected';
      setError(errorMessages[code]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <LogoMark compact wordmark />
        <AppText variant="small" color={colors.textMuted} style={styles.center}>Segurança para aprender e praticar.</AppText>
      </View>
      <Card style={styles.form}>
        <View style={styles.heading}>
          <AppText variant="heading" weight="800" color={colors.primary} style={styles.center}>Entrar na sua conta</AppText>
          <AppText color={colors.textMuted} style={styles.center}>Participantes, monitores e administradores usam a mesma entrada.</AppText>
        </View>
        {availableRoles.length ? (
          <View style={styles.roleGroup}>
            <AppText weight="800" style={styles.center}>Como deseja continuar?</AppText>
            <AppText variant="small" color={colors.textMuted} style={styles.center}>Mostramos somente os acessos autorizados para sua conta.</AppText>
            {availableRoles.map((role) => <RoleCard key={role} role={role} onPress={() => signIn(role)} />)}
          </View>
        ) : (
          <Button label={loading ? 'Conectando ao Google…' : 'Continuar com Google'} onPress={enterWithGoogle} disabled={loading} icon="logo-google" />
        )}
        {error ? (
          <View accessibilityLiveRegion="polite" style={styles.error}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
            <AppText variant="small" color={colors.danger} style={styles.flex}>{error}</AppText>
          </View>
        ) : null}
        <View style={styles.security}>
          <Ionicons name="shield-checkmark-outline" size={23} color={colors.success} />
          <AppText variant="small" color={colors.textMuted} style={styles.flex}>O Google confirma sua identidade. Seu acesso é definido com segurança pelo servidor.</AppText>
        </View>
      </Card>
    </Screen>
  );
}

function RoleCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const labels = { participant: 'Participante', monitor: 'Monitor', admin: 'Administrador' };
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}>
      <AppText weight="800" style={styles.flex}>{labels[role]}</AppText>
      <Ionicons name="arrow-forward" size={22} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', minHeight: '100%', paddingTop: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  form: { gap: spacing.xl, padding: spacing.xl },
  heading: { gap: spacing.sm },
  roleGroup: { gap: spacing.md },
  roleCard: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', minHeight: 56, paddingHorizontal: spacing.lg },
  error: { alignItems: 'center', backgroundColor: colors.dangerSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  security: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  flex: { flex: 1 },
  pressed: { opacity: 0.65 },
});
