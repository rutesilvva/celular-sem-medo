import { fallbackMission } from './fallbackMission';
import { videoLearningMission } from './videoMission';
export { fallbackMission,videoLearningMission };
export { invalidMissionFixtures } from './invalidFixtures';
export const localMissionFixtures={video:videoLearningMission,fallback:fallbackMission} as const;
export type LocalMissionId=keyof typeof localMissionFixtures;
