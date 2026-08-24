import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { exchangeGoogleCode, GoogleAuthError, GoogleAuthErrorCode } from '@/lib/google-auth';
import { colors, spacing } from '@/theme/tokens';

const callbackErrors: Record<GoogleAuthErrorCode, string> = {
  cancelled: 'Entrada cancelada.',
  access_denied: 'O acesso foi negado pela conta Google.',
  invalid_configuration: 'O login Google não está configurado corretamente.',
  not_provisioned: 'Esta conta Google ainda não está cadastrada no aplicativo.',
  account_blocked: 'Esta conta está bloqueada. Fale com a administração.',
  offline: 'Você parece estar sem internet. Verifique a conexão e tente novamente.',
  temporary_failure: 'Não foi possível concluir a entrada. Tente novamente.',
};

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { acceptAuthenticatedAccount } = useApp();
  const started = useRef(false);
  const [errorCode, setErrorCode] = useState<GoogleAuthErrorCode | null>(null);
  const parameterError = params.error || !params.code
    ? params.error === 'access_denied' ? 'O acesso foi negado pela conta Google.' : 'Callback de autenticação inválido.'
    : null;

  useEffect(() => {
    if (started.current || !params.code || params.error) return;
    started.current = true;
    void exchangeGoogleCode(params.code)
      .then((account) => {
        acceptAuthenticatedAccount(account);
        router.replace('/login');
      })
      .catch((error: unknown) => {
        setErrorCode(error instanceof GoogleAuthError ? error.code : 'temporary_failure');
      });
  }, [acceptAuthenticatedAccount, params.code, params.error, router]);

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <AppText variant="heading" weight="800">Concluindo entrada</AppText>
          <AppText color={colors.textMuted}>
            {parameterError ?? (errorCode ? callbackErrors[errorCode] : 'Validando sua conta e seus acessos…')}
          </AppText>
        </View>
        {parameterError || errorCode ? <Button label="Voltar ao login" onPress={() => router.replace('/login')} /> : null}
      </Card>
    </Screen>
  );
}
