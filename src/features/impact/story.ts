export type ImpactComparison = { label: string; before: number; after: number; suffix?: string; lowerIsBetter?: boolean };

export type EvolutionEvent = {
  title: string; category: string; confidence_before: number; confidence_after: number;
  confidence_gain: number; autonomous: boolean; help_count: number; occurred_at: string;
};

export function describeImpactChange(item: ImpactComparison) {
  const delta = item.after - item.before;
  const improved = item.lowerIsBetter ? delta < 0 : delta > 0;
  const unchanged = delta === 0;
  return {
    delta,
    tone: unchanged ? 'neutral' as const : improved ? 'positive' as const : 'attention' as const,
    label: unchanged ? 'Sem mudança' : `${improved ? 'Melhora' : 'Atenção'}: ${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}${item.suffix ?? ''}`,
  };
}

export function buildEvolutionStory(event: EvolutionEvent) {
  return {
    confidence: event.confidence_after ? `A confiança passou de ${event.confidence_before} para ${event.confidence_after}.` : 'A confiança final ainda não foi registrada.',
    practice: `Praticou ${event.title} em um ambiente seguro.`,
    autonomy: event.autonomous ? 'Concluiu com autonomia, sem pedir ajuda.' : `Concluiu usando ${event.help_count} ${event.help_count === 1 ? 'apoio' : 'apoios'}.`,
    competence: `Fortaleceu a competência de ${event.category.toLocaleLowerCase('pt-BR')}.`,
  };
}

export const competitionDemoSteps = [
  { key: 'diagnostic', title: 'Diagnóstico acessível', text: 'Ana prefere áudio, letras maiores e quer aprender Pix com segurança.', metric: '7 perguntas · 2 min', icon: 'options-outline' },
  { key: 'request', title: 'Pedido livre', text: 'Ana escreve “quero aprender a fazer um Pix” e recebe uma recomendação explicável.', metric: 'Necessidade real', icon: 'chatbubble-ellipses-outline' },
  { key: 'mission', title: 'Missão personalizada', text: 'Ela pratica destinatário e valor em uma simulação que não movimenta dinheiro.', metric: 'Ambiente protegido', icon: 'shield-checkmark-outline' },
  { key: 'evolution', title: 'Evolução comprovada', text: 'A confiança passa de 2 para 4 e a missão termina sem pedido de ajuda.', metric: '+2 confiança', icon: 'trending-up-outline' },
  { key: 'impact', title: 'Impacto da oficina', text: 'A turma alcança 78% de autonomia e reduz pedidos de ajuda em 50%.', metric: 'Evidência agregada', icon: 'bar-chart-outline' },
] as const;

export const COMPETITION_DEMO_TARGET_SECONDS = 180;
