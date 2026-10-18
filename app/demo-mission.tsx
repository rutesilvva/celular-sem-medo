import { useLocalSearchParams } from 'expo-router';

import { MissionExecutor } from './participant/simulator';
import { getPublicDemoMission } from '@/features/public-demo/catalog';

export default function PublicMissionScreen() {
  const { mission } = useLocalSearchParams<{ mission?: string }>();
  const selected = getPublicDemoMission(mission);

  return (
    <MissionExecutor
      assignmentId={selected.details.assignmentId}
      details={selected.details}
      steps={selected.steps}
      restart
      publicDemo
    />
  );
}
