import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, LogoMark } from '@/components/ui';
import { Role, useApp } from '@/context/AppContext';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { role, sessionRole, setRole, signIn } = useApp();
  const [email, setEmail] = useState('maria@exemplo.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (sessionRole === 'participant') router.replace('/participant/welcome');
    if (sessionRole === 'monitor') router.replace('/monitor/home');
    if (sessionRole === 'admin') router.replace('/admin/home');
  }, [router, sessionRole]);

  const enter = () => signIn(role);

  return (
    <Screen keyboard contentStyle={styles.content}>
      <View style={styles.brand}>
        <LogoMark compact wordmark />
        <View>
          <AppText variant="small" color={colors.textMuted} style={styles.center}>Segurança para aprender e praticar.</AppText>
        </View>
      </View>

      <Card style={styles.form}>
        <View style={styles.formHeading}>
          <AppText variant="heading" weight="800" color={colors.primary} style={styles.center}>Entrar na sua conta</AppText>
          <AppText color={colors.textMuted} style={styles.center}>Informe seus dados para continuar.</AppText>
        </View>

        <Field
          label="E-mail"
          icon="mail-outline"
          value={email}
          placeholder="seu@email.com"
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <View style={styles.fieldGroup}>
          <AppText variant="small" weight="700" color={colors.primary}>Senha</AppText>
          <View style={styles.inputShell}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.iconMuted} />
            <TextInput
              accessibilityLabel="Senha"
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showPassword}
              style={styles.input}
              value={password}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              hitSlop={8}
              onPress={() => setShowPassword((current) => !current)}
            >
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.roleGroup}>
          <AppText variant="small" weight="700" color={colors.primary}>Entrar como</AppText>
          <View style={styles.roleRow}>
            <RoleCard role="participant" selected={role === 'participant'} onPress={() => setRole('participant')} />
            <RoleCard role="monitor" selected={role === 'monitor'} onPress={() => setRole('monitor')} />
          </View>
          <RoleCard role="admin" selected={role === 'admin'} onPress={() => setRole('admin')} />
        </View>

        <Button
          label={`Entrar como ${role === 'participant' ? 'participante' : role === 'monitor' ? 'monitor' : 'administrador'}`}
          onPress={enter}
          icon="arrow-forward"
        />
        <AppText variant="small" color={colors.textMuted} style={styles.center}>
          Não tem uma conta? Fale com seu monitor.
        </AppText>
      </Card>
    </Screen>
  );
}

function Field({ label, icon, value, placeholder, onChangeText, keyboardType }: {
  label: string;
  icon: 'mail-outline';
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType: 'email-address';
}) {
  return (
    <View style={styles.fieldGroup}>
      <AppText variant="small" weight="700" color={colors.primary}>{label}</AppText>
      <View style={styles.inputShell}>
        <Ionicons name={icon} size={22} color={colors.iconMuted} />
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="none"
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          value={value}
        />
      </View>
    </View>
  );
}

function RoleCard({ role, selected, onPress }: { role: Role; selected: boolean; onPress: () => void }) {
  const labels = {
    participant: { title: 'Participante', caption: 'Quero praticar', icon: 'person-outline' as const, color: colors.primary },
    monitor: { title: 'Monitor', caption: 'Acompanho a turma', icon: 'people-outline' as const, color: colors.warning },
    admin: { title: 'Administrador', caption: 'Gerencio todo o aplicativo', icon: 'shield-checkmark-outline' as const, color: colors.danger },
  };
  const content = labels[role];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${content.title}, ${content.caption}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.roleCard, selected && styles.roleSelected, pressed && styles.pressed]}
    >
      {selected ? (
        <View style={styles.check}><Ionicons name="checkmark" size={16} color={colors.surface} /></View>
      ) : null}
      <View style={[styles.roleIcon, role === 'monitor' && styles.monitorIcon, role === 'admin' && styles.adminIcon]}>
        <Ionicons name={content.icon} size={28} color={content.color} />
      </View>
      <AppText variant="small" weight="800" color={colors.primary}>{content.title}</AppText>
      <AppText variant="caption" color={colors.textMuted}>{content.caption}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl },
  brand: { alignItems: 'center', gap: spacing.md },
  center: { textAlign: 'center' },
  form: { gap: spacing.lg, padding: spacing.xl },
  formHeading: { gap: spacing.xs },
  fieldGroup: { gap: spacing.sm },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  input: { color: colors.text, flex: 1, fontFamily: type.family, fontSize: type.body, minHeight: 50 },
  roleGroup: { gap: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleCard: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    gap: spacing.xs,
    minHeight: 142,
    padding: spacing.md,
    position: 'relative',
  },
  roleSelected: { backgroundColor: '#FBF8FF', borderColor: colors.primary },
  roleIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  monitorIcon: { backgroundColor: colors.warningSoft },
  adminIcon: { backgroundColor: colors.dangerSoft },
  check: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 24, justifyContent: 'center', position: 'absolute', right: 8, top: 8, width: 24 },
  pressed: { opacity: 0.72 },
});
