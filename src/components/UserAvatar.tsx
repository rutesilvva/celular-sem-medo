import { Image, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius } from '@/theme/tokens';

export function UserAvatar({ name, avatarUrl, size = 56, inverted = false }: {
  name: string;
  avatarUrl: string | null;
  size?: number;
  inverted?: boolean;
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toLocaleUpperCase('pt-BR') || '?';
  if (avatarUrl) {
    return (
      <Image
        accessibilityLabel={`Foto de perfil de ${name}`}
        source={{ uri: avatarUrl }}
        style={[styles.avatar, { height: size, width: size }]}
      />
    );
  }
  return (
    <View
      accessibilityLabel={`Foto indisponível. Iniciais de ${name}: ${initials}`}
      style={[
        styles.fallback,
        { height: size, width: size },
        inverted && styles.inverted,
      ]}
    >
      <AppText weight="800" color={inverted ? colors.surface : colors.primary}>{initials}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radius.round },
  fallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    justifyContent: 'center',
  },
  inverted: { backgroundColor: colors.primary },
});
