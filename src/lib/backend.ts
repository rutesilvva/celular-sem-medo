import type { Database, Json } from '@/types/database.generated';
import { getSupabase } from '@/lib/supabase';
import type { AccessibilityPreferences } from '@/context/AppContext';

type AttemptEventType = Database['public']['Enums']['attempt_event_type'];
export type ClassContext = Database['public']['Functions']['get_my_class_contexts']['Returns'][number];
type AdminParticipantRow = Database['public']['Functions']['get_admin_participant_metrics']['Returns'][number];
type MissionCatalogRow = Database['public']['Functions']['get_participant_mission_catalog']['Returns'][number];
type MissionDetailsRow = Database['public']['Functions']['get_participant_mission_details']['Returns'][number];
type MissionStepRow = Database['public']['Functions']['get_participant_mission_steps']['Returns'][number];
export type ParticipantProgress = Database['public']['Functions']['get_participant_progress']['Returns'][number];
export type ParticipantCategoryProgress = Database['public']['Functions']['get_participant_category_progress']['Returns'][number];
export type AdminClassProgress = Database['public']['Functions']['get_admin_class_progress']['Returns'][number];
export type AdminMissionProgress = Database['public']['Functions']['get_admin_mission_progress']['Returns'][number];
export type ParticipantHelpRequest = Database['public']['Functions']['get_my_help_requests']['Returns'][number];
export type AdminHelpRequest = Database['public']['Functions']['get_admin_help_requests']['Returns'][number];
export type AdminClass = Database['public']['Functions']['get_admin_classes']['Returns'][number];
export type AdminUser = Database['public']['Functions']['get_admin_users']['Returns'][number];
export type HelpRequestHistory = Database['public']['Functions']['get_help_request_history']['Returns'][number];
export type MissionRecommendation = Database['public']['Functions']['get_personalized_mission_recommendations']['Returns'][number];
export type AdminImpactSummary = Database['public']['Functions']['get_admin_impact_summary']['Returns'][number];
export type WorkshopParticipant = Database['public']['Functions']['get_admin_workshop_status']['Returns'][number];
export type HelpReason = 'stuck_step' | 'needs_explanation' | 'accessibility_support';
export type HelpResolution = 'review_hint' | 'try_again' | 'scheduled_support' | 'guided_by_admin';
export type AdminParticipantHistory = Database['public']['Functions']['get_admin_participant_history']['Returns'][number];
export type AdminClassEvolution = Database['public']['Functions']['get_admin_class_evolution']['Returns'][number];
export type AdminParticipantFilter = 'all' | 'attention' | 'advancing';
export type AdminParticipantSort = 'name' | 'progress_asc' | 'progress_desc' | 'recent';

export type ClassParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  joinedAt: string;
  progress: number;
  audio: number;
  score: string;
  initials: string;
  autonomy: number;
  difficulty: number;
  attemptCount: number;
  completedAttemptCount: number;
  helpedAttemptCount: number;
  lastActivityAt: string | null;
  completedMissions: number;
  assignedMissions: number;
  difficultyTitle: string;
  difficultyDescription: string;
};

export type AdminParticipantsPage = {
  items: ClassParticipant[];
  total: number;
  limit: number;
  offset: number;
};

export type ParticipantMission = {
  assignmentId: string;
  classId: string;
  missionId: string;
  missionVersionId: string;
  version: number;
  title: string;
  summary: string;
  category: string;
  difficulty: Database['public']['Enums']['mission_difficulty'];
  estimatedMinutes: number;
  required: boolean;
};

export type ParticipantMissionDetails = ParticipantMission & {
  learningObjective: string;
  safetyNote: string;
  stepCount: number;
};

export type ParticipantMissionStep = {
  id: string;
  position: number;
  type: Database['public']['Enums']['mission_step_type'];
  title: string;
  instruction: string;
  audioText: string;
  safetyNote: string;
  expectedAction: Json;
  options: Json;
  hints: string[];
  optional: boolean;
};

export async function getParticipantMissionCatalog(): Promise<ParticipantMission[]> {
  const { data, error } = await getSupabase().rpc('get_participant_mission_catalog');
  if (error) throw error;
  return data.map(mapMission);
}

export async function getParticipantMissionContent(assignmentId: string): Promise<{
  details: ParticipantMissionDetails | null;
  steps: ParticipantMissionStep[];
}> {
  const supabase = getSupabase();
  const [detailsResult, stepsResult] = await Promise.all([
    supabase.rpc('get_participant_mission_details', { target_assignment_id: assignmentId }),
    supabase.rpc('get_participant_mission_steps', { target_assignment_id: assignmentId }),
  ]);
  if (detailsResult.error) throw detailsResult.error;
  if (stepsResult.error) throw stepsResult.error;
  return {
    details: detailsResult.data[0] ? mapMissionDetails(detailsResult.data[0]) : null,
    steps: stepsResult.data.map(mapMissionStep),
  };
}

export async function startMissionAssessment(assignmentId: string, confidence: number) {
  const id = createUuid();
  const { data, error } = await getSupabase().rpc('start_mission_self_assessment', { requested_id: id, target_assignment_id: assignmentId, rating: confidence });
  if (error) throw error;
  return data;
}

export async function completeMissionAssessment(assessmentId: string, attemptId: string, confidence: number) {
  const { data, error } = await getSupabase().rpc('complete_mission_self_assessment', { target_assessment_id: assessmentId, target_attempt_id: attemptId, rating: confidence });
  if (error) throw error;
  return data;
}

export async function getMissionRecommendations(query = ''): Promise<MissionRecommendation[]> {
  const { data, error } = await getSupabase().rpc('get_personalized_mission_recommendations', { search_query: query });
  if (error) throw error;
  return data;
}

export async function createLearningRequest(query: string) {
  const { data, error } = await getSupabase().rpc('create_learning_request', { requested_id: createUuid(), query });
  if (error) throw error;
  return data;
}

export async function getAdminImpactSummary(classId?: string): Promise<AdminImpactSummary | null> {
  const { data, error } = await getSupabase().rpc('get_admin_impact_summary', { target_class_id: classId });
  if (error) throw error;
  return data[0] ?? null;
}

export async function getWorkshopStatus(classId: string): Promise<WorkshopParticipant[]> {
  const { data, error } = await getSupabase().rpc('get_admin_workshop_status', { target_class_id: classId });
  if (error) throw error;
  return data;
}

export async function getParticipantProgress(): Promise<ParticipantProgress | null> {
  const { data, error } = await getSupabase().rpc('get_participant_progress');
  if (error) throw error;
  return data[0] ?? null;
}

export async function getParticipantCategoryProgress(): Promise<ParticipantCategoryProgress[]> {
  const { data, error } = await getSupabase().rpc('get_participant_category_progress');
  if (error) throw error;
  return data;
}

export async function getAdminClassProgress(classId: string, periodDays: number): Promise<AdminClassProgress> {
  const { data, error } = await getSupabase().rpc('get_admin_class_progress', { target_class_id: classId, period_days: periodDays });
  if (error || !data?.[0]) throw error ?? new Error('CLASS_PROGRESS_NOT_AVAILABLE');
  return data[0];
}

export async function getAdminMissionProgress(classId: string, periodDays: number): Promise<AdminMissionProgress[]> {
  const { data, error } = await getSupabase().rpc('get_admin_mission_progress', { target_class_id: classId, period_days: periodDays });
  if (error) throw error;
  return data;
}

export async function getMyClassContexts() {
  const { data, error } = await getSupabase().rpc('get_my_class_contexts');
  if (error) throw error;
  return data;
}

export async function getAdminClassContexts(): Promise<ClassContext[]> {
  const { data, error } = await getSupabase().rpc('get_admin_class_contexts');
  if (error) throw error;
  return data as ClassContext[];
}

export async function getAdminClasses(): Promise<AdminClass[]> {
  const { data, error } = await getSupabase().rpc('get_admin_classes');
  if (error) throw error;
  return data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await getSupabase().rpc('get_admin_users');
  if (error) throw error;
  return data;
}

export async function createAdminClass(name: string, slug: string, shift?: string) {
  const { data, error } = await getSupabase().rpc('admin_create_class', { class_name: name, class_slug: slug, class_shift: shift });
  if (error) throw error;
  return data;
}

export async function updateAdminClass(id: string, name: string, shift?: string) {
  const { data, error } = await getSupabase().rpc('admin_update_class', { target_class_id: id, class_name: name, class_shift: shift });
  if (error) throw error;
  return data;
}

export async function archiveAdminClass(id: string) {
  const { data, error } = await getSupabase().rpc('admin_archive_class', { target_class_id: id });
  if (error) throw error;
  return data;
}

export async function addStudentToClass(classId: string, userId: string) {
  const { data, error } = await getSupabase().rpc('admin_add_student', { target_class_id: classId, target_user_id: userId });
  if (error) throw error;
  return data;
}

export async function removeStudentFromClass(classId: string, userId: string) {
  const { data, error } = await getSupabase().rpc('admin_revoke_membership', { target_class_id: classId, target_user_id: userId, target_role: 'participant' });
  if (error) throw error;
  return data;
}

export async function setAdministrator(userId: string, enabled: boolean) {
  const rpc = enabled ? 'admin_grant_administrator' : 'admin_revoke_administrator';
  const { data, error } = await getSupabase().rpc(rpc, { target_user_id: userId });
  if (error) throw error;
  return data;
}

export async function saveParticipantPreferences(userId: string, preferences: AccessibilityPreferences) {
  const { error } = await getSupabase().from('preferences').update({
    larger_text: preferences.largerText,
    high_contrast: preferences.highContrast,
    auto_audio: preferences.autoAudio,
    voice_response: preferences.voiceResponse,
    audio_rate: preferences.audioRate,
    reduce_motion: preferences.reduceMotion,
    haptic_feedback: preferences.hapticFeedback,
    repeat_instructions: preferences.repeatInstructions,
  }).eq('user_id', userId);
  if (error) throw error;
}

export async function getAdminClassParticipants(classId: string): Promise<ClassParticipant[]> {
  return (await getAdminParticipantsPage({ classId })).items;
}

export async function getAdminParticipantsPage(input: {
  classId: string;
  periodDays?: 7 | 30 | 90;
  search?: string;
  filter?: AdminParticipantFilter;
  sort?: AdminParticipantSort;
  limit?: number;
  offset?: number;
}): Promise<AdminParticipantsPage> {
  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;
  const { data, error } = await getSupabase().rpc('get_admin_participants_page', {
    target_class_id: input.classId,
    period_days: input.periodDays ?? 30,
    search_text: input.search ?? '',
    progress_filter: input.filter ?? 'all',
    sort_by: input.sort ?? 'name',
    page_size: limit,
    page_offset: offset,
  });
  if (error) throw error;
  return { items: data.map(mapParticipant), total: data[0]?.total_count ?? 0, limit, offset };
}

export async function getAdminParticipant(classId: string, participantId: string, periodDays: 7 | 30 | 90 = 30): Promise<ClassParticipant | null> {
  const { data, error } = await getSupabase().rpc('get_admin_participant_report', {
    target_class_id: classId,
    target_participant_id: participantId,
    period_days: periodDays,
  });
  if (error) throw error;
  return data[0] ? mapParticipant(data[0]) : null;
}

export async function getAdminParticipantHistory(classId: string, participantId: string, periodDays: 7 | 30 | 90 = 30) {
  const { data, error } = await getSupabase().rpc('get_admin_participant_history', {
    target_class_id: classId,
    target_participant_id: participantId,
    period_days: periodDays,
    result_limit: 50,
  });
  if (error) throw error;
  return data;
}

export async function getAdminClassEvolution(classId: string, periodDays: 7 | 30 | 90) {
  const { data, error } = await getSupabase().rpc('get_admin_class_evolution', {
    target_class_id: classId,
    period_days: periodDays,
  });
  if (error) throw error;
  return data;
}

export async function createClassInvitation(classId: string, email: string) {
  const { data, error } = await getSupabase().rpc('create_class_invitation', {
    target_class_id: classId,
    invited_email: email,
    invited_role: 'participant',
  });
  if (error || !data?.[0]) throw error ?? new Error('INVITATION_NOT_CREATED');
  return data[0];
}

export async function listClassInvitations(classId: string) {
  const { data, error } = await getSupabase().rpc('list_class_invitations', { target_class_id: classId });
  if (error) throw error;
  return data;
}

export async function consumeClassInvitation(token: string) {
  const { data, error } = await getSupabase().rpc('consume_class_invitation', { plain_token: token });
  if (error || !data?.[0]) throw error ?? new Error('INVITATION_NOT_CONSUMED');
  return data[0];
}

export async function appendAttemptEvent(input: {
  eventId: string;
  attemptId: string;
  sequenceNumber: number;
  eventType: AttemptEventType;
  stepId?: string;
  occurredAt?: string;
}) {
  const { data, error } = await getSupabase().rpc('append_attempt_event', {
    event_id: input.eventId,
    target_attempt_id: input.attemptId,
    target_sequence_number: input.sequenceNumber,
    target_event_type: input.eventType,
    target_step_id: input.stepId,
    event_occurred_at: input.occurredAt,
    event_payload: {} satisfies Json,
  });
  if (error || !data?.[0]) throw error ?? new Error('ATTEMPT_EVENT_NOT_STORED');
  return data[0];
}

export async function startOrResumeMissionAttempt(assignmentId: string, attemptId: string) {
  const { data, error } = await getSupabase().rpc('start_or_resume_mission_attempt', {
    target_assignment_id: assignmentId,
    requested_attempt_id: attemptId,
  });
  if (error || !data?.[0]) throw error ?? new Error('ATTEMPT_NOT_STARTED');
  return data[0];
}

export async function setMissionAttemptProgress(input: {
  attemptId: string;
  stepId: string;
  completed?: boolean;
}) {
  const { data, error } = await getSupabase().rpc('set_mission_attempt_progress', {
    target_attempt_id: input.attemptId,
    target_step_id: input.stepId,
    mark_completed: input.completed ?? false,
  });
  if (error) throw error;
  return data;
}

export async function createHelpRequest(input: { attemptId: string; stepId: string; reason: HelpReason }) {
  const { data, error } = await getSupabase().rpc('create_help_request', {
    requested_id: createUuid(), target_attempt_id: input.attemptId,
    target_step_id: input.stepId, target_reason_code: input.reason,
  });
  if (error || !data?.[0]) throw error ?? new Error('HELP_REQUEST_NOT_CREATED');
  return data[0];
}

export async function getMyHelpRequests(): Promise<ParticipantHelpRequest[]> {
  const { data, error } = await getSupabase().rpc('get_my_help_requests');
  if (error) throw error;
  return data;
}

export async function getAdminHelpRequests(classId: string): Promise<AdminHelpRequest[]> {
  const { data, error } = await getSupabase().rpc('get_admin_help_requests', { target_class_id: classId });
  if (error) throw error;
  return data;
}

export async function updateHelpRequest(id: string, status: 'in_progress' | 'resolved', resolution?: HelpResolution) {
  const { data, error } = await getSupabase().rpc('update_help_request', {
    target_help_request_id: id, target_status: status,
    target_resolution_code: resolution,
  });
  if (error) throw error;
  return data;
}

export async function getHelpRequestHistory(id: string): Promise<HelpRequestHistory[]> {
  const { data, error } = await getSupabase().rpc('get_help_request_history', { target_help_request_id: id });
  if (error) throw error;
  return data;
}

export async function cancelMyHelpRequest(id: string) {
  const { data, error } = await getSupabase().rpc('cancel_my_help_request', { target_help_request_id: id });
  if (error) throw error;
  return data;
}

export async function registerPushDevice(token: string, platform: 'android' | 'ios') {
  const { error } = await getSupabase().rpc('register_push_device', { target_token: token, target_platform: platform });
  if (error) throw error;
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function mapParticipant(row: AdminParticipantRow): ClassParticipant {
  const score = Number(row.average_score);
  const progress = row.progress_percent;
  return {
    id: row.participant_id,
    name: row.display_name,
    avatarUrl: row.avatar_url,
    joinedAt: row.joined_at,
    progress,
    audio: row.audio_usage_percent,
    score: (score / 20).toFixed(1).replace('.', ','),
    initials: initials(row.display_name),
    autonomy: row.autonomy_percent,
    difficulty: row.difficulty_percent,
    attemptCount: row.attempt_count,
    completedAttemptCount: row.completed_attempt_count,
    helpedAttemptCount: row.helped_attempt_count,
    lastActivityAt: row.last_activity_at || null,
    completedMissions: row.completed_missions,
    assignedMissions: row.assigned_missions,
    difficultyTitle: row.attempt_count === 0
      ? 'Sem atividade no período'
      : row.difficulty_percent > 0 ? 'Apoio registrado' : 'Sem dificuldade registrada',
    difficultyDescription: row.attempt_count === 0
      ? 'Ainda não existem tentativas para analisar neste período.'
      : `${row.difficulty_percent}% das tentativas tiveram erro, dica ou pedido de ajuda.`,
  };
}

function mapMission(row: MissionCatalogRow): ParticipantMission {
  return {
    assignmentId: row.assignment_id,
    classId: row.class_id,
    missionId: row.mission_id,
    missionVersionId: row.mission_version_id,
    version: row.version_number,
    title: row.title,
    summary: row.summary,
    category: row.category,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    required: row.is_required,
  };
}

function mapMissionDetails(row: MissionDetailsRow): ParticipantMissionDetails {
  return {
    assignmentId: row.assignment_id,
    classId: row.class_id,
    missionId: row.mission_id,
    missionVersionId: row.mission_version_id,
    version: row.version_number,
    title: row.title,
    summary: row.summary,
    category: row.category,
    difficulty: row.difficulty,
    estimatedMinutes: row.estimated_minutes,
    required: row.is_required,
    learningObjective: row.learning_objective,
    safetyNote: row.safety_note,
    stepCount: row.step_count,
  };
}

function mapMissionStep(row: MissionStepRow): ParticipantMissionStep {
  return {
    id: row.step_id,
    position: row.step_position,
    type: row.step_type,
    title: row.title,
    instruction: row.instruction,
    audioText: row.audio_text,
    safetyNote: row.safety_note,
    expectedAction: row.expected_action,
    options: row.options,
    hints: Array.isArray(row.hints) ? row.hints.filter((hint): hint is string => typeof hint === 'string') : [],
    optional: row.is_optional,
  };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]).join('').toLocaleUpperCase('pt-BR') || '?';
}
