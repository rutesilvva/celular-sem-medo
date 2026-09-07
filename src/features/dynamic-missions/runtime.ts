import type { MissionAction, MissionDefinition, MissionRuntimeEvent, MissionRuntimeState } from './types';

export function createMissionRuntime(mission:MissionDefinition):MissionRuntimeState{return{missionId:mission.id,currentStepId:mission.initialStepId,completedStepIds:[],values:{},selections:{},visibleHints:[],openModalId:null,playingComponentId:null,cartItemIds:[],feedback:null,progress:0,status:'idle'};}
export function reduceMissionRuntime(mission:MissionDefinition,state:MissionRuntimeState,event:MissionRuntimeEvent):MissionRuntimeState{
  if(event.type==='restart')return createMissionRuntime(mission);if(event.type==='invalidate')return{...state,status:'invalid'};if(event.type==='fail')return{...state,status:'failed'};if(event.type==='start')return state.status==='idle'?{...state,status:'in_progress'}:state;if(state.status!=='in_progress'||event.type!=='execute')return state;return executeMissionAction(mission,state,event.action,event.componentId,event.value);
}
export function executeMissionAction(mission:MissionDefinition,state:MissionRuntimeState,action:MissionAction,componentId?:string,input?:string):MissionRuntimeState{
  const step=mission.steps.find(item=>item.id===state.currentStepId);if(!step)return{...state,status:'invalid'};
  const target=action.targetId??componentId;const value=input??action.value??'';
  switch(action.type){
    case'setInput':return target?{...state,values:{...state.values,[target]:value},feedback:null}:state;
    case'submitInput':{const actual=target?state.values[target]??value:value;const correct=action.expectedValue===undefined||actual.trim().toLocaleLowerCase('pt-BR')===action.expectedValue.trim().toLocaleLowerCase('pt-BR');return correct?advance(mission,state,step.id,action.nextStepId??step.nextStepId,action.feedback??'Resposta correta!'):{...state,feedback:action.feedback??'Ainda não. Confira a dica e tente novamente.'};}
    case'selectOption':return target?{...state,selections:{...state.selections,[target]:[value]},feedback:action.feedback??null}:state;
    case'toggleOption':{if(!target)return state;const current=state.selections[target]??[];return{...state,selections:{...state.selections,[target]:current.includes(value)?current.filter(x=>x!==value):[...current,value]},feedback:null};}
    case'nextStep':case'confirmFakeAction':return advance(mission,state,step.id,action.nextStepId??step.nextStepId,action.feedback??null);
    case'previousStep':{const index=mission.steps.findIndex(item=>item.id===step.id);const previous=mission.steps[index-1];return previous?{...state,currentStepId:previous.id,feedback:null}:state;}
    case'openModal':return target?{...state,openModalId:target}:state;case'closeModal':return{...state,openModalId:null};
    case'showHint':return{...state,visibleHints:Array.from(new Set([...state.visibleHints,step.id])),feedback:null};
    case'playFakeVideo':return target?{...state,playingComponentId:target,feedback:'Vídeo fictício em reprodução.'}:state;case'pauseFakeVideo':return{...state,playingComponentId:null,feedback:'Vídeo fictício pausado.'};
    case'addFakeCartItem':return target?{...state,cartItemIds:Array.from(new Set([...state.cartItemIds,target])),feedback:'Item fictício adicionado.'}:state;case'removeFakeCartItem':return target?{...state,cartItemIds:state.cartItemIds.filter(id=>id!==target),feedback:'Item removido.'}:state;
    case'showSafetyWarning':return{...state,feedback:action.feedback??'Pare, confira os dados e nunca compartilhe senhas.'};
    case'completeMission':{const selected=action.targetId?state.selections[action.targetId]?.[0]:undefined;if(action.expectedValue&&selected!==action.expectedValue)return{...state,feedback:'Ainda não. Revise sua resposta e tente novamente.'};return{...state,completedStepIds:Array.from(new Set([...state.completedStepIds,step.id])),progress:100,status:'completed',feedback:action.feedback??'Missão concluída!'};}
  }
  return assertNever(action);
}
function assertNever(value:never):never{throw new Error(`MISSION_UNKNOWN_ACTION:${String(value)}`);}
function advance(mission:MissionDefinition,state:MissionRuntimeState,completed:string,next:string|undefined,feedback:string|null):MissionRuntimeState{if(!next)return{...state,completedStepIds:Array.from(new Set([...state.completedStepIds,completed])),progress:100,status:'completed',feedback:feedback??'Missão concluída!'};const done=Array.from(new Set([...state.completedStepIds,completed]));return{...state,currentStepId:next,completedStepIds:done,progress:Math.round(done.length*100/mission.steps.length),feedback};}
