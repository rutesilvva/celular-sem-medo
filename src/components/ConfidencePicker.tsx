import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

const confidenceOptions = [
  { value: 1, label: 'Preciso de ajuda' },
  { value: 2, label: 'Ainda tenho muitas dúvidas' },
  { value: 3, label: 'Consigo com ajuda' },
  { value: 4, label: 'Consigo com pouca ajuda' },
  { value: 5, label: 'Consigo sozinho' },
] as const;

export function ConfidencePicker({ value, onChange, label }: { value: number | null; onChange: (value: number) => void; label: string }) {
  return <View style={styles.wrap}><AppText weight="800">{label}</AppText><AppText variant="small" color={colors.textMuted}>Escolha a frase que melhor representa como você se sente.</AppText><View accessibilityRole="radiogroup" style={styles.options}>{confidenceOptions.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} accessibilityLabel={option.label} onPress={() => onChange(option.value)} style={[styles.option,value===option.value&&styles.selected]}><View style={[styles.number,value===option.value&&styles.numberSelected]}><AppText variant="small" weight="800" color={value===option.value?colors.surface:colors.primary}>{option.value}</AppText></View><AppText variant="small" weight="700" color={value===option.value?colors.surface:colors.text} style={styles.optionLabel}>{option.label}</AppText></Pressable>)}</View></View>;
}
const styles=StyleSheet.create({wrap:{gap:spacing.sm},options:{gap:spacing.sm},option:{alignItems:'center',borderColor:colors.primaryMuted,borderRadius:radius.lg,borderWidth:2,flexDirection:'row',gap:spacing.md,minHeight:56,paddingHorizontal:spacing.md,paddingVertical:spacing.sm},selected:{backgroundColor:colors.primary,borderColor:colors.primaryDark},number:{alignItems:'center',backgroundColor:colors.primarySoft,borderRadius:radius.round,height:34,justifyContent:'center',width:34},numberSelected:{backgroundColor:colors.primaryDark},optionLabel:{flex:1}});
