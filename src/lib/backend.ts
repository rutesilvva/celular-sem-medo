import type { Database, Json } from '@/types/database.generated';
import { getSupabase } from '@/lib/supabase';

type AppRole = Database['public']['Enums']['app_role'];
type AttemptEventType = Database['public']['Enums']['attempt_event_type'];

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
