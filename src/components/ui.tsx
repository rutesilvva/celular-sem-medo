import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useApp } from '@/context/AppContext';
import { colors, radius, shadow, spacing, type } from '@/theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

type AppTextProps = TextProps & {
  variant?: 'title' | 'heading' | 'subheading' | 'body' | 'small' | 'caption';
  weight?: TextStyle['fontWeight'];
  color?: string;
};

export function AppText({
  variant = 'body',
  weight = '400',
  color = colors.text,
  style,
  ...props
}: AppTextProps) {
  const { preferences } = useApp();
  const metrics = textMetrics[variant];
  const scale = preferences.largerText ? 1.28 : 1;
  const isSubtleText = color === colors.textMuted || color === colors.placeholder;
  const effectiveColor = preferences.highContrast && isSubtleText ? colors.text : color;

  return (
    <Text
      {...props}
      style={[
        styles.text,
        styles[`text_${variant}`],
        {
          color: effectiveColor,
          fontSize: metrics.fontSize * scale,
          fontWeight: weight,
          lineHeight: metrics.lineHeight * scale,
        },
        style,
      ]}
    />
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'soft' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { preferences } = useApp();
  const foreground = disabled
    ? colors.textMuted
    : variant === 'primary' || variant === 'danger' ? colors.surface : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => { if (preferences.hapticFeedback) void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        disabled && styles.buttonDisabled,
        pressed && !disabled && !preferences.reduceMotion && styles.buttonPressed,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={22} color={foreground} /> : null}
      <AppText variant="body" weight="700" color={foreground} style={styles.buttonLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'primary',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'muted';
}) {
  const { preferences } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { if (preferences.hapticFeedback) void Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [styles.iconButton, pressed && !preferences.reduceMotion && styles.buttonPressed]}
    >
      <Ionicons name={icon} size={25} color={tone === 'primary' ? colors.primary : colors.iconMuted} />
    </Pressable>
  );
}

export function AudioButton({ label = 'Ouvir', compact = false, message }: {
  label?: string;
  compact?: boolean;
  message?: string;
}) {
  const { playInstruction } = useApp();

  if (compact) {
    return (
      <IconButton
        icon="volume-high-outline"
        label={label}
        onPress={() => playInstruction(message)}
      />
    );
  }

  return (
    <Button
      label={label}
      icon="volume-high-outline"
      onPress={() => playInstruction(message)}
      variant="secondary"
    />
  );
}

export function ProgressBar({ value, color = colors.primary, height = 10 }: {
  value: number;
  color?: string;
  height?: number;
}) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: safeValue }}
      style={[styles.progressTrack, { height }]}
    >
      <View style={[styles.progressFill, { backgroundColor: color, width: `${safeValue}%` }]} />
    </View>
  );
}

export function Tag({ label, tone = 'purple' }: {
  label: string;
  tone?: 'purple' | 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}) {
  const toneStyle = tagTones[tone];
  return (
    <View style={[styles.tag, { backgroundColor: toneStyle.background }]}>
      <AppText variant="caption" weight="700" color={toneStyle.foreground}>{label}</AppText>
    </View>
  );
}

export function SwitchRow({
  title,
  description,
  value,
  onValueChange,
  icon,
}: {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityHint={description}
      accessibilityLabel={title}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={2}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [styles.switchRow, pressed && styles.switchRowPressed]}
    >
      {icon ? (
        <View style={styles.switchIcon}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.switchCopy}>
        <AppText weight="700">{title}</AppText>
        {description ? <AppText variant="small" color={colors.textMuted}>{description}</AppText> : null}
      </View>
      <Switch
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        value={value}
        trackColor={{ false: colors.border, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.surface}
        ios_backgroundColor={colors.border}
      />
    </Pressable>
  );
}

export function MetricCard({ icon, value, label, tone = 'purple' }: {
  icon: IconName;
  value: string;
  label: string;
  tone?: 'purple' | 'green' | 'yellow' | 'blue';
}) {
  const metricTone = metricTones[tone];
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: metricTone.background }]}>
        <Ionicons name={icon} size={25} color={metricTone.foreground} />
      </View>
      <AppText variant="heading" weight="800">{value}</AppText>
      <AppText variant="small" color={colors.textMuted}>{label}</AppText>
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <AppText variant="subheading" weight="800" style={styles.sectionTitle}>{children}</AppText>
      {action}
    </View>
  );
}

export function Header({ title, subtitle, onBack, audio = false, action }: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  audio?: boolean;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerMain}>
        {onBack ? <IconButton icon="arrow-back" label="Voltar" onPress={onBack} tone="muted" /> : null}
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" variant="heading" weight="800" color={colors.primary}>{title}</AppText>
          {subtitle ? <AppText variant="small" color={colors.textMuted}>{subtitle}</AppText> : null}
        </View>
      </View>
      {audio ? <AudioButton compact label={`Ouvir: ${title}`} /> : action}
    </View>
  );
}

export function LogoMark({ compact = false, wordmark = false }: { compact?: boolean; wordmark?: boolean }) {
  const logoSource = require('../../assets/logo-celular-sem-medo.png');

  if (wordmark) {
    const width = compact ? 92 : 150;
    return (
      <Image
        accessibilityLabel="Celular Sem Medo"
        resizeMode="contain"
        source={logoSource}
        style={{ height: width * (1379 / 1089), width }}
      />
    );
  }

  const size = compact ? 68 : 118;
  const imageWidth = size * 1.4;
  return (
    <View
      accessibilityLabel="Símbolo Celular Sem Medo"
      style={[styles.logoCrop, { height: size * 1.08, width: size }]}
    >
      <Image
        accessible={false}
        resizeMode="contain"
        source={logoSource}
        style={{
          height: imageWidth * (1379 / 1089),
          left: (size - imageWidth) / 2,
          position: 'absolute',
          top: 0,
          width: imageWidth,
        }}
      />
    </View>
  );
}

const tagTones = {
  purple: { background: colors.primarySoft, foreground: colors.primary },
  green: { background: colors.successSoft, foreground: '#147743' },
  yellow: { background: colors.warningSoft, foreground: '#8A6000' },
  red: { background: colors.dangerSoft, foreground: colors.danger },
  blue: { background: colors.blueSoft, foreground: colors.blue },
  gray: { background: '#EFEEF2', foreground: colors.textMuted },
};

const metricTones = {
  purple: { background: colors.primarySoft, foreground: colors.primary },
  green: { background: colors.successSoft, foreground: colors.success },
  yellow: { background: colors.warningSoft, foreground: colors.warning },
  blue: { background: colors.blueSoft, foreground: colors.blue },
};

const textMetrics = {
  title: { fontSize: type.title, lineHeight: 38 },
  heading: { fontSize: type.heading, lineHeight: 31 },
  subheading: { fontSize: type.subheading, lineHeight: 27 },
  body: { fontSize: type.body, lineHeight: 24 },
  small: { fontSize: type.small, lineHeight: 20 },
  caption: { fontSize: type.caption, lineHeight: 16 },
} as const;

function colorAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const opacity = Math.max(0, Math.min(1, alpha));
  const value = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean;
  const num = parseInt(value, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  text: { fontFamily: type.family, lineHeight: 24 },
  text_title: { fontSize: type.title, lineHeight: 38 },
  text_heading: { fontSize: type.heading, lineHeight: 31 },
  text_subheading: { fontSize: type.subheading, lineHeight: 27 },
  text_body: { fontSize: type.body, lineHeight: 24 },
  text_small: { fontSize: type.small, lineHeight: 20 },
  text_caption: { fontSize: type.caption, lineHeight: 16 },
  card: {
    backgroundColor: '#FFFDFD',
    borderColor: colorAlpha(colors.primary, 0.18),
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: spacing.lg,
    ...shadow,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  button_primary: { backgroundColor: colors.primary, borderColor: colors.primaryDark, borderWidth: 1.5, borderRadius: radius.xl },
  button_secondary: { backgroundColor: '#FFFDFD', borderColor: colors.primary, borderWidth: 2, borderRadius: radius.xl },
  button_soft: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderWidth: 1.5, borderRadius: radius.xl },
  button_danger: { backgroundColor: colors.danger, borderColor: '#A83B4D', borderWidth: 1.5, borderRadius: radius.xl },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  buttonDisabled: { backgroundColor: '#E4E1E8', borderColor: '#E4E1E8', opacity: 0.75 },
  buttonLabel: { flexShrink: 1, textAlign: 'center' },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFDFD',
    borderColor: colors.primaryMuted,
    borderRadius: radius.round,
    borderWidth: 1.5,
    height: 50,
    justifyContent: 'center',
    width: 50,
    ...shadow,
  },
  progressTrack: { backgroundColor: colors.primarySoft, borderRadius: radius.round, overflow: 'hidden', width: '100%' },
  progressFill: { borderRadius: radius.round, height: '100%' },
  tag: { alignSelf: 'flex-start', borderRadius: radius.round, paddingHorizontal: 10, paddingVertical: 5 },
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 76, paddingVertical: spacing.sm },
  switchRowPressed: { backgroundColor: colors.primarySoft, borderRadius: radius.md },
  switchIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 42, justifyContent: 'center', width: 42 },
  switchCopy: { flex: 1, gap: 2 },
  metricCard: { flex: 1, gap: spacing.xs, minHeight: 148 },
  metricIcon: { alignItems: 'center', borderRadius: radius.round, height: 46, justifyContent: 'center', marginBottom: spacing.xs, width: 46 },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitle: { flexShrink: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginBottom: spacing.lg },
  headerMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.sm },
  headerCopy: { flex: 1 },
  logoCrop: { alignSelf: 'center', overflow: 'hidden' },
});
