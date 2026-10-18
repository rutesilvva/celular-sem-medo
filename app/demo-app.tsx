import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, ProgressBar, SectionTitle, SwitchRow, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { publicDemoMissions } from '@/features/public-demo/catalog';
import { clearPublicDemoProgress, readPublicDemoProgress, type PublicDemoProgress } from '@/features/public-demo/progress';
import { colors, radius, spacing } from '@/theme/tokens';

export default function PublicParticipantDemoScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { preferences, setPreference, showNotice } = useApp();
  const [progress, setProgress] = useState<PublicDemoProgress>({ completedMissionKeys: [], updatedAt: null });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const showingProgress = section === 'progress';
  const showingProfile = section === 'profile';
  const showingMissions = section === 'missions';
  const categories = useMemo(() => ['Todas', ...new Set(publicDemoMissions.map((mission) => mission.details.category))], []);
  const filteredMissions = useMemo(() => publicDemoMissions.filter((mission) => {
    const matchesCategory = category === 'Todas' || mission.details.category === category;
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = !term || `${mission.details.title} ${mission.details.summary} ${mission.details.category}`.toLocaleLowerCase('pt-BR').includes(term);
    return matchesCategory && matchesSearch;
  }), [category, search]);
  const displayedMissions = showingMissions ? filteredMissions : publicDemoMissions.slice(0, 3);

  useEffect(() => { void readPublicDemoProgress().then(setProgress); }, [section]);

  if (showingProfile) {
    return <Screen footer={<ParticipantNav active="profile" publicDemo />} contentStyle={styles.content}>
      <Header title="Perfil e configurações" subtitle="Deixe a demonstração do seu jeito." onBack={() => router.replace('/demo-app')} />
      <Card style={styles.profileCard}><View style={styles.profileAvatar}><Ionicons name="person" size={36} color={colors.surface} /></View><View style={styles.flex}><AppText variant="subheading" weight="800">Visitante</AppText><AppText variant="small" color={colors.textMuted}>Modo público · nenhuma conta conectada</AppText></View></Card>
      <SectionTitle>Acessibilidade</SectionTitle>
      <Card style={styles.settingsCard}>
        <SwitchRow title="Letras maiores" description="Aumenta os textos em todas as telas." icon="text-outline" value={preferences.largerText} onValueChange={(value) => setPreference('largerText', value)} />
        <View style={styles.divider} />
        <SwitchRow title="Alto contraste" description="Reforça a leitura dos textos." icon="contrast-outline" value={preferences.highContrast} onValueChange={(value) => setPreference('highContrast', value)} />
        <View style={styles.divider} />
        <SwitchRow title="Reduzir movimentos" description="Evita animações e efeitos de escala." icon="remove-circle-outline" value={preferences.reduceMotion} onValueChange={(value) => setPreference('reduceMotion', value)} />
        <View style={styles.divider} />
        <SwitchRow title="Vibração de confirmação" description="Dá uma resposta tátil ao tocar." icon="phone-portrait-outline" value={preferences.hapticFeedback} onValueChange={(value) => setPreference('hapticFeedback', value)} />
        <View style={styles.divider} />
        <SwitchRow title="Repetir instruções" description="Repete uma vez o áudio solicitado." icon="repeat-outline" value={preferences.repeatInstructions} onValueChange={(value) => setPreference('repeatInstructions', value)} />
      </Card>
      <Card style={styles.voiceCard}><AppText variant="subheading" weight="800">Velocidade da voz</AppText><AppText variant="small" color={colors.textMuted}>O áudio só começa quando você toca no símbolo de som.</AppText><View style={styles.rateOptions}>{[0.75, 0.9, 1.05].map((rate) => <Button key={rate} label={rate === 0.75 ? 'Lenta' : rate === 0.9 ? 'Normal' : 'Rápida'} variant={preferences.audioRate === rate ? 'primary' : 'secondary'} onPress={() => setPreference('audioRate', rate)} />)}</View><AudioButton label="Testar o áudio" message="Olá. Esta é uma instrução de teste do Celular Sem Medo." /></Card>
      <Card style={styles.disclosure}><Ionicons name="shield-checkmark-outline" size={27} color={colors.success} /><AppText style={styles.flex}>Essas preferências funcionam nesta demonstração sem login e não são enviadas ao servidor.</AppText></Card>
      <Button label="Voltar à apresentação" variant="secondary" icon="information-circle-outline" onPress={() => router.replace('/demo')} />
    </Screen>;
  }

  if (showingProgress) {
    const completedCount = progress.completedMissionKeys.length;
    const percentage = Math.round((completedCount / publicDemoMissions.length) * 100);
    return <Screen footer={<ParticipantNav active="progress" publicDemo />} contentStyle={styles.content}>
      <Header title="Seu progresso" subtitle="Registrado somente neste aparelho" onBack={() => router.replace('/demo-app')} />
      <Card style={styles.disclosure}><Ionicons name="information-circle-outline" size={26} color={colors.primary} /><AppText style={styles.flex}>Este número é calculado pelas missões que você realmente concluiu nesta demonstração. Não representa pesquisa nem dados de outras pessoas.</AppText></Card>
      <Card style={styles.progressCard}><AppText variant="subheading" weight="800">{completedCount ? 'Continue praticando no seu ritmo' : 'Comece sua primeira missão'}</AppText><AppText color={colors.textMuted}>O progresso fica apenas neste navegador e não é enviado ao servidor.</AppText><ProgressBar value={percentage} /><AppText variant="small" weight="800" color={colors.primary}>{completedCount} de {publicDemoMissions.length} missões concluídas · {percentage}%</AppText></Card>
      {completedCount ? <Card style={styles.completedCard}><AppText weight="800">Missões concluídas neste aparelho</AppText>{publicDemoMissions.filter((mission) => progress.completedMissionKeys.includes(mission.key)).map((mission) => <View key={mission.key} style={styles.completedRow}><Ionicons name="checkmark-circle" size={23} color={colors.success} /><AppText style={styles.flex}>{mission.details.title}</AppText></View>)}</Card> : null}
      <Button label="Escolher uma missão" icon="flag-outline" onPress={() => router.replace({ pathname: '/demo-app', params: { section: 'missions' } })} />
      {completedCount ? <Button label="Limpar progresso deste aparelho" icon="trash-outline" variant="secondary" onPress={() => { void clearPublicDemoProgress().then(() => { setProgress({ completedMissionKeys: [], updatedAt: null }); showNotice('Progresso local apagado'); }); }} /> : null}
    </Screen>;
  }

  return (
    <Screen footer={<ParticipantNav active={showingMissions ? 'missions' : 'home'} publicDemo />} contentStyle={styles.content}>
      <Header title="Celular Sem Medo" subtitle="Experiência real do participante · dados fictícios" onBack={() => router.replace('/demo')} />
      <View style={styles.headerRow}><View style={styles.flex}><AppText variant="small" color={colors.textMuted}>Olá,</AppText><AppText variant="heading" weight="800" color={colors.primary}>Visitante</AppText></View><AudioButton compact label="Ouvir orientação" message="Esta é a mesma experiência usada pelo participante. Escolha uma missão e pratique passo a passo, sem usar dados reais." /></View>
      <Card style={styles.disclosure}><Ionicons name="shield-checkmark-outline" size={28} color={colors.success} /><View style={styles.flex}><AppText weight="800">Demonstração segura</AppText><AppText variant="small" color={colors.textMuted}>Você verá as mesmas telas, perguntas, alertas e instruções do aplicativo. Nenhum progresso será associado a uma conta.</AppText></View></Card>
      {!showingMissions ? <Card style={styles.welcomeCard}><Tag label="COMECE POR AQUI" tone="purple" /><AppText variant="heading" weight="800">Pratique no seu ritmo</AppText><AppText>Escolha uma situação do cotidiano. Você pode errar, receber uma explicação e tentar novamente.</AppText><Button label="Descobrir por onde começar" icon="compass-outline" onPress={() => router.push('/demo-diagnostic')} /><Button label="Começar pela missão Pix" variant="secondary" icon="arrow-forward" onPress={() => router.push({ pathname: '/demo-mission-details', params: { mission: 'pix' } })} /></Card> : null}
      {showingMissions ? <Card style={styles.searchCard}><View style={styles.searchField}><Ionicons name="search" size={23} color={colors.iconMuted} /><TextInput accessibilityLabel="Buscar missão" onChangeText={setSearch} placeholder="O que você quer aprender?" placeholderTextColor={colors.placeholder} style={styles.searchInput} value={search} /></View><View style={styles.categoryList}>{categories.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item === category }} key={item} onPress={() => setCategory(item)} style={[styles.categoryChip, item === category && styles.categoryChipActive]}><AppText variant="small" weight="800" color={item === category ? colors.surface : colors.primary}>{item}</AppText></Pressable>)}</View></Card> : null}
      <SectionTitle action={!showingMissions ? <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/demo-app', params: { section: 'missions' } })}><AppText variant="small" weight="800" color={colors.primary}>Ver todas</AppText></Pressable> : undefined}>{showingMissions ? 'Todas as missões' : 'Missões recomendadas'}</SectionTitle>
      <View style={styles.list}>
        {displayedMissions.map((mission) => <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${mission.details.title}. ${mission.details.estimatedMinutes} minutos.`}
          accessibilityHint="Abre os detalhes da missão"
          key={mission.key}
          onPress={() => router.push({ pathname: '/demo-mission-details', params: { mission: mission.key } })}
          style={({ pressed }) => [styles.missionCard, pressed && styles.pressed]}
        >
          <View style={styles.icon}><Ionicons name={mission.icon} size={30} color={colors.primary} /></View>
          <View style={styles.flex}><AppText variant="subheading" weight="800">{mission.details.title}</AppText><AppText variant="small" color={colors.textMuted}>{mission.details.summary}</AppText><View style={styles.meta}><Tag label={`${mission.details.estimatedMinutes} min`} tone="purple" /><Tag label={mission.details.difficulty === 'easy' ? 'Fácil' : 'Média'} tone="green" />{progress.completedMissionKeys.includes(mission.key) ? <Tag label="Concluída" tone="green" /> : null}</View></View>
          <Ionicons name="chevron-forward" size={25} color={colors.primary} />
        </Pressable>)}
        {showingMissions && !displayedMissions.length ? <Card><AppText weight="800">Nenhuma missão encontrada</AppText><AppText variant="small" color={colors.textMuted}>Tente outra palavra ou escolha “Todas”.</AppText></Card> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  disclosure: { alignItems: 'flex-start', backgroundColor: colors.successSoft, borderColor: colors.success, flexDirection: 'row', gap: spacing.md },
  welcomeCard: { backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, gap: spacing.md },
  progressCard: { gap: spacing.md },
  completedCard: { gap: spacing.md },
  completedRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  profileCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, flexDirection: 'row', gap: spacing.md },
  profileAvatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 999, height: 64, justifyContent: 'center', width: 64 },
  settingsCard: { gap: 0, paddingVertical: spacing.sm },
  divider: { backgroundColor: colors.border, height: 1 },
  voiceCard: { gap: spacing.md },
  rateOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  searchCard: { gap: spacing.md },
  searchField: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingHorizontal: spacing.md },
  searchInput: { color: colors.text, flex: 1, fontSize: 18, minHeight: 52 },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: { borderColor: colors.primary, borderRadius: 999, borderWidth: 1.5, minHeight: 46, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  categoryChipActive: { backgroundColor: colors.primary },
  list: { gap: spacing.md },
  missionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 126, padding: spacing.lg },
  icon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, height: 58, justifyContent: 'center', width: 58 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
});
