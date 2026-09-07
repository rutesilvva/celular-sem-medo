import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Screen } from '@/components/Screen';
import { AppText, Card, Header, Tag } from '@/components/ui';
import { SafeMissionRenderer } from '@/features/dynamic-missions/renderer';
import { loadLocalMission } from '@/features/dynamic-missions/loader';
import { colors, spacing } from '@/theme/tokens';

export default function DynamicMissionScreen(){const router=useRouter();const{id}=useLocalSearchParams<{id?:string}>();const loaded=useMemo(()=>loadLocalMission(id),[id]);return <Screen contentStyle={{gap:spacing.lg}}><Header title={loaded.mission.title} subtitle="Missão local · funciona sem internet" onBack={()=>router.canGoBack()?router.back():router.replace('/demo')}/>{loaded.usedFallback&&id!=='fallback'?<Card style={{backgroundColor:colors.warningSoft,gap:spacing.sm}}><Tag label="FALLBACK SEGURO" tone="yellow"/><AppText weight="800">A missão solicitada não pôde ser carregada</AppText><AppText variant="small">Abrimos uma demonstração local validada. Nenhum conteúdo inválido foi renderizado.</AppText></Card>:null}<SafeMissionRenderer mission={loaded.mission} onComplete={()=>router.replace('/demo')}/></Screen>}
