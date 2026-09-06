import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getOfflineQueueSummary, listDownloadedMissions, removeDownloadedMission, type DownloadedMission, type OfflineAttempt } from '@/lib/offline-store';
import { synchronizeOfflineAttempt } from '@/lib/offline-sync';
import { colors, spacing } from '@/theme/tokens';

export default function OfflineActivitiesScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [attempts, setAttempts] = useState<OfflineAttempt[]>([]);
  const [downloads, setDownloads] = useState<DownloadedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true); setError(false);
    try { const [queue,saved]=await Promise.all([getOfflineQueueSummary(currentUser.id),listDownloadedMissions(currentUser.id)]);setAttempts(queue.attempts);setDownloads(saved); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [currentUser]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const synchronizeAll = async () => {
    if (!currentUser || syncing) return;
    setSyncing(true); setError(false);
    try {
      for (const attempt of attempts.filter((item) => item.pending.length)) await synchronizeOfflineAttempt(currentUser.id, attempt.assignmentId);
      await load();
    } catch { setError(true); }
    finally { setSyncing(false); }
  };

  const pending = attempts.reduce((total, attempt) => total + attempt.pending.length, 0);
  return (
    <Screen footer={<ParticipantNav active="profile" />} contentStyle={styles.content}>
      <Header title="Atividades offline" subtitle="O que está salvo neste aparelho" onBack={() => router.back()} />
      {loading ? <DataState kind="loading" title="Verificando atividades" message="Lendo os dados protegidos desta conta." /> : error ? <DataState kind="error" title="Não foi possível sincronizar" message="Os dados continuam salvos. Verifique a internet e tente novamente." onRetry={() => void synchronizeAll()} /> : !attempts.length && !downloads.length ? <DataState kind="empty" title="Nenhuma atividade salva" message="Baixe uma missão para praticar sem internet." /> : <>
        {downloads.map((mission)=><Card key={mission.assignmentId} style={styles.item}><View style={styles.row}><Ionicons name="download-outline" size={22} color={colors.success}/><AppText weight="800" style={styles.copy}>{mission.title}</AppText><Tag label="Disponível offline" tone="green"/></View><AppText variant="small" color={colors.textMuted}>{mission.stepCount} passos · baixada em {new Date(mission.downloadedAt).toLocaleDateString('pt-BR')}</AppText><View style={styles.row}><Button label="Abrir missão" variant="secondary" onPress={()=>router.push({pathname:'/participant/mission-details',params:{assignmentId:mission.assignmentId}})}/><Button label="Remover download" variant="soft" onPress={()=>void removeDownloadedMission(currentUser!.id,mission.assignmentId).then(load)}/></View></Card>)}
        <Card style={styles.summary}><Ionicons name={pending ? 'cloud-upload-outline' : 'checkmark-circle-outline'} size={30} color={pending ? colors.primary : colors.success} /><View style={styles.copy}><AppText weight="800">{pending ? `${pending} atividade(s) aguardando envio` : 'Tudo sincronizado'}</AppText><AppText variant="small" color={colors.textMuted}>Dados de outras contas nunca aparecem nesta lista.</AppText></View></Card>
        {attempts.map((attempt) => <Card key={attempt.assignmentId} style={styles.item}><View style={styles.row}><AppText weight="800" style={styles.copy}>Missão salva</AppText><Tag label={attempt.pending.length ? `${attempt.pending.length} pendente(s)` : 'Sincronizada'} tone={attempt.pending.length ? 'yellow' : 'green'} /></View><AppText variant="small" color={colors.textMuted}>Passo salvo: {attempt.run.stepIndex + 1} · Atualizada em {new Date(attempt.updatedAt).toLocaleString('pt-BR')}</AppText>{attempt.pending.length ? <Button label="Sincronizar esta missão" variant="secondary" disabled={syncing} onPress={() => void synchronizeOfflineAttempt(currentUser!.id, attempt.assignmentId).then(load).catch(() => setError(true))} /> : null}</Card>)}
        {pending ? <Button label={syncing ? 'Sincronizando…' : 'Sincronizar tudo'} icon="cloud-upload-outline" disabled={syncing} onPress={() => void synchronizeAll()} /> : null}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.lg }, summary: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, copy: { flex: 1 }, item: { gap: spacing.md }, row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm } });
