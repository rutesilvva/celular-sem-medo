import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useAdminClasses } from '@/hooks/useAdminManagement';
import { archiveAdminClass, createAdminClass, createClassInvitation, updateAdminClass, type AdminClass } from '@/lib/backend';
import { colors, radius, spacing, type } from '@/theme/tokens';

export default function AdminClassesScreen() {
  const query = useAdminClasses();
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [shift, setShift] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const create = async () => {
    if (!name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { setError('Informe nome e código com letras minúsculas, números e hífens.'); return; }
    setBusy(true); setError('');
    try { await createAdminClass(name, slug, shift); setName(''); setSlug(''); setShift(''); query.retry(); }
    catch { setError('Não foi possível criar a turma. Confira se o código já existe.'); }
    finally { setBusy(false); }
  };
  return <Screen footer={<AdminNav active="classes" />} contentStyle={styles.content}>
    <Header title="Turmas" subtitle="Gestão global com dados reais" />
    <Card style={styles.form}><AppText weight="800">Criar turma</AppText><Field label="Nome" value={name} onChange={setName} /><Field label="Código (ex.: conectados-2026)" value={slug} onChange={(value) => setSlug(value.toLowerCase().replace(/\s+/g, '-'))} /><Field label="Turno (opcional)" value={shift} onChange={setShift} />{error ? <AppText color={colors.danger}>{error}</AppText> : null}<Button label={busy ? 'Criando…' : 'Criar turma'} disabled={busy} icon="add" onPress={() => void create()} /></Card>
    {query.loading ? <DataState kind="loading" title="Carregando turmas" message="Consultando o ambiente." /> : query.error ? <DataState kind="error" title="Não foi possível carregar" message="Tente novamente." onRetry={query.retry} /> : query.data.map((item) => <ClassCard key={item.class_id} item={item} retry={query.retry} />)}
  </Screen>;
}

function ClassCard({ item, retry }: { item: AdminClass; retry: () => void }) {
  const [editing, setEditing] = useState(false); const [name, setName] = useState(item.class_name); const [shift, setShift] = useState(item.class_shift ?? ''); const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(''); const [inviteUrl, setInviteUrl] = useState(''); const [inviteError, setInviteError] = useState('');
  const save = async () => { setBusy(true); try { await updateAdminClass(item.class_id, name, shift); setEditing(false); retry(); } finally { setBusy(false); } };
  const archive = () => Alert.alert('Arquivar turma?', 'Participantes deixarão de acessar esta turma.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Arquivar', style: 'destructive', onPress: () => void archiveAdminClass(item.class_id).then(retry) }]);
  const invite = async () => { if (!/^\S+@\S+\.\S+$/.test(inviteEmail.trim())) { setInviteError('Informe o e-mail Google do participante.'); return; } setBusy(true); setInviteError(''); try { const result=await createClassInvitation(item.class_id,inviteEmail); setInviteUrl(`celularsemmedo://invite?token=${encodeURIComponent(result.invitation_token)}`); } catch { setInviteError('Não foi possível gerar o convite.'); } finally { setBusy(false); } };
  return <Card style={styles.card}><View style={styles.row}><View style={styles.icon}><Ionicons name="school-outline" size={25} color={colors.primary} /></View><View style={styles.copy}><AppText weight="800">{item.class_name}</AppText><AppText variant="small" color={colors.textMuted}>{item.class_slug} · {item.participant_count} participantes</AppText></View><Tag label={item.class_status === 'active' ? 'Ativa' : 'Arquivada'} tone={item.class_status === 'active' ? 'green' : 'gray'} /></View>{editing ? <><Field label="Nome" value={name} onChange={setName} /><Field label="Turno" value={shift} onChange={setShift} /><Button label="Salvar" disabled={busy} onPress={() => void save()} /></> : null}{item.class_status === 'active' ? <><View style={styles.actions}><Button label={editing ? 'Cancelar' : 'Editar'} variant="secondary" onPress={() => setEditing(!editing)} /><Button label="Arquivar" variant="soft" onPress={archive} /></View><View style={styles.invite}><AppText weight="800">Convidar participante por QR Code</AppText><AppText variant="small" color={colors.textMuted}>O convite funciona apenas com o e-mail Google informado, expira e só pode ser usado uma vez.</AppText><Field label="E-mail Google do participante" value={inviteEmail} onChange={setInviteEmail} /><Button label={busy ? 'Gerando…' : 'Gerar QR Code seguro'} icon="qr-code-outline" disabled={busy} onPress={() => void invite()} />{inviteError ? <AppText color={colors.danger}>{inviteError}</AppText> : null}{inviteUrl ? <View accessibilityLabel="QR Code de convite da turma" style={styles.qr}><QRCode value={inviteUrl} size={190} /><AppText variant="caption" color={colors.textMuted}>O participante deve ler este código com a câmera do celular que possui o Celular Sem Medo instalado.</AppText></View> : null}</View></> : null}</Card>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <View style={styles.field}><AppText variant="small" weight="700">{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={styles.input} /></View>; }

const styles = StyleSheet.create({ content: { gap: spacing.lg }, form: { gap: spacing.md }, card: { gap: spacing.md }, row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: 'center', width: 48 }, copy: { flex: 1, gap: spacing.xs }, actions: { flexDirection: 'row', gap: spacing.sm }, invite: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.md, paddingTop: spacing.md }, qr: { alignItems: 'center', backgroundColor: colors.surface, gap: spacing.md, padding: spacing.lg }, field: { gap: spacing.xs }, input: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontFamily: type.family, minHeight: 48, paddingHorizontal: spacing.md } });
