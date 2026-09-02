import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AdminNav } from '@/components/BottomNav';
import { AdminClassSelector } from '@/components/AdminClassSelector';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { useAdminClass, useAdminParticipants } from '@/hooks/useClassData';
import type { ClassParticipant, AdminParticipantSort } from '@/lib/backend';
import { colors, radius, spacing, type } from '@/theme/tokens';

type FilterKey = 'all' | 'attention' | 'advancing';

const filters: readonly { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'attention', label: 'Precisam de atenção' },
  { key: 'advancing', label: 'Avançando bem' },
];
const sorts: readonly { key: AdminParticipantSort; label: string }[] = [
  { key: 'name', label: 'Nome' },
  { key: 'progress_asc', label: 'Menor progresso' },
  { key: 'progress_desc', label: 'Maior progresso' },
  { key: 'recent', label: 'Atividade recente' },
];
const pageSize = 20;

export default function ParticipantsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<AdminParticipantSort>('name');
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const classQuery = useAdminClass();
  const participantsQuery = useAdminParticipants(classQuery.data?.class_id ?? null, {
    search: deferredQuery, filter, sort, limit: pageSize, offset: page * pageSize,
  });
  const participants = participantsQuery.data?.items ?? [];
  const total = participantsQuery.data?.total ?? 0;

  const openParticipant = (participant: ClassParticipant) => {
    router.push({ pathname: '/admin/participant-details', params: { id: participant.id } });
  };

  return (
    <Screen footer={<AdminNav active="participants" />}>
      <Header
        title="Participantes"
        subtitle={classQuery.data
          ? `${classQuery.data.class_name} • ${total} ${total === 1 ? 'pessoa' : 'pessoas'}`
          : 'Carregando turma…'}
        audio
      />
      <AdminClassSelector selectedId={classQuery.data?.class_id} />

      {classQuery.loading || (classQuery.data && participantsQuery.loading) ? (
        <DataState kind="loading" title="Carregando participantes" message="Buscando os vínculos ativos da turma." />
      ) : classQuery.error || participantsQuery.error ? (
        <DataState
          kind="error"
          title="Não foi possível carregar a turma"
          message="Verifique sua conexão e tente novamente."
          onRetry={classQuery.error ? classQuery.retry : participantsQuery.retry}
        />
      ) : !classQuery.data ? (
        <DataState kind="empty" title="Nenhuma turma ativa" message="Cadastre ou reative uma turma para acompanhar alunos." />
      ) : (
        <>

      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={23} color={colors.iconMuted} />
        <TextInput
          accessibilityLabel="Buscar participante pelo nome"
          autoCapitalize="words"
          onChangeText={(value) => { setQuery(value); setPage(0); }}
          placeholder="Buscar participante"
          placeholderTextColor={colors.placeholder}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            hitSlop={8}
            onPress={() => { setQuery(''); setPage(0); }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Ionicons name="close-circle" size={24} color={colors.iconMuted} />
          </Pressable>
        ) : null}
      </View>

      <View accessibilityLabel="Filtrar participantes" style={styles.filters}>
        {filters.map((item) => {
          const selected = filter === item.key;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtro ${item.label}`}
              accessibilityState={{ selected }}
              key={item.key}
              onPress={() => { setFilter(item.key); setPage(0); }}
              style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]}
            >
              {selected ? <Ionicons name="checkmark" size={17} color={colors.surface} /> : null}
              <AppText
                variant="small"
                weight={selected ? '800' : '600'}
                color={selected ? colors.surface : colors.textMuted}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View accessibilityLabel="Ordenar participantes" style={styles.filters}>
        {sorts.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: sort === item.key }}
            key={item.key}
            onPress={() => { setSort(item.key); setPage(0); }}
            style={({ pressed }) => [styles.sort, sort === item.key && styles.sortSelected, pressed && styles.pressed]}
          >
            <AppText variant="caption" weight="700" color={sort === item.key ? colors.primary : colors.textMuted}>{item.label}</AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.resultHeading}>
        <AppText variant="subheading" weight="800">
          {total === 1 ? '1 participante' : `${total} participantes`}
        </AppText>
        <AppText variant="small" color={colors.textMuted}>Página {page + 1} · Atualizado {formatUpdatedAt(participantsQuery.updatedAt)}</AppText>
      </View>

      <View style={styles.list}>
        {participants.map((participant) => (
          <ParticipantCard key={participant.id} participant={participant} onPress={() => openParticipant(participant)} />
        ))}

        {participants.length === 0 ? (
          <Card style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={29} color={colors.primary} />
            </View>
            <AppText weight="800" style={styles.center}>{query || filter !== 'all' ? 'Nenhum participante encontrado' : 'Turma sem participantes'}</AppText>
            <AppText variant="small" color={colors.textMuted} style={styles.center}>
              {query || filter !== 'all' ? 'Tente outro nome ou selecione um filtro diferente.' : 'A turma ainda não possui participantes ativos.'}
            </AppText>
          </Card>
        ) : null}
      </View>

      {total > pageSize ? (
        <View style={styles.pagination}>
          <Button label="Página anterior" variant="secondary" disabled={page === 0} onPress={() => setPage((value) => Math.max(0, value - 1))} />
          <Button label="Próxima página" variant="secondary" disabled={(page + 1) * pageSize >= total} onPress={() => setPage((value) => value + 1)} />
        </View>
      ) : null}

      <Card style={styles.tip}>
        <Ionicons name="information-circle-outline" size={25} color={colors.blue} />
        <AppText variant="small" color={colors.textMuted} style={styles.tipCopy}>
          Abra uma pessoa para acompanhar autonomia, apoio em áudio e missões recentes.
        </AppText>
      </Card>
        </>
      )}
    </Screen>
  );
}

function formatUpdatedAt(value: Date | null) {
  return value ? value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'agora';
}

function ParticipantCard({ participant, onPress }: { participant: ClassParticipant; onPress: () => void }) {
  const needsAttention = participant.attemptCount > 0 && participant.progress < 55;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${participant.name}, ${participant.progress}% de progresso, ${participant.audio}% de uso de áudio`}
      accessibilityHint="Abre os detalhes do participante"
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.cardPressed]}
    >
      <Card style={styles.participantCard}>
        <View style={styles.personRow}>
          <View style={[styles.avatar, needsAttention && styles.avatarAttention]}>
            <AppText weight="800" color={needsAttention ? '#8A6000' : colors.primary}>{participant.initials}</AppText>
          </View>
          <View style={styles.personCopy}>
            <AppText weight="800">{participant.name}</AppText>
            <View style={styles.tagRow}>
              <Tag label={participant.attemptCount === 0 ? 'Sem atividade' : needsAttention ? 'Acompanhar' : 'Avançando bem'} tone={needsAttention ? 'yellow' : participant.attemptCount === 0 ? 'gray' : 'green'} />
              {participant.completedAttemptCount > 0 ? <Tag label={`Nota ${participant.score}`} tone="gray" /> : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.iconMuted} />
        </View>

        <View style={styles.metricBlock}>
          <View style={styles.metricHeading}>
            <AppText variant="small" weight="700">Progresso geral</AppText>
            <AppText variant="small" weight="800" color={colors.primary}>{participant.progress}%</AppText>
          </View>
          <ProgressBar value={participant.progress} color={needsAttention ? colors.warning : colors.success} />
        </View>

        <View style={styles.audioRow}>
          <Ionicons name="volume-high-outline" size={20} color={colors.blue} />
          <AppText variant="small" color={colors.textMuted} style={styles.audioCopy}>
            Apoio em áudio usado em {participant.audio}% das atividades
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
    borderColor: colors.primaryMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  searchInput: { color: colors.text, flex: 1, fontFamily: type.family, fontSize: type.body, minHeight: 50 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  sort: { borderBottomColor: colors.border, borderBottomWidth: 2, minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
  sortSelected: { borderBottomColor: colors.primary },
  pressed: { opacity: 0.68 },
  resultHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  list: { gap: spacing.md },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  participantCard: { backgroundColor: '#FFFDFB', borderColor: colors.primaryMuted, gap: spacing.md },
  cardPressed: { opacity: 0.72, transform: [{ scale: 0.992 }] },
  personRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  avatarAttention: { backgroundColor: colors.warningSoft },
  personCopy: { flex: 1, gap: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  metricBlock: { gap: spacing.sm },
  metricHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  audioRow: { alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: radius.sm, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  audioCopy: { flex: 1 },
  emptyState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 56, justifyContent: 'center', width: 56 },
  center: { textAlign: 'center' },
  tip: { alignItems: 'center', backgroundColor: colors.blueSoft, borderColor: '#CCDDF8', flexDirection: 'row', gap: spacing.md },
  tipCopy: { flex: 1 },
});
