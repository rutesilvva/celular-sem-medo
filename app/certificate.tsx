import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, LogoMark, Tag } from '@/components/ui';
import { verifyCertificate, type VerifiedCertificate } from '@/lib/backend';
import { colors, spacing } from '@/theme/tokens';

export default function VerifyCertificateScreen(){const{code}=useLocalSearchParams<{code?:string}>();const router=useRouter();const[data,setData]=useState<VerifiedCertificate|null>(null);const[loading,setLoading]=useState(Boolean(code));useEffect(()=>{if(!code)return;void verifyCertificate(code).then(setData).catch(()=>setData(null)).finally(()=>setLoading(false));},[code]);return <Screen contentStyle={styles.content}><LogoMark compact wordmark/>{loading?<DataState kind="loading" title="Validando certificado" message="Consultando o registro oficial."/>:!data||!data.valid?<DataState kind="error" title="Certificado não encontrado" message="Confira o QR Code ou o código informado."/>:<Card style={styles.card}><Ionicons name="shield-checkmark" size={56} color={colors.success}/><Tag label="CERTIFICADO VÁLIDO" tone="green"/><AppText variant="heading" weight="800" style={styles.center}>{data.participant_name}</AppText><AppText style={styles.center}>{data.completed_missions} missões · {data.estimated_hours} hora(s) estimada(s)</AppText><AppText variant="small" color={colors.textMuted} style={styles.center}>{data.class_name} · {data.competencies.join(', ')}</AppText><View><AppText variant="small" weight="800">Assinatura institucional</AppText><AppText variant="small">{data.signer_name} — {data.signer_title}</AppText><AppText variant="small">{data.organization_name}</AppText></View><AppText variant="caption" color={colors.textMuted}>Emitido em {new Date(data.issued_at).toLocaleDateString('pt-BR')}. Certificado de participação, sem equivalência profissional.</AppText></Card>}<Button label="Ir para o Celular Sem Medo" variant="secondary" onPress={()=>router.replace('/login')}/></Screen>}
const styles=StyleSheet.create({content:{alignItems:'stretch',gap:spacing.lg,justifyContent:'center'},card:{alignItems:'center',gap:spacing.md},center:{textAlign:'center'}});
