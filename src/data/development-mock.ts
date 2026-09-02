export type DevelopmentAdminMission = {
  title: string;
  completion: number;
  difficulty: number;
  audio: number;
  status: 'Ativa' | 'Planejada';
};

const enabled = process.env.EXPO_PUBLIC_APP_ENV === 'development'
  && process.env.EXPO_PUBLIC_ENABLE_DEVELOPMENT_MOCKS === 'true';

export const developmentAdminMissions: readonly DevelopmentAdminMission[] = enabled ? [
  { title: 'Enviar uma foto', completion: 78, difficulty: 22, audio: 61, status: 'Ativa' },
  { title: 'Conferir um Pix', completion: 54, difficulty: 48, audio: 79, status: 'Ativa' },
  { title: 'Compartilhar localização', completion: 37, difficulty: 37, audio: 72, status: 'Planejada' },
] : [];
