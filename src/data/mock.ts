export const participantMissions = [
  {
    id: 'send-photo',
    title: 'Enviar uma foto',
    category: 'Mensagens',
    duration: '5 min',
    difficulty: 'Fácil',
    icon: 'image-outline' as const,
    status: 'Recomendada',
  },
  {
    id: 'check-pix',
    title: 'Conferir um Pix',
    category: 'Segurança digital',
    duration: '7 min',
    difficulty: 'Média',
    icon: 'shield-checkmark-outline' as const,
    status: 'Em breve',
  },
  {
    id: 'share-location',
    title: 'Compartilhar localização',
    category: 'Mensagens',
    duration: '7 min',
    difficulty: 'Média',
    icon: 'location-outline' as const,
    status: 'Em breve',
  },
] as const;

export type ParticipantRecord = {
  id: string;
  name: string;
  progress: number;
  audio: number;
  score: string;
  initials: string;
  autonomy: number;
  completedMissions: number;
  difficultyTitle: string;
  difficultyDescription: string;
};

export const participants: readonly ParticipantRecord[] = [
  {
    id: 'maria',
    name: 'Maria Aparecida',
    progress: 72,
    audio: 81,
    score: '4,6',
    initials: 'MA',
    autonomy: 68,
    completedMissions: 3,
    difficultyTitle: 'Encontrar o botão de anexo',
    difficultyDescription: 'Pediu apoio visual ao praticar como enviar uma foto.',
  },
  {
    id: 'jose',
    name: 'José Carlos',
    progress: 64,
    audio: 55,
    score: '4,1',
    initials: 'JC',
    autonomy: 62,
    completedMissions: 3,
    difficultyTitle: 'Compartilhar localização',
    difficultyDescription: 'Precisou repetir a etapa de escolher por quanto tempo compartilhar.',
  },
  {
    id: 'ana',
    name: 'Ana Lúcia',
    progress: 48,
    audio: 92,
    score: '3,8',
    initials: 'AL',
    autonomy: 45,
    completedMissions: 2,
    difficultyTitle: 'Conferir antes de confirmar',
    difficultyDescription: 'Ainda precisa de apoio para revisar os dados de um Pix de treino.',
  },
];

export const monitorMissions = [
  { title: 'Enviar uma foto', completion: 78, difficulty: 22, audio: 61, status: 'Ativa' },
  { title: 'Conferir um Pix', completion: 54, difficulty: 48, audio: 79, status: 'Ativa' },
  { title: 'Compartilhar localização', completion: 37, difficulty: 37, audio: 72, status: 'Planejada' },
] as const;
