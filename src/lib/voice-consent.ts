import AsyncStorage from '@react-native-async-storage/async-storage';

export type VoiceConsentState = 'not_requested' | 'requested' | 'accepted' | 'declined';

const KEY = 'csm-voice-consent-v1';

export async function getVoiceConsentState(): Promise<VoiceConsentState> {
  const value = await AsyncStorage.getItem(KEY);
  return value === 'requested' || value === 'accepted' || value === 'declined' ? value : 'not_requested';
}

export async function setVoiceConsentState(next: VoiceConsentState) {
  await AsyncStorage.setItem(KEY, next);
}

export function createVoiceConsentMessage() {
  return 'Para responder por voz, o aplicativo precisará usar o microfone. A gravação só começa após um toque seu e poderá ser cancelada e apagada antes do envio.';
}
