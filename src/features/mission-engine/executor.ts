export type MissionAction = {
  action: 'continue' | 'tap' | 'choose' | 'select';
  target?: string;
  optionId?: string;
};

export type ExpectedMissionAction = {
  action: MissionAction['action'];
  target?: string;
  option_id?: string;
};

export type MissionRunState = {
  stepIndex: number;
  mistakes: number;
  lastAnswerCorrect?: boolean | null;
  usedHint: boolean;
  usedHelp: boolean;
  completed: boolean;
};

export type MissionRunEvent =
  | { type: 'answer'; correct: boolean; lastStep: boolean }
  | { type: 'hint' }
  | { type: 'help' }
  | { type: 'back' }
  | { type: 'restart' };

export const initialMissionRunState: MissionRunState = {
  stepIndex: 0,
  mistakes: 0,
  lastAnswerCorrect: null,
  usedHint: false,
  usedHelp: false,
  completed: false,
};

export function isExpectedAction(expected: unknown, received: MissionAction): boolean {
  if (!isExpectedMissionAction(expected) || expected.action !== received.action) return false;
  if (expected.target !== undefined && expected.target !== received.target) return false;
  if (expected.option_id !== undefined && expected.option_id !== received.optionId) return false;
  return true;
}

export function missionRunReducer(state: MissionRunState, event: MissionRunEvent): MissionRunState {
  if (event.type === 'restart') return initialMissionRunState;
  if (state.completed) return state;
  if (event.type === 'back') return { ...state, stepIndex: Math.max(0, state.stepIndex - 1), lastAnswerCorrect: null };
  if (event.type === 'hint') return { ...state, usedHint: true };
  if (event.type === 'help') return { ...state, usedHelp: true };
  if (!event.correct) return { ...state, mistakes: state.mistakes + 1, lastAnswerCorrect: false };
  if (event.lastStep) return { ...state, completed: true, lastAnswerCorrect: true };
  return { ...state, stepIndex: state.stepIndex + 1, lastAnswerCorrect: true };
}

export function completionKind(state: MissionRunState): 'autonomous' | 'with_hint' | 'with_help' {
  if (state.usedHelp) return 'with_help';
  if (state.usedHint) return 'with_hint';
  return 'autonomous';
}

function isExpectedMissionAction(value: unknown): value is ExpectedMissionAction {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['continue', 'tap', 'choose', 'select'].includes(String(candidate.action));
}
