import type { Database, Json } from '@/types/database.generated';
import { getSupabase } from '@/lib/supabase';

type AppRole = Database['public']['Enums']['app_role'];
type AttemptEventType = Database['public']['Enums']['attempt_event_type'];
export type ClassContext = Database['public']['Functions']['get_my_class_contexts']['Returns'][number];
type MonitorParticipantRow = Database['public']['Functions']['get_monitor_class_participants']['Returns'][number];
type MissionCatalogRow = Database['public']['Functions']['get_participant_mission_catalog']['Returns'][number];
type MissionDetailsRow = Database['public']['Functions']['get_participant_mission_details']['Returns'][number];
type MissionStepRow = Database['public']['Functions']['get_participant_mission_steps']['Returns'][number];

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
  completedMissions: number;
  assignedMissions: number;
  difficultyTitle: string;
  difficultyDescription: string;
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

export async function getMyClassContexts() {
  const { data, error } = await getSupabase().rpc('get_my_class_contexts');
  if (error) throw error;
  return data;
}

export async function getMonitorClassParticipants(classId: string): Promise<ClassParticipant[]> {
  const { data, error } = await getSupabase().rpc('get_monitor_class_participants', {
    target_class_id: classId,
  });
  if (error) throw error;
  return data.map(mapParticipant);
}

export async function getMonitorParticipant(classId: string, participantId: string): Promise<ClassParticipant | null> {
  const { data, error } = await getSupabase().rpc('get_monitor_participant', {
    target_class_id: classId,
    target_participant_id: participantId,
  });
  if (error) throw error;
  return data[0] ? mapParticipant(data[0]) : null;
}

export async function createClassInvitation(classId: string, email: string, role: AppRole = 'participant') {
  const { data, error } = await getSupabase().rpc('create_class_invitation', {
    target_class_id: classId,
    invited_email: email,
    invited_role: role,
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

function mapParticipant(row: MonitorParticipantRow): ClassParticipant {
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
    completedMissions: row.completed_missions,
    assignedMissions: row.assigned_missions,
    difficultyTitle: progress < 55 ? 'Acompanhamento recomendado' : 'Progresso em andamento',
    difficultyDescription: progress < 55
      ? 'Consulte as missões recentes e ofereça apoio durante a próxima prática.'
      : 'A pessoa está avançando nas missões atribuídas à turma.',
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
