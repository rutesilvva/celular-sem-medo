import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

export function ConfidencePicker({ value, onChange, label }: { value: number | null; onChange: (value: number) => void; label: string }) {
  return <View style={styles.wrap}><AppText weight="800">{label}</AppText><AppText variant="small" color={colors.textMuted}>1 significa “ainda não consigo” e 5 significa “consigo sozinho”.</AppText><View style={styles.options}>{[1,2,3,4,5].map((number) => <Pressable key={number} accessibilityRole="radio" accessibilityState={{ checked: value === number }} accessibilityLabel={`${number} de 5`} onPress={() => onChange(number)} style={[styles.option,value===number&&styles.selected]}><AppText weight="800" color={value===number?colors.surface:colors.primary}>{number}</AppText></Pressable>)}</View></View>;
}
const styles=StyleSheet.create({wrap:{gap:spacing.sm},options:{flexDirection:'row',gap:spacing.sm},option:{alignItems:'center',borderColor:colors.primary,borderRadius:radius.round,borderWidth:2,flex:1,justifyContent:'center',minHeight:52},selected:{backgroundColor:colors.primary}});
