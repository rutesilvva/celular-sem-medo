export type MissionPresentation = 'generic' | 'whatsapp-photo' | 'pix' | 'gov-br';

const presentationByMissionId: Readonly<Record<string, MissionPresentation>> = {
  '10000000-0000-4000-8000-000000000001': 'whatsapp-photo',
  '10000000-0000-4000-8000-000000000002': 'pix',
  '10000000-0000-4000-8000-00000000000a': 'gov-br',
};

export function resolveMissionPresentation(missionId: string, requested?: MissionPresentation): MissionPresentation {
  return requested ?? presentationByMissionId[missionId] ?? 'generic';
}
