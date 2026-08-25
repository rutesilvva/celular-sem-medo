export const helpStatusLabels = { open: 'Novo', in_progress: 'Em atendimento', resolved: 'Resolvido', cancelled: 'Cancelado' } as const;
export const helpReasonLabels = { stuck_step: 'Dificuldade neste passo', needs_explanation: 'Preciso de outra explicação', accessibility_support: 'Preciso de apoio de acessibilidade' } as const;
export const helpResolutionLabels = {
  review_hint: 'O monitor orientou revisar a dica e tentar novamente.',
  try_again: 'O monitor orientou refazer o passo com calma.',
  scheduled_support: 'O monitor vai combinar um momento de apoio.',
  guided_by_monitor: 'O monitor informou que a orientação foi realizada.',
} as const;
