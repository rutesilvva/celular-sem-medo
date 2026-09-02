import Ionicons from '@expo/vector-icons/Ionicons';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

type VoiceState = 'idle' | 'recording' | 'paused' | 'review' | 'error';

export function VoiceResponseRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(null);
  const [state, setState] = useState<VoiceState>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [message, setMessage] = useState('A gravação só começa quando você tocar no botão.');

  useEffect(() => () => { player.pause(); if (recordingUri) void FileSystem.deleteAsync(recordingUri, { idempotent: true }); }, [player, recordingUri]);
  useEffect(() => () => {
    player.pause();
    void recorder.stop().catch(() => undefined).then(() => {
      if (recorder.uri) return FileSystem.deleteAsync(recorder.uri, { idempotent: true });
      return undefined;
    });
  }, [player, recorder]);

  const start = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) { setMessage('Microfone não autorizado. Continue normalmente usando os botões da missão.'); setState('error'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
      setMessage('Gravando. Nenhum conteúdo foi enviado.');
    } catch { setState('error'); setMessage('Não foi possível iniciar. Você pode continuar usando os botões.'); }
  };

  const pause = () => { recorder.pause(); setState('paused'); setMessage('Gravação pausada.'); };
  const resume = () => { recorder.record(); setState('recording'); setMessage('Gravação retomada.'); };
  const finish = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('VOICE_FILE_UNAVAILABLE');
      setRecordingUri(uri); player.replace(uri); setState('review'); setMessage('Gravação pronta para revisar. Ela continua somente neste aparelho.');
    } catch { setState('error'); setMessage('Não foi possível concluir a gravação. Tente novamente ou use os botões.'); }
  };
  const remove = async () => {
    player.pause();
    if (recordingUri) await FileSystem.deleteAsync(recordingUri, { idempotent: true });
    setRecordingUri(null); setState('idle'); setMessage('Gravação apagada deste aparelho.');
  };

  return (
    <Card style={styles.card}>
      <View style={styles.heading}><Ionicons name="mic-outline" size={25} color={colors.primary} /><AppText weight="800">Testar resposta por voz</AppText></View>
      <AppText variant="small" color={state === 'error' ? colors.danger : colors.textMuted}>{message}</AppText>
      {(state === 'recording' || state === 'paused') ? <AppText accessibilityLiveRegion="polite" weight="800">{state === 'recording' ? '● Gravando' : 'Ⅱ Pausado'} · {Math.round(recorderState.durationMillis / 1000)} s</AppText> : null}
      <View style={styles.actions}>
        {state === 'idle' || state === 'error' ? <Button label="Começar gravação" icon="mic-outline" onPress={() => void start()} /> : null}
        {state === 'recording' ? <Button label="Pausar" variant="secondary" onPress={pause} /> : null}
        {state === 'paused' ? <Button label="Retomar" variant="secondary" onPress={resume} /> : null}
        {state === 'recording' || state === 'paused' ? <Button label="Parar e revisar" onPress={() => void finish()} /> : null}
        {state === 'review' ? <Button label="Ouvir gravação" icon="play-outline" onPress={() => player.play()} /> : null}
        {state === 'review' ? <Button label="Apagar gravação" icon="trash-outline" variant="secondary" onPress={() => void remove()} /> : null}
      </View>
      <AppText variant="caption" color={colors.textMuted}>A transcrição e o envio permanecem desativados até existir um serviço com retenção e segurança aprovadas.</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.md }, heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, actions: { gap: spacing.sm } });
