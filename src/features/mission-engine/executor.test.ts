import { completionKind, initialMissionRunState, isExpectedAction, missionRunReducer } from './executor';

test('valida ações usando somente a definição do passo', () => {
  expect(isExpectedAction({ action: 'choose', option_id: 'safe' }, { action: 'choose', optionId: 'safe' })).toBe(true);
  expect(isExpectedAction({ action: 'choose', option_id: 'safe' }, { action: 'choose', optionId: 'unsafe' })).toBe(false);
});

test('erro não avança e acerto avança exatamente um passo', () => {
  const wrong = missionRunReducer(initialMissionRunState, { type: 'answer', correct: false, lastStep: false });
  expect(wrong).toEqual({ ...initialMissionRunState, mistakes: 1, lastAnswerCorrect: false });
  const correct = missionRunReducer(wrong, { type: 'answer', correct: true, lastStep: false });
  expect(correct.stepIndex).toBe(1);
  expect(correct.lastAnswerCorrect).toBe(true);
});

test('conclusão autônoma, com dica e com ajuda são distintas', () => {
  const autonomous = missionRunReducer(initialMissionRunState, { type: 'answer', correct: true, lastStep: true });
  const hinted = missionRunReducer(missionRunReducer(initialMissionRunState, { type: 'hint' }), { type: 'answer', correct: true, lastStep: true });
  const helped = missionRunReducer(missionRunReducer(initialMissionRunState, { type: 'help' }), { type: 'answer', correct: true, lastStep: true });
  expect(completionKind(autonomous)).toBe('autonomous');
  expect(completionKind(hinted)).toBe('with_hint');
  expect(completionKind(helped)).toBe('with_help');
});

test('uma tentativa concluída não pode perder a conquista', () => {
  const completed = missionRunReducer(initialMissionRunState, { type: 'answer', correct: true, lastStep: true });
  expect(missionRunReducer(completed, { type: 'restart' }).completed).toBe(false);
  expect(missionRunReducer(completed, { type: 'answer', correct: false, lastStep: false }).completed).toBe(true);
});
