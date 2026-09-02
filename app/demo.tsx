import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, Tag } from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';

type DemoMission = {
  id: string;
  title: string;
  category: string;
  difficulty: 'Fácil' | 'Média' | 'Difícil';
  duration: string;
  summary: string;
  accent: string;
};

const missions: DemoMission[] = [
  {
    id: 'pix',
    title: 'Fazer um Pix seguro',
    category: 'Financeiro',
    difficulty: 'Média',
    duration: '8 min',
    summary: 'Você aprende a verificar a chave Pix, conferir o valor e confirmar apenas depois de revisar os dados.',
    accent: '#4a2d7b',
  },
  {
    id: 'whatsapp',
    title: 'Enviar uma foto pelo WhatsApp',
    category: 'Comunicação',
    difficulty: 'Fácil',
    duration: '6 min',
    summary: 'A missão mostra como anexar uma imagem, revisar o contato e enviar somente para o destino certo.',
    accent: '#1DBB4F',
  },
  {
    id: 'localizacao',
    title: 'Compartilhar localização',
    category: 'Segurança digital',
    difficulty: 'Difícil',
    duration: '7 min',
    summary: 'Você pratica o cuidado ao compartilhar localização e evita enviar dados sensíveis para qualquer pessoa.',
    accent: '#4A90E2',
  },
];

export default function DemoScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>('pix');

  const selected = useMemo<DemoMission>(() => {
    return missions.find((mission) => mission.id === selectedId) ?? {
      id: 'pix',
      title: 'Fazer um Pix seguro',
      category: 'Financeiro',
      difficulty: 'Média',
      duration: '8 min',
      summary: 'Você aprende a verificar a chave Pix, conferir o valor e confirmar apenas depois de revisar os dados.',
      accent: '#4a2d7b',
    };
  }, [selectedId]);

  return (
    <Screen contentStyle={styles.content}>
      <Header title="Missões de demonstração" subtitle="Ambiente local e sem dados reais" onBack={() => router.replace('/login')} />
      <Tag label="Modo seguro de teste" tone="green" />

      <Card style={styles.headerCard}>
        <AppText variant="caption" weight="800" color={colors.primary}>MISSÃO ATIVA</AppText>
        <AppText variant="heading" weight="800">{selected.title}</AppText>
        <AppText variant="small" color={colors.textMuted}>{selected.summary}</AppText>
      </Card>

      <View style={styles.list}>
        {missions.map((mission) => (
          <Pressable
            key={mission.id}
            accessibilityRole="button"
            onPress={() => setSelectedId(mission.id)}
            style={({ pressed }) => [
              styles.missionCard,
              selected.id === mission.id && styles.missionCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.missionAccent, { backgroundColor: mission.accent }]} />
            <View style={styles.missionBody}>
              <View style={styles.missionHeader}>
                <AppText variant="subheading" weight="800">{mission.title}</AppText>
                <Tag label={mission.difficulty} tone={mission.difficulty === 'Fácil' ? 'green' : mission.difficulty === 'Média' ? 'purple' : 'yellow'} />
              </View>

              <AppText variant="small" color={colors.textMuted}>{mission.category}</AppText>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.iconMuted} />
                  <AppText variant="small" color={colors.textMuted}>{mission.duration}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
                  <AppText variant="small" color={colors.textMuted}>Simulação</AppText>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Card style={styles.detailCard}>
        <AppText variant="caption" weight="800" color={colors.primary}>{selected.category.toUpperCase()}</AppText>
        <AppText variant="heading" weight="800">Resumo da missão</AppText>
        <AppText variant="small" color={colors.textMuted}>{selected.summary}</AppText>

        <View style={styles.detailActions}>
          <Button label="Iniciar missão" onPress={() => router.push('/participant/mission-details')} />
          <Button label="Voltar" variant="secondary" onPress={() => router.replace('/login')} />
        </View>
      </Card>

      <AppText variant="small" color={colors.textMuted} style={styles.note}>
        Este modo não usa conta real, banco ou Google. Ele só simula a jornada da missão para validar o fluxo visual e a navegação.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  headerCard: { gap: spacing.sm },
  list: { gap: spacing.md },
  missionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 120,
    padding: spacing.md,
  },
  missionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F9F3FF',
  },
  missionAccent: {
    borderRadius: radius.lg,
    height: 72,
    width: 8,
  },
  missionBody: { flex: 1, gap: spacing.sm },
  missionHeader: { alignItems: 'flex-start', gap: spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  detailCard: { gap: spacing.md },
  detailActions: { flexDirection: 'row', gap: spacing.md },
  note: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
