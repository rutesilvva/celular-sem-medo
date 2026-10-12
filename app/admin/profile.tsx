import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme/tokens';
import { getCertificateSettings, updateCertificateSettings } from '@/lib/backend';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();
  const displayName = currentUser?.name || 'Administrador';
  const [organization,setOrganization]=useState('Celular Sem Medo');const[signer,setSigner]=useState('Coordenação do projeto');const[signerTitle,setSignerTitle]=useState('Responsável institucional');const[saved,setSaved]=useState(false);const[settingsError,setSettingsError]=useState<string|null>(null);const[saving,setSaving]=useState(false);
  useEffect(()=>{void getCertificateSettings().then((value)=>{setOrganization(value.organization_name);setSigner(value.signer_name);setSignerTitle(value.signer_title);}).catch(()=>undefined);},[]);
  return (
    <Screen footer={<AdminNav active="profile" />}>
      <Header title="Perfil" subtitle="Administrador global" />
      <Card style={styles.card}>
        <UserAvatar name={displayName} avatarUrl={currentUser?.avatarUrl ?? null} />
        <AppText variant="heading" weight="800">{displayName}</AppText>
        <AppText color={colors.textMuted}>{currentUser?.email || 'E-mail não informado'}</AppText>
        <Tag label="Admin global ativo" tone="red" />
      </Card>
      <Card style={styles.card}>
        <AppText weight="800">Segurança da conta</AppText>
        <AppText variant="small" color={colors.textMuted}>Acesso concedido pelo servidor. Operações sensíveis exigem login recente e geram eventos de auditoria.</AppText>
      </Card>
      <Card style={styles.card}>
        <AppText weight="800">Assinatura dos certificados</AppText>
        <AppText variant="small" color={colors.textMuted}>Nome e cargo aparecerão como assinatura institucional. Não envie uma assinatura manuscrita.</AppText>
        <TextInput accessibilityLabel="Organização emissora" value={organization} onChangeText={(value)=>{setOrganization(value);setSaved(false);setSettingsError(null);}} placeholder="Organização" style={styles.input}/>
        <TextInput accessibilityLabel="Nome do responsável" value={signer} onChangeText={(value)=>{setSigner(value);setSaved(false);setSettingsError(null);}} placeholder="Responsável" style={styles.input}/>
        <TextInput accessibilityLabel="Cargo do responsável" value={signerTitle} onChangeText={(value)=>{setSignerTitle(value);setSaved(false);setSettingsError(null);}} placeholder="Cargo" style={styles.input}/>
        {settingsError?<AppText color={colors.danger} accessibilityRole="alert">{settingsError}</AppText>:null}
        <Button label={saving?'Salvando...':saved?'Assinatura salva':'Salvar assinatura institucional'} disabled={saving||saved||organization.trim().length<2||signer.trim().length<2||signerTitle.trim().length<2} onPress={()=>{setSaving(true);setSettingsError(null);void updateCertificateSettings(organization,signer,signerTitle).then(()=>setSaved(true)).catch(()=>setSettingsError('Não foi possível salvar. Tente novamente.')).finally(()=>setSaving(false));}}/>
      </Card>
      <Button label="Administrar certificados" icon="ribbon-outline" variant="secondary" onPress={()=>router.push('/admin/certificates')}/>
      <Button label="Sair da conta" icon="log-out-outline" variant="secondary" onPress={() => {
        void signOut().finally(() => {
          if (router.canDismiss()) router.dismissAll();
          router.replace('/login');
        });
      }} />
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { alignItems: 'flex-start', gap: spacing.md }, input:{borderColor:colors.border,borderRadius:10,borderWidth:1,color:colors.text,minHeight:52,paddingHorizontal:spacing.md,width:'100%'} });
