export type MissionStatus = 'idle' | 'in_progress' | 'completed' | 'failed' | 'invalid';
export type SafetyLevel = 'standard' | 'sensitive';
export type ComponentType = 'text'|'title'|'subtitle'|'info'|'searchInput'|'textInput'|'numberInput'|'card'|'list'|'choiceList'|'radioGroup'|'checkboxGroup'|'button'|'localImage'|'fakeVideoPlayer'|'searchResults'|'fakeChat'|'messageList'|'fakeStore'|'productList'|'fakeCart'|'fakeForm'|'alert'|'confirmationModal'|'visualKeyboard'|'progress'|'hint'|'feedback'|'educationCard'|'safetyWarning'|'scamCheck';
export type ActionType = 'nextStep'|'previousStep'|'selectOption'|'toggleOption'|'setInput'|'submitInput'|'openModal'|'closeModal'|'showHint'|'playFakeVideo'|'pauseFakeVideo'|'addFakeCartItem'|'removeFakeCartItem'|'confirmFakeAction'|'completeMission'|'showSafetyWarning';

export type MissionOption = { id: string; label: string; correct?: boolean; description?: string };
export type MissionItem = { id: string; title: string; description?: string; assetId?: AllowedAssetId };
type BaseComponent = { id: string; label?: string; text?: string; title?: string; description?: string };
type ComponentProperties = {
  placeholder?: string; required?: boolean; allowedValues?: string[]; options?: MissionOption[]; items?: MissionItem[];
  assetId?: AllowedAssetId; buttonActionId?: string; min?: number; max?: number; progress?: number;
};
export type MissionComponent = { [Kind in ComponentType]: BaseComponent & ComponentProperties & { type: Kind } }[ComponentType];
type ActionProperties = { id: string; targetId?: string; nextStepId?: string; value?: string; expectedValue?: string; feedback?: string };
export type MissionAction = { [Kind in ActionType]: ActionProperties & { type: Kind } }[ActionType];
export type MissionStep = { id: string; title?: string; description?: string; components: MissionComponent[]; actions: MissionAction[]; hints?: string[]; safetyContent?: string; audio?: string; nextStepId?: string };
export type MissionDefinition = { schemaVersion: '1.0'; id: string; title: string; description: string; category: string; difficulty: 'easy'|'medium'|'hard'; estimatedDuration: number; safetyLevel: SafetyLevel; initialStepId: string; steps: MissionStep[]; metadata?: { source?: 'local'|'ai'|'remote'|'admin'; educationalOnly?: boolean } };
export type AllowedAssetId = 'video_learning_01'|'safe_shield_01'|'generic_product_01';
export type ValidationIssue = { code: string; path?: string; message: string; severity: 'error'|'warning' };
export type ValidationResult = { valid: true; mission: MissionDefinition; issues: ValidationIssue[] } | { valid: false; issues: ValidationIssue[] };
export type MissionRuntimeState = { missionId: string; currentStepId: string; completedStepIds: string[]; values: Record<string,string>; selections: Record<string,string[]>; visibleHints: string[]; openModalId: string|null; playingComponentId: string|null; cartItemIds: string[]; feedback: string|null; progress: number; status: MissionStatus };
export type MissionRuntimeEvent = { type: 'start' }|{ type:'execute'; action:MissionAction; componentId?:string; value?:string }|{type:'invalidate'}|{type:'fail'}|{type:'restart'};

export const COMPONENT_TYPES: readonly ComponentType[] = ['text','title','subtitle','info','searchInput','textInput','numberInput','card','list','choiceList','radioGroup','checkboxGroup','button','localImage','fakeVideoPlayer','searchResults','fakeChat','messageList','fakeStore','productList','fakeCart','fakeForm','alert','confirmationModal','visualKeyboard','progress','hint','feedback','educationCard','safetyWarning','scamCheck'];
export const ACTION_TYPES: readonly ActionType[] = ['nextStep','previousStep','selectOption','toggleOption','setInput','submitInput','openModal','closeModal','showHint','playFakeVideo','pauseFakeVideo','addFakeCartItem','removeFakeCartItem','confirmFakeAction','completeMission','showSafetyWarning'];
export const ALLOWED_ASSET_IDS: readonly AllowedAssetId[] = ['video_learning_01','safe_shield_01','generic_product_01'];
