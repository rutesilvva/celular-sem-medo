import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, SwitchRow } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useMyClass } from '@/hooks/useClassData';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantProfileScreen() {
  const router = useRouter();
  const { preferences, preferencesSyncStatus, retryPreferencesSync, setPreference, showNotice } = useApp();
  const { currentUser, signOut } = useAuth();
  const classQuery = useMyClass('participant');
  const displayName = currentUser?.name || 'Participante';

  const logout = async () => {
    try {
      await signOut();
    } finally {
      showNotice('Sessão encerrada com segurança.');
      router.dismissAll();
      router.replace('/login');
    }
  };

  return (
    <Screen footer={<ParticipantNav active="profile" />} contentStyle={styles.content}>
      <Header title="Perfil e configurações" subtitle="Deixe o aplicativo do seu jeito." />

      <Card style={styles.profileCard}>
        <UserAvatar name={displayName} avatarUrl={currentUser?.avatarUrl ?? null} size={64} inverted />
        <View style={styles.profileCopy}>
          <AppText variant="subheading" weight="800">{displayName}</AppText>
          <AppText variant="small" color={colors.textMuted}>{currentUser?.email || 'E-mail não informado'}</AppText>
          <AppText variant="small" color={colors.textMuted}>
            Participante{classQuery.data ? ` · ${classQuery.data.class_name}` : ''}
          </AppText>
        </View>
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Ionicons name="accessibility-outline" size={25} color={colors.primary} />
          <AppText variant="subheading" weight="800">Acessibilidade</AppText>
        </View>
        <Card style={styles.settingsCard}>
          <SwitchRow
            title="Letras maiores"
            description="Destaca os textos importantes."
            icon="text-outline"
            value={preferences.largerText}
            onValueChange={(value) => setPreference('largerText', value)}
          />
          <View style={styles.divider} />
          <SwitchRow
            title="Alto contraste"
            description="Reforça a leitura da tela."
            icon="contrast-outline"
            value={preferences.highContrast}
            onValueChange={(value) => setPreference('highContrast', value)}
          />
          <View style={styles.divider} />
          <SwitchRow
            title="Preferência de áudio automático"
            description="Reproduz automaticamente as instruções disponíveis."
            icon="volume-high-outline"
            value={preferences.autoAudio}
            onValueChange={(value) => setPreference('autoAudio', value)}
          />
          <View style={styles.divider} />
          <SwitchRow
            title="Preferência de resposta por voz"
            description="Prepara atividades compatíveis com resposta por voz. Nenhuma fala é gravada agora."
            icon="mic-outline"
            value={preferences.voiceResponse}
            onValueChange={(value) => setPreference('voiceResponse', value)}
          />
        </Card>
        {preferencesSyncStatus === 'saving' ? (
          <AppText accessibilityLiveRegion="polite" variant="small" color={colors.textMuted}>Salvando preferências…</AppText>
        ) : preferencesSyncStatus === 'error' ? (
          <View accessibilityLiveRegion="polite" style={styles.syncError}>
            <AppText variant="small" color={colors.danger}>Não foi possível sincronizar. Sua última configuração continua neste aparelho.</AppText>
            <Button label="Tentar sincronizar novamente" variant="secondary" onPress={retryPreferencesSync} />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Ionicons name="help-buoy-outline" size={25} color={colors.primary} />
          <AppText variant="subheading" weight="800">Ajuda e conta</AppText>
        </View>
        <Card style={styles.menuCard}>
          <MenuRow
            icon="help-circle-outline"
            label="Como usar o aplicativo"
            onPress={() => showNotice('Guia rápido disponível nas instruções em áudio')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="chatbubble-ellipses-outline"
            label="Falar com meu monitor"
            onPress={() => showNotice('Demonstração: nenhum pedido de ajuda foi enviado.')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacidade e segurança"
            onPress={() => showNotice('Seus treinos são simulações seguras')}
          />
        </Card>
      </View>

      <Button
        label="Sair da conta"
        icon="log-out-outline"
        variant="danger"
        accessibilityHint="Volta para a tela de entrada"
        onPress={logout}
      />
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }: {
  icon: 'help-circle-outline' | 'chatbubble-ellipses-outline' | 'shield-checkmark-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={23} color={colors.primary} />
      </View>
      <AppText weight="700" style={styles.menuLabel}>{label}</AppText>
      <Ionicons name="chevron-forward" size={22} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  profileCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 76, justifyContent: 'center', width: 76 },
  profileCopy: { alignItems: 'flex-start', flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  settingsCard: { gap: 0, paddingVertical: spacing.sm },
  divider: { backgroundColor: colors.border, height: 1 },
  menuCard: { gap: 0, paddingVertical: spacing.xs },
  menuRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 68, paddingVertical: spacing.sm },
  menuIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 42, justifyContent: 'center', width: 42 },
  menuLabel: { flex: 1 },
  pressed: { opacity: 0.62 },
  syncError: { gap: spacing.sm },
});
