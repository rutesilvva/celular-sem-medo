import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { selectAdminClass } from '@/hooks/useClassData';
import { getAdminClassContexts, type ClassContext } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

export function AdminClassSelector({ selectedId }: { selectedId?: string }) {
  const [classes, setClasses] = useState<ClassContext[]>([]);
  useEffect(() => { void getAdminClassContexts().then(setClasses).catch(() => setClasses([])); }, []);
  if (classes.length < 2) return null;
  return <View accessibilityLabel="Selecionar turma" style={styles.wrap}>{classes.map((item) => {
    const selected = item.class_id === selectedId;
    return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={item.class_id} onPress={() => selectAdminClass(item.class_id)} style={[styles.item, selected && styles.selected]}><AppText variant="small" weight="800" color={selected ? colors.surface : colors.primary}>{item.class_name}</AppText></Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({ wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, item: { borderColor: colors.primary, borderRadius: radius.round, borderWidth: 1, minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.md }, selected: { backgroundColor: colors.primary } });
