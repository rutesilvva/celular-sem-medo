import type { ParticipantMissionDetails, ParticipantMissionStep } from '@/lib/backend';

export type AiMissionSession = {
  id: string;
  details: ParticipantMissionDetails;
  steps: ParticipantMissionStep[];
  topic: string;
  createdAt: number;
};

const aiSessionCache = new Map<string, AiMissionSession>();

export function setAiMissionSession(session: AiMissionSession): void {
  aiSessionCache.set(session.id, session);
}

export function getAiMissionSession(id: string): AiMissionSession | null {
  return aiSessionCache.get(id) ?? null;
}
