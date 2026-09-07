import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { type AdminCertificate, getAdminCertificates, revokeCertificate } from '@/lib/backend';
import { colors, radius, spacing } from '@/theme/tokens';

type CertificateFilter = 'all' | 'valid' | 'revoked';
const filters: { label: string; value: CertificateFilter }[] = [
  { label: 'Todos', value: 'all' }, { label: 'Válidos', value: 'valid' }, { label: 'Revogados', value: 'revoked' },
];

export default function AdminCertificatesScreen() {
  const [items, setItems] = useState<AdminCertificate[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CertificateFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setLoading(true); setError(false);
    void getAdminCertificates(search, undefined, filter).then(setItems).catch(() => setError(true)).finally(() => setLoading(false));
  }, [filter, search]);
  useEffect(() => { void getAdminCertificates().then(setItems).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  return <Screen footer={<AdminNav active="profile" />} contentStyle={styles.content}>
    <Header title="Certificados" subtitle="Emissões e validações" />
    <Card style={styles.filters}>
      <AppText weight="800">Localizar certificado</AppText>
      <TextInput accessibilityLabel="Pesquisar pelo nome do aluno" value={search} onChangeText={setSearch} placeholder="Nome do aluno" style={styles.input} returnKeyType="search" onSubmitEditing={load} />
      <View style={styles.filterRow}>{filters.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: filter === item.value }} onPress={() => setFilter(item.value)} style={[styles.filterButton, filter === item.value && styles.filterSelected]}><AppText variant="small" weight="800" color={filter === item.value ? colors.surface : colors.textMuted}>{item.label}</AppText></Pressable>)}</View>
      <Button label="Aplicar filtros" icon="search-outline" onPress={load} />
    </Card>
    {loading ? <DataState kind="loading" title="Carregando certificados" message="Consultando emissões." /> : error ? <DataState kind="error" title="Não foi possível carregar" message="Tente novamente." onRetry={load} /> : items.length === 0 ? <DataState kind="empty" title="Nenhum certificado encontrado" message="Altere os filtros ou aguarde novas emissões." /> : items.map((item) => <CertificateCard key={item.certificate_id} item={item} onChanged={load} />)}
  </Screen>;
}

function CertificateCard({ item, onChanged }: { item: AdminCertificate; onChanged: () => void }) {
  const [reason, setReason] = useState(''); const [revoking, setRevoking] = useState(false); const isRevoked = Boolean(item.revoked_at);
  const revoke = () => {
    if (reason.trim().length < 5) return;
    Alert.alert('Revogar certificado?', `O certificado de ${item.participant_name} deixará de ser válido.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Revogar', style: 'destructive', onPress: () => { setRevoking(true); void revokeCertificate(item.certificate_id, reason).then(onChanged).catch(() => Alert.alert('Não foi possível revogar', 'Tente novamente.')).finally(() => setRevoking(false)); } },
    ]);
  };
  return <Card style={styles.card}>
    <View style={styles.heading}><View style={styles.icon}><Ionicons name={isRevoked ? 'close-circle-outline' : 'ribbon-outline'} size={26} color={isRevoked ? colors.danger : colors.success} /></View><View style={styles.copy}><AppText weight="800">{item.participant_name}</AppText><AppText variant="small" color={colors.textMuted}>{item.class_name} · {item.completed_missions} missões</AppText></View><Tag label={isRevoked ? 'Revogado' : 'Válido'} tone={isRevoked ? 'red' : 'green'} /></View>
    <AppText variant="small">Competências: {item.competencies.join(', ')}</AppText>
    <AppText variant="caption" color={colors.textMuted}>Emitido em {new Date(item.issued_at).toLocaleDateString('pt-BR')} · Código {item.verification_code}</AppText>
    {isRevoked ? <AppText variant="small" color={colors.danger}>Motivo: {item.revocation_reason || 'Não informado'}</AppText> : <><TextInput accessibilityLabel={`Justificativa para revogar certificado de ${item.participant_name}`} value={reason} onChangeText={setReason} placeholder="Justificativa obrigatória" maxLength={200} multiline style={[styles.input, styles.reason]} /><Button label={revoking ? 'Revogando...' : 'Revogar certificado'} icon="close-circle-outline" variant="secondary" disabled={revoking || reason.trim().length < 5} onPress={revoke} /></>}
  </Card>;
}

const styles = StyleSheet.create({ content: { gap: spacing.lg }, filters: { gap: spacing.md }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 52, paddingHorizontal: spacing.md, width: '100%' }, reason: { minHeight: 70, paddingTop: spacing.md, textAlignVertical: 'top' }, filterRow: { flexDirection: 'row', gap: spacing.sm }, filterButton: { borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, card: { gap: spacing.md }, heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, icon: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1 } });
