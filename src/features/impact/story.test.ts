import { buildEvolutionStory, competitionDemoSteps, describeImpactChange } from './story';

describe('impact storytelling', () => {
  it('treats fewer help requests as an improvement', () => {
    expect(describeImpactChange({ label: 'Ajuda', before: 6, after: 2, lowerIsBetter: true })).toMatchObject({ tone: 'positive', label: 'Melhora: −4.0' });
  });
  it('describes evolution in plain language', () => {
    expect(buildEvolutionStory({ title: 'Pix seguro', category: 'Segurança', confidence_before: 2, confidence_after: 4, confidence_gain: 2, autonomous: true, help_count: 0, occurred_at: '2026-09-07T00:00:00Z' })).toEqual({
      confidence: 'A confiança passou de 2 para 4.', practice: 'Praticou Pix seguro em um ambiente seguro.', autonomy: 'Concluiu com autonomia, sem pedir ajuda.', competence: 'Fortaleceu a competência de segurança.',
    });
  });
  it('keeps the demo deterministic', () => {
    expect(competitionDemoSteps.map((step) => step.key)).toEqual(['diagnostic', 'request', 'mission', 'evolution', 'impact']);
  });
});
