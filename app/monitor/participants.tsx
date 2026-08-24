import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MonitorNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { useMyClass, useMonitorParticipants } from '@/hooks/useClassData';
import type { ClassParticipant } from '@/lib/backend';
import { colors, radius, spacing, type } from '@/theme/tokens';

type FilterKey = 'all' | 'attention' | 'advancing';

const filters: readonly { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'attention', label: 'Precisam de atenção' },
  { key: 'advancing', label: 'Avançando bem' },
];

export default function ParticipantsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const classQuery = useMyClass('monitor');
  const participantsQuery = useMonitorParticipants(classQuery.data?.class_id ?? null);
  const participants = useMemo(() => participantsQuery.data ?? [], [participantsQuery.data]);

  const visibleParticipants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return participants.filter((participant) => {
      const matchesQuery = !normalizedQuery || participant.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery);
      const matchesFilter = filter === 'all'
        || (filter === 'attention' && participant.progress < 55)
        || (filter === 'advancing' && participant.progress >= 55);
      return matchesQuery && matchesFilter;
    }).sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
  }, [filter, participants, query]);

  const openParticipant = (participant: ClassParticipant) => {
    router.push({ pathname: '/monitor/participant-details', params: { id: participant.id } });
  };

  return (
    <Screen footer={<MonitorNav active="participants" />}>
      <Header
        title="Participantes"
        subtitle={classQuery.data
          ? `${classQuery.data.class_name} • ${participants.length} ${participants.length === 1 ? 'pessoa' : 'pessoas'}`
          : 'Carregando turma…'}
        audio
      />

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
        <DataState kind="empty" title="Nenhuma turma vinculada" message="Peça à administração para cadastrar seu vínculo de monitor." />
      ) : participants.length === 0 ? (
        <DataState kind="empty" title="Turma sem participantes" message="Envie um convite para adicionar a primeira pessoa à turma." />
      ) : (
        <>

      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={23} color={colors.iconMuted} />
        <TextInput
          accessibilityLabel="Buscar participante pelo nome"
          autoCapitalize="words"
          onChangeText={setQuery}
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
            onPress={() => setQuery('')}
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
              onPress={() => setFilter(item.key)}
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

      <View style={styles.resultHeading}>
        <AppText variant="subheading" weight="800">
          {visibleParticipants.length === 1 ? '1 participante' : `${visibleParticipants.length} participantes`}
        </AppText>
        <AppText variant="small" color={colors.textMuted}>Ordenados por nome</AppText>
      </View>

      <View style={styles.list}>
        {visibleParticipants.map((participant) => (
          <ParticipantCard key={participant.id} participant={participant} onPress={() => openParticipant(participant)} />
        ))}

        {visibleParticipants.length === 0 ? (
          <Card style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={29} color={colors.primary} />
            </View>
            <AppText weight="800" style={styles.center}>Nenhum participante encontrado</AppText>
            <AppText variant="small" color={colors.textMuted} style={styles.center}>
              Tente outro nome ou selecione um filtro diferente.
            </AppText>
          </Card>
        ) : null}
      </View>

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

function ParticipantCard({ participant, onPress }: { participant: ClassParticipant; onPress: () => void }) {
  const needsAttention = participant.progress < 55;
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
              <Tag label={needsAttention ? 'Acompanhar' : 'Avançando bem'} tone={needsAttention ? 'yellow' : 'green'} />
              <Tag label={`Nota ${participant.score}`} tone="gray" />
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1.5,
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
  pressed: { opacity: 0.68 },
  resultHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  list: { gap: spacing.md },
  participantCard: { gap: spacing.md },
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
