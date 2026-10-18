import { getPublicDemoMission, publicDemoMissions } from './catalog';
import { initialMissionRunState, isExpectedAction, missionRunReducer, type MissionAction } from '@/features/mission-engine/executor';

describe('catálogo público de missões', () => {
  it('oferece as dez missões publicadas no aplicativo', () => {
    expect(publicDemoMissions).toHaveLength(10);
    expect(publicDemoMissions.map((mission) => mission.key)).toEqual([
      'photo',
      'pix',
      'location',
      'fake-family',
      'scam-message',
      'mobility',
      'download-app',
      'shopping',
      'fake-bank',
      'gov-br',
    ]);
  });

  it('mantém dados fictícios locais e conteúdo para iniciar cada missão', () => {
    for (const mission of publicDemoMissions) {
      expect(mission.details.assignmentId).toBe(`public-demo-${mission.key}`);
      expect(mission.steps.length).toBeGreaterThan(0);
      expect(mission.learningGoals.length).toBeGreaterThan(0);
    }
  });

  it('encontra a missão de compras pelo endereço público', () => {
    expect(getPublicDemoMission('shopping').details.title).toBe('Simular uma compra na Shopee');
  });

  it('mantém cada alternativa correta presente nas opções da etapa', () => {
    for (const mission of publicDemoMissions) {
      for (const step of mission.steps) {
        const expected = step.expectedAction as { action: MissionAction['action']; target?: string; option_id?: string };
        if (expected.option_id) expect(Array.isArray(step.options) && step.options.some((option) => typeof option === 'object' && option !== null && !Array.isArray(option) && option.id === expected.option_id)).toBe(true);
        expect(isExpectedAction(expected, { action: expected.action, target: expected.target, optionId: expected.option_id })).toBe(true);
      }
    }
  });

  it('conclui cada sequência pública ao receber as ações esperadas', () => {
    for (const mission of publicDemoMissions) {
      const result = mission.steps.reduce((state, step, index) => {
        const expected = step.expectedAction as { action: MissionAction['action']; target?: string; option_id?: string };
        const action = { action: expected.action, target: expected.target, optionId: expected.option_id } satisfies MissionAction;
        return missionRunReducer(state, { type: 'answer', correct: isExpectedAction(expected, action), lastStep: index === mission.steps.length - 1 });
      }, initialMissionRunState);
      expect(result.completed).toBe(true);
      expect(result.mistakes).toBe(0);
    }
  });

  it('não encerra a foto antes da revisão e separa permissões da instalação', () => {
    expect(getPublicDemoMission('photo').steps.map((step) => step.expectedAction)).toEqual([
      { action: 'continue' },
      { action: 'tap', target: 'attachment_button' },
      { action: 'tap', target: 'gallery_option' },
      { action: 'select' },
      { action: 'choose', option_id: 'send-photo' },
    ]);
    expect(getPublicDemoMission('download-app').steps.at(-1)?.expectedAction).toEqual({ action: 'choose', option_id: 'install-training' });
  });
});
