import { getParticipantMissionContent } from '@/lib/backend';
import { cacheMissionContent, markMissionDownloaded } from '@/lib/offline-store';

export async function downloadMissionPackage(userId: string, assignmentId: string) {
  const content = await getParticipantMissionContent(assignmentId);
  if (!content.details || !content.steps.length) throw new Error('MISSION_PACKAGE_UNAVAILABLE');
  await cacheMissionContent(userId, assignmentId, { details: content.details, steps: content.steps });
  await markMissionDownloaded(userId, {
    assignmentId,
    title: content.details.title,
    stepCount: content.steps.length,
    downloadedAt: new Date().toISOString(),
  });
  return content;
}
