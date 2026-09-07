import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { AppText, Tag } from './ui';
import { colors, radius, spacing } from '@/theme/tokens';
export function SimulationIdentityNotice({ reference }: { reference?: string }) { return <View accessibilityRole="alert" accessibilityLabel="Treino educativo, não é o aplicativo oficial" style={styles.notice}><Ionicons name="school-outline" size={26} color={colors.primary}/><View style={styles.copy}><Tag label="TREINO EDUCATIVO" tone="purple"/><AppText variant="small" weight="800">Ambiente criado pelo Celular Sem Medo</AppText><AppText variant="caption" color={colors.textMuted}>Não é uma tela oficial{reference?` de ${reference}`:''}, não possui afiliação e não realiza ações reais.</AppText></View></View>; }
const styles=StyleSheet.create({notice:{alignItems:'center',backgroundColor:colors.primarySoft,borderColor:colors.primary,borderRadius:radius.lg,borderWidth:2,flexDirection:'row',gap:spacing.md,padding:spacing.md},copy:{alignItems:'flex-start',flex:1,gap:spacing.xs}});
