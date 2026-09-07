import { fallbackMission, localMissionFixtures, type LocalMissionId } from './fixtures';
import type { MissionDefinition, ValidationIssue } from './types';
import { normalizeMission, validateMissionByVersion } from './validation';
export type MissionLoadResult={mission:MissionDefinition;usedFallback:boolean;issues:ValidationIssue[]};
export function loadDynamicMission(raw:unknown):MissionLoadResult{const result=validateMissionByVersion(raw);return result.valid?{mission:normalizeMission(result.mission),usedFallback:false,issues:result.issues}:{mission:fallbackMission,usedFallback:true,issues:result.issues};}
export function loadLocalMission(id:string|undefined):MissionLoadResult{if(id!=='video'&&id!=='fallback')return{mission:fallbackMission,usedFallback:true,issues:[{code:'MISSION_NOT_FOUND',message:'A missão local solicitada não existe.',path:'id',severity:'error'}]};return loadDynamicMission(localMissionFixtures[id as LocalMissionId]);}
