import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

export function DataState({ kind, title, message, onRetry }: {
  kind: 'loading' | 'empty' | 'error';
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card style={styles.card}>
      {kind === 'loading' ? (
        <ActivityIndicator accessibilityLabel={title} color={colors.primary} size="large" />
      ) : (
        <View style={styles.icon}>
          <Ionicons name={kind === 'error' ? 'cloud-offline-outline' : 'people-outline'} size={29} color={colors.primary} />
        </View>
      )}
      <AppText weight="800" style={styles.center}>{title}</AppText>
      <AppText variant="small" color={colors.textMuted} style={styles.center}>{message}</AppText>
      {kind === 'error' && onRetry ? <Button label="Tentar novamente" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  center: { textAlign: 'center' },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 56, justifyContent: 'center', width: 56 },
});
