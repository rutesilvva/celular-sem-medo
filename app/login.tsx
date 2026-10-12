import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, LogoMark } from '@/components/ui';
import type { Role } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { GoogleAuthError, GoogleAuthErrorCode, signInWithGoogle } from '@/lib/google-auth';
import { isDemoModeEnabled } from '@/lib/demo-mode';
import { colors, radius, spacing } from '@/theme/tokens';

const errorMessages: Record<GoogleAuthErrorCode, string> = {
  cancelled: 'Entrada cancelada. Você pode tentar novamente quando quiser.',
  access_denied: 'O acesso foi negado pela conta Google. Você pode tentar novamente.',
  invalid_configuration: 'O login Google não está configurado para este ambiente.',
  not_provisioned: 'Esta conta Google ainda não está cadastrada no aplicativo.',
  account_blocked: 'Esta conta está bloqueada. Fale com a administração.',
  offline: 'Você parece estar sem internet. Verifique a conexão e tente novamente.',
  temporary_failure: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
};

export default function LoginScreen() {
  const router = useRouter();
  const {
    acceptAuthenticatedAccount,
    errorCode: sessionErrorCode,
    availableRoles,
    currentUser,
    participantOnboardingCompleted,
    selectSessionRole,
    sessionRole,
    status,
    retrySessionRestore,
  } = useAuth();
  const authReady = status === 'anonymous' || status === 'authenticated';
  const [loading, setLoading] = useState(false);
  const [loginErrorCode, setLoginErrorCode] = useState<GoogleAuthErrorCode | null>(null);
  const errorCode = loginErrorCode ?? sessionErrorCode;
  const authLock = useRef(false);

  useEffect(() => {
    if (sessionRole === 'participant') {
      router.replace(participantOnboardingCompleted ? '/participant/home' : '/participant/welcome');
    }
    if (sessionRole === 'admin') router.replace('/admin/home');
  }, [participantOnboardingCompleted, router, sessionRole]);

  const enterWithGoogle = async () => {
    if (authLock.current || !authReady) return;
    authLock.current = true;
    setLoading(true);
    setLoginErrorCode(null);
    try {
      const account = await signInWithGoogle();
      if (account) acceptAuthenticatedAccount(account);
    } catch (authError) {
      setLoginErrorCode(authError instanceof GoogleAuthError ? authError.code : 'temporary_failure');
    } finally {
      authLock.current = false;
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brand}>
        <LogoMark compact wordmark />
        <AppText variant="small" color={colors.textMuted} style={styles.center}>Aprenda com segurança e autonomia</AppText>
      </View>
      <Card style={styles.form}>
        <View style={styles.heading}>
          <AppText variant="heading" weight="800" color={colors.primary} style={styles.center}>Entrar na sua conta</AppText>
          <AppText color={colors.textMuted} style={styles.center}>Informe seus dados para continuar.</AppText>
        </View>
        {availableRoles.length > 1 && currentUser ? (
          <View style={styles.roleGroup}>
            <UserIdentity />
            <AppText weight="800" style={styles.center}>Como deseja continuar?</AppText>
            <AppText variant="small" color={colors.textMuted} style={styles.center}>Mostramos somente os acessos autorizados pelo servidor.</AppText>
            {availableRoles.map((role) => (
              <RoleCard key={role} role={role} onPress={() => selectSessionRole(role)} />
            ))}
          </View>
        ) : (
          <Button
            label={!authReady ? 'Verificando sessão…' : loading ? 'Conectando ao Google…' : 'Continuar com Google'}
            onPress={enterWithGoogle}
            disabled={loading || !authReady}
            icon="logo-google"
            accessibilityHint="Abre a seleção segura de conta do Google"
          />
        )}
        {isDemoModeEnabled() ? <View style={styles.demoAccess}><View style={styles.demoHeading}><Ionicons name="cloud-offline-outline" size={22} color={colors.primary} /><View style={styles.flex}><AppText weight="800">Apresentação sem internet</AppText><AppText variant="small" color={colors.textMuted}>Usa somente dados fictícios e não cria uma conta ou sessão real.</AppText></View></View><Button label="Ver demonstração offline" icon="play-outline" variant="soft" onPress={() => router.push('/demo')} /></View> : null}
        {errorCode ? (
          <View accessibilityLiveRegion="polite" style={styles.error}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
            <View style={styles.flex}>
              <AppText variant="small" color={colors.danger}>{errorMessages[errorCode]}</AppText>
              <Pressable
                accessibilityRole="button"
                onPress={sessionErrorCode && !loginErrorCode ? retrySessionRestore : enterWithGoogle}
                disabled={loading}
                style={styles.retry}
              >
                <AppText variant="small" weight="800" color={colors.primary}>Tentar novamente</AppText>
              </Pressable>
            </View>
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

function UserIdentity() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const initials = getInitials(currentUser.name);
  return (
    <View style={styles.identity}>
      {currentUser.avatarUrl ? (
        <Image
          source={{ uri: currentUser.avatarUrl }}
          accessibilityLabel={`Foto de perfil de ${currentUser.name}`}
          style={styles.avatar}
        />
      ) : (
        <View accessibilityLabel={`Foto indisponível. Iniciais de ${currentUser.name}: ${initials}`} style={styles.avatarFallback}>
          <AppText weight="800" color={colors.primary}>{initials}</AppText>
        </View>
      )}
      <View style={styles.flex}>
        <AppText weight="800">{currentUser.name}</AppText>
        <AppText variant="small" color={colors.textMuted}>{currentUser.email || 'E-mail não informado'}</AppText>
      </View>
    </View>
  );
}

function RoleCard({ role, onPress }: { role: Role; onPress: () => void }) {
  const labels: Record<Role, string> = { participant: 'Aluno', admin: 'Administrador' };
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}>
      <AppText weight="800" style={styles.flex}>{labels[role]}</AppText>
      <Ionicons name="arrow-forward" size={22} color={colors.primary} />
    </Pressable>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('pt-BR') || '?';
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', minHeight: '100%', paddingTop: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  form: { backgroundColor: '#FFFDFB', borderColor: colors.primaryMuted, gap: spacing.xl, padding: spacing.xl },
  heading: { gap: spacing.sm },
  roleGroup: { gap: spacing.md },
  roleCard: { alignItems: 'center', backgroundColor: '#F9F5FF', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', minHeight: 56, paddingHorizontal: spacing.lg },
  error: { alignItems: 'flex-start', backgroundColor: colors.dangerSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  retry: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  security: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  demoAccess: { backgroundColor: colors.primarySoft, borderRadius: radius.md, gap: spacing.md, padding: spacing.md },
  demoHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: { borderRadius: radius.round, height: 52, width: 52 },
  avatarFallback: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  flex: { flex: 1 },
  pressed: { opacity: 0.65 },
});
