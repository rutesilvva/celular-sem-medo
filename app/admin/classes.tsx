import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, Tag } from '@/components/ui';
import { managedClasses } from '@/data/admin';
import { colors, radius, spacing } from '@/theme/tokens';

export default function AdminClassesScreen() {
  return (
    <Screen footer={<AdminNav active="classes" />}>
      <Header title="Turmas" subtitle="Visão global das turmas" />
      {managedClasses.map((item) => (
        <Card key={item.id} style={styles.card}>
          <View style={styles.icon}><Ionicons name="school-outline" size={25} color={colors.primary} /></View>
          <View style={styles.copy}>
            <View style={styles.row}><AppText weight="800" style={styles.copy}>{item.name}</AppText><Tag label={item.status} tone={item.status === 'Ativa' ? 'green' : 'gray'} /></View>
            <AppText variant="small" color={colors.textMuted}>Administrada globalmente</AppText>
            <AppText variant="small" color={colors.textMuted}>{item.participants} participantes</AppText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 },
  copy: { flex: 1, gap: spacing.xs },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
});
