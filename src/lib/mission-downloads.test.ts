import AsyncStorage from '@react-native-async-storage/async-storage';
import { getParticipantMissionContent } from './backend';
import { downloadMissionPackage } from './mission-downloads';
import { listDownloadedMissions, readMissionContent, removeDownloadedMission } from './offline-store';

jest.mock('@react-native-async-storage/async-storage',()=>jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('./backend',()=>({getParticipantMissionContent:jest.fn()}));
const content={details:{assignmentId:'a1',classId:'c1',missionId:'m1',missionVersionId:'v1',version:1,title:'Missão',summary:'Resumo',category:'Teste',difficulty:'easy' as const,estimatedMinutes:5,required:false,learningObjective:'Aprender',safetyNote:'Seguro',stepCount:1},steps:[{id:'s1',position:1,type:'instruction' as const,title:'Passo',instruction:'Continue',audioText:'Continue',safetyNote:'Seguro',expectedAction:{action:'continue'},options:[],hints:['Continue'],optional:false}]};
describe('mission downloads',()=>{beforeEach(async()=>{await AsyncStorage.clear();jest.clearAllMocks();});it('downloads and removes a complete offline package',async()=>{jest.mocked(getParticipantMissionContent).mockResolvedValue(content);await downloadMissionPackage('u1','a1');expect(await readMissionContent('u1','a1')).toEqual(content);expect(await listDownloadedMissions('u1')).toHaveLength(1);await removeDownloadedMission('u1','a1');expect(await readMissionContent('u1','a1')).toBeNull();});});
