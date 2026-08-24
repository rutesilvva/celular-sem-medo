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

export const monitorMissions = [
  { title: 'Enviar uma foto', completion: 78, difficulty: 22, audio: 61, status: 'Ativa' },
  { title: 'Conferir um Pix', completion: 54, difficulty: 48, audio: 79, status: 'Ativa' },
  { title: 'Compartilhar localização', completion: 37, difficulty: 37, audio: 72, status: 'Planejada' },
] as const;
