import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText, AudioButton, Button, Card, Header, SwitchRow } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ParticipantAccessibilityScreen() {
  const router = useRouter();
  const { completeParticipantOnboarding, preferences, setPreference, showNotice } = useApp();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const saved = await completeParticipantOnboarding();
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
        title="Do seu jeito"
        subtitle="Ajuste como prefere aprender."
        onBack={() => router.canGoBack() ? router.back() : router.replace('/participant/welcome')}
        audio
      />

      <View style={styles.intro}>
        <View style={styles.accessibilityIcon}>
          <Ionicons name="accessibility" size={38} color={colors.primary} />
        </View>
        <AppText variant="subheading" weight="800" style={styles.center}>
          O que deixa a leitura mais confortável para você?
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          Você poderá mudar essas escolhas depois no seu perfil.
        </AppText>
      </View>

      <Card style={styles.settings}>
        <SwitchRow
          title="Letras maiores"
          description="Aumenta o destaque dos textos importantes."
          icon="text-outline"
          value={preferences.largerText}
          onValueChange={(value) => setPreference('largerText', value)}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Alto contraste"
          description="Reforça a diferença entre fundo e conteúdo."
          icon="contrast-outline"
          value={preferences.highContrast}
          onValueChange={(value) => setPreference('highContrast', value)}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Preferência de áudio automático"
          description="Configuração demonstrativa; o áudio real será integrado depois."
          icon="volume-high-outline"
          value={preferences.autoAudio}
          onValueChange={(value) => setPreference('autoAudio', value)}
        />
        <View style={styles.divider} />
        <SwitchRow
          title="Preferência de resposta por voz"
          description="Configuração demonstrativa; nenhuma fala é gravada nesta versão."
          icon="mic-outline"
          value={preferences.voiceResponse}
          onValueChange={(value) => setPreference('voiceResponse', value)}
        />
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
        <AudioButton
          label="Ouvir esta tela"
          message="Escolha letras maiores, alto contraste, instruções em áudio e resposta por voz. Você poderá mudar tudo depois."
        />
        <Button
          label={saving ? 'Salvando…' : 'Salvar e continuar'}
          icon="checkmark"
          accessibilityHint="Salva as preferências e abre a tela inicial"
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
  accessibilityIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.round,
    height: 68,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 68,
  },
  center: { textAlign: 'center' },
  settings: { gap: 0, paddingVertical: spacing.sm },
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
});
