import { fallbackMission, videoLearningMission } from './fixtures';
import { MISSION_LIMITS } from './limits';
import { parseAndValidateMission, validateMission, validateMissionReferences, validateMissionSafety } from './validation';

const copy=()=>JSON.parse(JSON.stringify(videoLearningMission)) as Record<string,unknown>;
const codes=(raw:unknown)=>{const result=validateMission(raw);return result.valid?[]:result.issues.map(i=>i.code)};
describe('dynamic mission schema and safety',()=>{
  it('accepts local valid missions',()=>{expect(validateMission(videoLearningMission).valid).toBe(true);expect(validateMission(fallbackMission).valid).toBe(true)});
  it('rejects corrupt JSON and unsupported versions',()=>{expect(parseAndValidateMission('{').valid).toBe(false);const raw=copy();raw.schemaVersion='2.0';expect(codes(raw)).toContain('MISSION_UNSUPPORTED_VERSION')});
  it('enforces total and text limits',()=>{const raw=copy();raw.description='x'.repeat(MISSION_LIMITS.maxTextLength+1);expect(codes(raw)).toContain('MISSION_TEXT_TOO_LONG');expect(codes({blob:'x'.repeat(MISSION_LIMITS.maxBytes)})).toContain('MISSION_TOO_LARGE')});
  it.each([
    ['HTML','<form>senha</form>','MISSION_HTML_FORBIDDEN'],['JavaScript','javascript:alert(1)','MISSION_SCRIPT_FORBIDDEN'],['URL','https://example.com','MISSION_URL_FORBIDDEN'],['credencial','Digite sua senha real','MISSION_CREDENTIAL_REQUEST'],['Pix inseguro','Faça um Pix real agora','MISSION_REAL_ACTION_FORBIDDEN'],['cópia de banco','Copie a tela do banco','MISSION_BRAND_IMPERSONATION'],
  ])('rejects %s',(_,value,code)=>{const raw=copy();raw.description=value;expect(codes(raw)).toContain(code)});
  it('rejects unknown component and action types',()=>{const raw=copy();const steps=raw.steps as Record<string,unknown>[];const first=steps[0]!;(first.components as Record<string,unknown>[])[0]!.type='RemoteWidget';(first.actions as Record<string,unknown>[])[0]!.type='runCode';expect(codes(raw)).toEqual(expect.arrayContaining(['MISSION_UNKNOWN_COMPONENT','MISSION_UNKNOWN_ACTION']))});
  it('rejects arbitrary props and local personal data',()=>{const raw=copy();const first=(raw.steps as Record<string,unknown>[])[0]!;(first.components as Record<string,unknown>[])[0]!.style={color:'red'};expect(codes(raw)).toContain('MISSION_PROPERTY_NOT_ALLOWED');const pii=copy();pii.description='Contato pessoa@example.com';expect(codes(pii)).toContain('MISSION_PERSONAL_DATA')});
  it('requires explicit guards for sensitive categories',()=>{const unsafe={...fallbackMission,id:'pix-test',title:'Aprender Pix',safetyLevel:'standard' as const};expect(validateMissionSafety(unsafe).map(i=>i.code)).toContain('MISSION_SENSITIVE_GUARD_REQUIRED')});
  it('rejects duplicated and broken references',()=>{const broken={...fallbackMission,initialStepId:'missing',steps:fallbackMission.steps.map((s,index)=>({...s,id:index?'notice':s.id,nextStepId:index?'missing':s.nextStepId}))};expect(validateMissionReferences(broken).map(i=>i.code)).toEqual(expect.arrayContaining(['MISSION_DUPLICATE_STEP_ID','MISSION_INVALID_REFERENCE']))});
  it('rejects actions targeting missing components and direct loops',()=>{const mission={...fallbackMission,steps:[{...fallbackMission.steps[0]!,nextStepId:'notice',actions:[{id:'bad',type:'selectOption' as const,targetId:'missing'}]},fallbackMission.steps[1]! ]};expect(validateMissionReferences(mission).map(i=>i.code)).toEqual(expect.arrayContaining(['MISSION_INVALID_REFERENCE','MISSION_LOOP_FORBIDDEN']))});
});
