import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { getCurrentRoles } from '@/lib/google-auth';
import { getSupabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { signIn } = useApp();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const parameterError = params.error || !params.code
    ? params.error === 'access_denied' ? 'O acesso foi negado.' : 'Callback de autenticação inválido.'
    : null;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!params.code || params.error) return;
    void getSupabase().auth.exchangeCodeForSession(params.code).then(async ({ error: exchangeError }) => {
      if (exchangeError) throw exchangeError;
      const roles = await getCurrentRoles();
      if (!roles.length) throw new Error('no_access');
      signIn(roles[0]!);
    }).catch(() => setError('Não foi possível recuperar a entrada. Inicie o login novamente.'));
  }, [params.code, params.error, signIn]);

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading" weight="800">Concluindo entrada</AppText>
          <AppText color={colors.textMuted}>{parameterError ?? error ?? 'Validando sua conta e seus acessos…'}</AppText>
        </View>
        {parameterError || error ? <Button label="Voltar ao login" onPress={() => router.replace('/login')} /> : null}
      </Card>
    </Screen>
  );
}
