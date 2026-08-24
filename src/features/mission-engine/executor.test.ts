/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { completionKind, initialMissionRunState, isExpectedAction, missionRunReducer } from './executor.ts';

test('valida ações usando somente a definição do passo', () => {
  assert.equal(isExpectedAction({ action: 'choose', option_id: 'safe' }, { action: 'choose', optionId: 'safe' }), true);
  assert.equal(isExpectedAction({ action: 'choose', option_id: 'safe' }, { action: 'choose', optionId: 'unsafe' }), false);
});

test('erro não avança e acerto avança exatamente um passo', () => {
  const wrong = missionRunReducer(initialMissionRunState, { type: 'answer', correct: false, lastStep: false });
  assert.deepEqual(wrong, { ...initialMissionRunState, mistakes: 1 });
  const correct = missionRunReducer(wrong, { type: 'answer', correct: true, lastStep: false });
  assert.equal(correct.stepIndex, 1);
});

test('conclusão autônoma, com dica e com ajuda são distintas', () => {
  const autonomous = missionRunReducer(initialMissionRunState, { type: 'answer', correct: true, lastStep: true });
  const hinted = missionRunReducer(missionRunReducer(initialMissionRunState, { type: 'hint' }), { type: 'answer', correct: true, lastStep: true });
  const helped = missionRunReducer(missionRunReducer(initialMissionRunState, { type: 'help' }), { type: 'answer', correct: true, lastStep: true });
  assert.equal(completionKind(autonomous), 'autonomous');
  assert.equal(completionKind(hinted), 'with_hint');
  assert.equal(completionKind(helped), 'with_help');
});

test('uma tentativa concluída não pode perder a conquista', () => {
  const completed = missionRunReducer(initialMissionRunState, { type: 'answer', correct: true, lastStep: true });
  assert.equal(missionRunReducer(completed, { type: 'restart' }).completed, false);
  assert.equal(missionRunReducer(completed, { type: 'answer', correct: false, lastStep: false }).completed, true);
});
