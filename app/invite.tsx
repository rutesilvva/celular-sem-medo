import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, LogoMark } from '@/components/ui';
import { savePendingInvitation } from '@/lib/pending-invitation';
import { colors, spacing } from '@/theme/tokens';

export default function InvitationScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [valid, setValid] = useState<boolean | null>(null);
  useEffect(() => { void (async () => { try { if (!token) throw new Error(); await savePendingInvitation(token); setValid(true); } catch { setValid(false); } })(); }, [token]);
  return <Screen contentStyle={styles.content}>
    <LogoMark compact wordmark />
    <Card style={styles.card}><Ionicons name={valid === false ? 'alert-circle-outline' : 'school-outline'} size={42} color={valid === false ? colors.danger : colors.primary} /><View style={styles.copy}><AppText variant="heading" weight="800">{valid === false ? 'Convite inválido' : valid === null ? 'Verificando convite…' : 'Você recebeu um convite'}</AppText><AppText color={colors.textMuted}>{valid === false ? 'Peça um novo QR Code à administração.' : 'Entre com o mesmo e-mail Google que recebeu o convite. Depois da validação, sua turma será adicionada automaticamente.'}</AppText></View>{valid ? <Button label="Continuar com Google" icon="logo-google" onPress={() => router.replace('/login')} /> : null}</Card>
  </Screen>;
}
const styles=StyleSheet.create({content:{alignItems:'center',gap:spacing.xl,justifyContent:'center'},card:{alignItems:'center',gap:spacing.lg},copy:{gap:spacing.sm}});
