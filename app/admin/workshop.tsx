import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminClassSelector } from '@/components/AdminClassSelector';
import { AdminNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { useWorkshopStatus } from '@/hooks/useAdminManagement';
import { useAdminClass } from '@/hooks/useClassData';
import { getSupabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

export default function WorkshopScreen() {
  const router = useRouter();
  const selected = useAdminClass();
  const query = useWorkshopStatus(selected.data?.class_id ?? null);

  useEffect(() => {
    if (!selected.data) return;
    const channel = getSupabase()
      .channel(`workshop-${selected.data.class_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts', filter: `class_id=eq.${selected.data.class_id}` }, query.retry)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_requests', filter: `class_id=eq.${selected.data.class_id}` }, query.retry)
      .subscribe();

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [query.retry, selected.data]);

  return (
    <Screen footer={<AdminNav active="participants" />} contentStyle={styles.content}>
      <Header
        title="Modo oficina"
        subtitle="Acompanhamento ao vivo dos participantes"
        onBack={() => router.back()}
        action={<Tag label="Realtime Ativo" tone="green" />}
      />

      <AdminClassSelector selectedId={selected.data?.class_id} />

      {selected.loading || query.loading ? (
        <DataState kind="loading" title="Abrindo oficina" message="Buscando status dos alunos em tempo real." />
      ) : query.error ? (
        <DataState kind="error" title="Oficina indisponível" message="Não foi possível conectar ao monitoramento." onRetry={query.retry} />
      ) : query.data.length === 0 ? (
        <Card style={styles.card}>
          <AppText weight="800">Nenhum participante praticando no momento.</AppText>
          <AppText variant="small" color={colors.textMuted}>Os dados da turma serão atualizados automaticamente via Realtime assim que um aluno iniciar um treino.</AppText>
          <Button label="Atualizar Painel" icon="refresh-outline" variant="secondary" onPress={query.retry} />
        </Card>
      ) : (
        query.data.map((item) => (
          <Card key={item.participant_id} style={styles.card}>
            <View style={styles.row}>
              <AppText weight="800" style={styles.copy}>
                {item.display_name}
              </AppText>
              <Tag
                label={
                  Number(item.open_help_count) > 0
                    ? `${item.open_help_count} ajuda`
                    : item.attempt_status === 'in_progress'
                      ? 'Praticando'
                      : item.attempt_status === 'completed'
                        ? 'Concluiu'
                        : 'Aguardando'
                }
                tone={
                  Number(item.open_help_count) > 0
                    ? 'yellow'
                    : item.attempt_status === 'completed'
                      ? 'green'
                      : 'purple'
                }
              />
            </View>
            <AppText variant="small" color={colors.textMuted}>
              {item.current_mission ?? 'Nenhuma missão iniciada'}
              {item.current_step ? ` · ${item.current_step}` : ''}
            </AppText>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  card: { gap: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  copy: { flex: 1 },
});
