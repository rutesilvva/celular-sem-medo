import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, SectionTitle, SwitchRow, Tag } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

type ReportPeriod = 7 | 30 | 90;
const periods: readonly ReportPeriod[] = [7, 30, 90];

export default function MonitorProfileScreen() {
  const router = useRouter();
  const { currentUser, preferences, setPreference, showNotice, signOut } = useApp();
  const displayName = currentUser?.name || 'Monitor';
  const [showAudioMetrics, setShowAudioMetrics] = useState(true);
  const [period, setPeriod] = useState<ReportPeriod>(30);
  const [periodOpen, setPeriodOpen] = useState(false);

  const logout = () => {
    signOut();
    showNotice('Sessão encerrada com segurança.');
    router.dismissAll();
    router.replace('/login');
  };

  return (
    <Screen footer={<MonitorNav active="profile" />}>
      <Header
        title="Perfil"
        subtitle="Conta e preferências"
        action={<AudioButton compact label="Ouvir informações do perfil" message="Reproduzindo informações do perfil…" />}
      />

      <Card style={styles.profileCard}>
        <UserAvatar name={displayName} avatarUrl={currentUser?.avatarUrl ?? null} />
        <View style={styles.profileCopy}>
          <AppText variant="subheading" weight="800">{displayName}</AppText>
          <AppText variant="small" color={colors.textMuted}>{currentUser?.email || 'E-mail não informado'}</AppText>
          <Tag label="Monitor(a)" tone="purple" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar informações do perfil"
          hitSlop={6}
          onPress={() => showNotice('Edição de perfil aberta para demonstração.')}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <Ionicons name="pencil-outline" size={22} color={colors.primary} />
        </Pressable>
      </Card>

      <SectionTitle>Minha turma</SectionTitle>
      <Card style={styles.classCard}>
        <View style={styles.classIcon}>
          <Ionicons name="people-outline" size={29} color={colors.primary} />
        </View>
        <View style={styles.flexCopy}>
          <AppText weight="800">Turma Conectados</AppText>
          <AppText variant="small" color={colors.textMuted}>Turno da manhã • 3 participantes</AppText>
        </View>
        <Tag label="Ativa" tone="green" />
      </Card>

      <SectionTitle>Preferências</SectionTitle>
      <Card style={styles.settingsCard}>
        <SwitchRow
          title="Mostrar métricas de áudio"
          description="Inclui o uso de áudio nos painéis e relatórios."
          icon="volume-high-outline"
          value={showAudioMetrics}
          onValueChange={(value) => {
            setShowAudioMetrics(value);
            showNotice(value ? 'Métricas de áudio ativadas.' : 'Métricas de áudio ocultadas.');
          }}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Ouvir avisos automaticamente"
          description="Preferência demonstrativa; o áudio real será integrado depois."
          icon="ear-outline"
          value={preferences.autoAudio}
          onValueChange={(value) => setPreference('autoAudio', value)}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Texto maior"
          description="Mantém os textos prioritários mais fáceis de ler."
          icon="text-outline"
          value={preferences.largerText}
          onValueChange={(value) => setPreference('largerText', value)}
        />
      </Card>

      <View style={styles.periodSection}>
        <AppText variant="subheading" weight="800">Período dos relatórios</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Período dos relatórios, ${period} dias`}
          accessibilityHint={periodOpen ? 'Toque para fechar as opções' : 'Toque para escolher 7, 30 ou 90 dias'}
          accessibilityState={{ expanded: periodOpen }}
          onPress={() => setPeriodOpen((current) => !current)}
          style={({ pressed }) => [styles.selectButton, periodOpen && styles.selectButtonOpen, pressed && styles.pressed]}
        >
          <View style={styles.selectIcon}>
            <Ionicons name="calendar-outline" size={23} color={colors.primary} />
          </View>
          <View style={styles.flexCopy}>
            <AppText weight="800">Últimos {period} dias</AppText>
            <AppText variant="small" color={colors.textMuted}>Período padrão para análises</AppText>
          </View>
          <Ionicons name={periodOpen ? 'chevron-up' : 'chevron-down'} size={23} color={colors.iconMuted} />
        </Pressable>

        {periodOpen ? (
          <Card style={styles.periodMenu}>
            {periods.map((item, index) => {
              const selected = item === period;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={`Últimos ${item} dias`}
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => {
                    setPeriod(item);
                    setPeriodOpen(false);
                    showNotice(`Período padrão alterado para ${item} dias.`);
                  }}
                  style={({ pressed }) => [styles.periodOption, index > 0 && styles.optionDivider, pressed && styles.pressed]}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <AppText weight={selected ? '800' : '600'} style={styles.flexCopy}>Últimos {item} dias</AppText>
                  {selected ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Card>
        ) : null}
      </View>

      <SectionTitle>Conta e suporte</SectionTitle>
      <Card style={styles.accountCard}>
        <AccountRow
          icon="help-circle-outline"
          label="Ajuda e suporte"
          description="Encontre respostas e canais de atendimento"
          onPress={() => showNotice('Central de ajuda aberta para demonstração.')}
        />
        <AccountRow
          icon="shield-checkmark-outline"
          label="Privacidade e segurança"
          description="Consulte como os dados da turma são protegidos"
          onPress={() => showNotice('Informações de privacidade abertas para demonstração.')}
          divider
        />
      </Card>

      <Button
        label="Sair da conta"
        icon="log-out-outline"
        onPress={logout}
        variant="danger"
      />
      <AppText variant="caption" color={colors.textMuted} style={styles.center}>Versão de demonstração 0.1.0</AppText>
    </Screen>
  );
}

function AccountRow({ icon, label, description, onPress, divider = false }: {
  icon: 'help-circle-outline' | 'shield-checkmark-outline';
  label: string;
  description: string;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.accountRow, divider && styles.optionDivider, pressed && styles.pressed]}
    >
      <View style={styles.accountIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.flexCopy}>
        <AppText weight="800">{label}</AppText>
        <AppText variant="small" color={colors.textMuted}>{description}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={23} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 72, justifyContent: 'center', width: 72 },
  profileCopy: { flex: 1, gap: spacing.xs },
  editButton: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  pressed: { opacity: 0.65 },
  classCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  classIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 56, justifyContent: 'center', width: 56 },
  flexCopy: { flex: 1 },
  settingsCard: { gap: 0 },
  divider: { backgroundColor: colors.border, height: 1 },
  periodSection: { gap: spacing.sm },
  selectButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md,
  },
  selectButtonOpen: { borderColor: colors.primary },
  selectIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  periodMenu: { gap: 0, paddingVertical: spacing.xs },
  periodOption: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 54, paddingHorizontal: spacing.sm },
  optionDivider: { borderTopColor: colors.border, borderTopWidth: 1 },
  radio: { alignItems: 'center', borderColor: colors.iconMuted, borderRadius: radius.round, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  radioSelected: { borderColor: colors.primary },
  radioDot: { backgroundColor: colors.primary, borderRadius: radius.round, height: 10, width: 10 },
  accountCard: { gap: 0, paddingVertical: spacing.xs },
  accountRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 78, paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  accountIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  center: { textAlign: 'center' },
});
