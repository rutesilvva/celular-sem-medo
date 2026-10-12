export type MissionPresentation = 'generic' | 'whatsapp-photo' | 'pix' | 'gov-br' | 'messaging' | 'mobility' | 'app-store' | 'marketplace' | 'phone-call';

const presentationByMissionId: Readonly<Record<string, MissionPresentation>> = {
  '10000000-0000-4000-8000-000000000001': 'whatsapp-photo',
  '10000000-0000-4000-8000-000000000002': 'pix',
  '10000000-0000-4000-8000-000000000003': 'messaging',
  '10000000-0000-4000-8000-000000000004': 'mobility',
  '10000000-0000-4000-8000-000000000005': 'app-store',
  '10000000-0000-4000-8000-000000000006': 'marketplace',
  '10000000-0000-4000-8000-000000000007': 'messaging',
  '10000000-0000-4000-8000-000000000008': 'messaging',
  '10000000-0000-4000-8000-000000000009': 'phone-call',
  '10000000-0000-4000-8000-00000000000a': 'gov-br',
};

export function resolveMissionPresentation(missionId: string, requested?: MissionPresentation): MissionPresentation {
  return requested ?? presentationByMissionId[missionId] ?? 'generic';
}
