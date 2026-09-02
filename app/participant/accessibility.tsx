import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, SwitchRow } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantAccessibilityScreen() {
  const router = useRouter();
  const { preferences, setPreference, showNotice } = useApp();
  const { completeParticipantOnboarding } = useAuth();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const saved = await completeParticipantOnboarding(preferences);
    if (saved) {
      showNotice('Preferências salvas');
      router.dismissAll();
      router.replace('/participant/home');
    } else {
      showNotice('Não foi possível salvar. Verifique sua conexão e tente novamente.');
    }
    setSaving(false);
  };

  return (
    <Screen contentStyle={styles.content}>
      <Header
        title="Vamos personalizar"
        subtitle="Sua experiência"
        onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/welcome')}
        audio
      />

      <View style={styles.intro}>
        <AppText variant="subheading" weight="800" style={styles.center}>
          Ajuste a experiência para o seu jeito de usar o celular.
        </AppText>
        <AppText variant="small" color={colors.textMuted} style={styles.center}>
          Você pode alterar isso depois em Perfil e configurações.
        </AppText>
      </View>

      <Card style={styles.settings}>
        <SwitchRow
          title="Tamanho do texto"
          description="Médio"
          icon="text-outline"
          value={preferences.largerText}
          onValueChange={(value) => setPreference('largerText', value)}
        />
        <View style={styles.divider} />
        <View style={styles.rateSetting}>
          <View style={styles.rateCopy}>
            <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
            <View style={styles.flex}>
              <AppText weight="800">Velocidade da voz</AppText>
              <AppText variant="small" color={colors.textMuted}>Escolha o ritmo mais confortável</AppText>
            </View>
          </View>
          <View style={styles.rateOptions}>
            {[0.75, 0.9, 1.05].map((rate) => <Button key={rate} label={rate === 0.75 ? 'Lenta' : rate === 0.9 ? 'Normal' : 'Rápida'} variant={preferences.audioRate === rate ? 'primary' : 'secondary'} onPress={() => setPreference('audioRate', rate)} />)}
          </View>
        </View>
        <View style={styles.divider} />
        <SwitchRow
          title="Ouvir instruções em voz alta"
          description="Ative para ouvir as instruções"
          icon="volume-high-outline"
          value={preferences.autoAudio}
          onValueChange={(value) => setPreference('autoAudio', value)}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Contraste"
          description="Padrão"
          icon="contrast-outline"
          value={preferences.highContrast}
          onValueChange={(value) => setPreference('highContrast', value)}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Resposta por voz"
          description="Opcional"
          icon="mic-outline"
          value={preferences.voiceResponse}
          onValueChange={(value) => setPreference('voiceResponse', value)}
        />
        <View style={styles.divider} />
        <SwitchRow title="Reduzir movimentos" description="Evita animações e efeitos de escala" icon="remove-circle-outline" value={preferences.reduceMotion} onValueChange={(value) => setPreference('reduceMotion', value)} />
        <View style={styles.divider} />
        <SwitchRow title="Vibração de confirmação" description="Resposta tátil ao tocar nos botões" icon="phone-portrait-outline" value={preferences.hapticFeedback} onValueChange={(value) => setPreference('hapticFeedback', value)} />
        <View style={styles.divider} />
        <SwitchRow title="Repetir instruções" description="Repete automaticamente cada instrução uma vez" icon="repeat-outline" value={preferences.repeatInstructions} onValueChange={(value) => setPreference('repeatInstructions', value)} />
      </Card>

      <View
        accessibilityLabel={`Exemplo de leitura${preferences.largerText ? ' com letras maiores' : ''}${preferences.highContrast ? ' e alto contraste' : ''}`}
        style={[styles.preview, preferences.highContrast && styles.previewContrast]}
      >
        <Ionicons name="eye-outline" size={24} color={preferences.highContrast ? colors.surface : colors.primary} />
        <AppText
          weight="700"
          color={preferences.highContrast ? colors.surface : colors.text}
          style={preferences.largerText ? styles.previewLargeText : undefined}
        >
          Assim ficará mais fácil acompanhar cada passo.
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          label={saving ? 'Salvando…' : 'Salvar e começar'}
          icon="checkmark"
          accessibilityHint="Salva as preferências e abre a tela inicial de aprendizagem"
          onPress={save}
          disabled={saving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  intro: { alignItems: 'center', gap: spacing.sm },
  center: { textAlign: 'center' },
  settings: { backgroundColor: '#FFFDFB', borderColor: colors.primaryMuted, gap: 0, paddingVertical: spacing.sm },
  divider: { backgroundColor: colors.border, height: 1 },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  previewContrast: { backgroundColor: colors.primaryDark },
  previewLargeText: { fontSize: 20, lineHeight: 28 },
  actions: { gap: spacing.md },
  rateSetting: { gap: spacing.md, paddingVertical: spacing.md },
  rateCopy: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  rateOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
});
