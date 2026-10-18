import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { completionKind, initialMissionRunState, isExpectedAction, missionRunReducer, type MissionAction } from '@/features/mission-engine/executor';
import { type ParticipantMissionStep } from '@/lib/backend';
import { enqueueOfflineEvent, readOfflineAttempt, writeOfflineAttempt, type OfflineAttempt, type OfflineMissionEvent } from '@/lib/offline-store';
import { synchronizeOfflineAttempt } from '@/lib/offline-sync';

type SyncStatus='offline'|'pending'|'syncing'|'synced'|'failed';

export function useMissionEngine(assignmentId:string,steps:ParticipantMissionStep[],options?:{restart?:boolean;demo?:boolean}){
  const {currentUser}=useAuth();
  const {showNotice}=useApp();
  const ownerId=options?.demo?'public-demo':currentUser?.id??null;
  const [attempt,setAttempt]=useState<OfflineAttempt|null>(null);
  const [loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);const[error,setError]=useState<string|null>(null);const[syncStatus,setSyncStatus]=useState<SyncStatus>('pending');const[completedAssignmentId,setCompletedAssignmentId]=useState<string|null>(null);
  const mounted=useRef(true);const syncing=useRef<Promise<void>|null>(null);const attemptRef=useRef<OfflineAttempt|null>(null);const submitting=useRef(false);
  const applyAttempt=useCallback(async(next:OfflineAttempt)=>{attemptRef.current=next;if(mounted.current)setAttempt(next);await writeOfflineAttempt(next)},[]);

  const synchronize=useCallback(async(candidate?:OfflineAttempt)=>{
    if(options?.demo){setSyncStatus('synced');return;}
    if(syncing.current)return syncing.current;
    const local=candidate??attemptRef.current;if(!local||!currentUser||local.ownerId!==currentUser.id||!local.pending.length){setSyncStatus('synced');return;}
    const network=await NetInfo.fetch();if(network.isConnected===false||network.isInternetReachable===false){setSyncStatus('offline');return;}
    const task=(async()=>{setSyncStatus('syncing');try{
      const working=await synchronizeOfflineAttempt(currentUser.id,local.assignmentId,(next)=>{attemptRef.current=next;if(mounted.current)setAttempt(next)});
      if(working){attemptRef.current=working;if(mounted.current)setAttempt(working)}
      if(mounted.current){setSyncStatus('synced');setError(null)}
    }catch{if(mounted.current){setSyncStatus('failed');setError('Não conseguimos enviar seu progresso agora. Sua missão está salva neste aparelho e tentaremos novamente.')}}finally{syncing.current=null}})();
    syncing.current=task;return task;
  },[currentUser,options?.demo]);

  const start=useCallback(async()=>{
    if(!ownerId||!steps.length)return;
    setLoading(true);setError(null);
    let cached=options?.restart?null:await readOfflineAttempt(ownerId,assignmentId);
    if(cached?.run.completed){
      if(cached.pending.length){
        await applyAttempt(cached);
        setCompletedAssignmentId(assignmentId);
        setSyncStatus('pending');
        setLoading(false);
        void synchronize(cached);
        return;
      }
      cached=null;
    }
    if(cached){await applyAttempt(cached);setSyncStatus(cached.pending.length?'pending':'synced');setLoading(false);void synchronize(cached);return}
    const created:OfflineAttempt={ownerId,assignmentId,localAttemptId:createUuid(),remoteAttemptId:null,remoteNextSequence:null,run:initialMissionRunState,pending:[],syncedOperationIds:[],updatedAt:new Date().toISOString()};
    const started=enqueueOfflineEvent(created,event('attempt_started',steps[0]?.id));
    await applyAttempt(started);setSyncStatus('pending');setLoading(false);void synchronize(started);
  },[applyAttempt,assignmentId,options?.restart,ownerId,steps,synchronize]);

  useEffect(()=>{mounted.current=true;queueMicrotask(()=>void start());const unsubscribe=NetInfo.addEventListener(state=>{if(state.isConnected&&state.isInternetReachable!==false)void synchronize()});return()=>{mounted.current=false;unsubscribe()}},[start,synchronize]);
  const run=attempt?.run??initialMissionRunState;const currentStep=steps[run.stepIndex]??steps[0]??null;

  const submit=useCallback(async(action:MissionAction)=>{const local=attemptRef.current;if(!local||!currentStep||submitting.current)return;if(local.run.completed){setCompletedAssignmentId(assignmentId);return}submitting.current=true;setBusy(true);setError(null);const correct=isExpectedAction(currentStep.expectedAction,action);const lastStep=local.run.stepIndex===steps.length-1;const nextRun=missionRunReducer(local.run,{type:'answer',correct,lastStep});let next=enqueueOfflineEvent({...local,run:nextRun},event(correct?'action_succeeded':'action_failed',currentStep.id,correct?steps[local.run.stepIndex+1]?.id??currentStep.id:undefined,correct&&lastStep));if(correct&&lastStep)next=enqueueOfflineEvent(next,event('attempt_completed',currentStep.id));try{await applyAttempt(next);setSyncStatus('pending');showNotice(correct?(lastStep?'Pronto! Você concluiu esta missão.':'Pronto! Você terminou esta etapa.'):'Essa escolha não é a mais segura. Leia a explicação e tente novamente.');if(correct&&lastStep)setCompletedAssignmentId(assignmentId);void synchronize(next)}catch{setError('Não foi possível salvar esta resposta. Tente novamente.')}finally{submitting.current=false;setBusy(false)}},[applyAttempt,assignmentId,currentStep,showNotice,steps,synchronize]);

  const registerSupport=useCallback(async(kind:'hint'|'help'|'audio')=>{const local=attemptRef.current;if(!local||!currentStep||busy)return;setBusy(true);const eventType=kind==='hint'?'hint_requested':kind==='help'?'help_requested':'audio_started';const nextRun=kind==='audio'?local.run:missionRunReducer(local.run,{type:kind});const next=enqueueOfflineEvent({...local,run:nextRun},event(eventType,currentStep.id));await applyAttempt(next);setSyncStatus('pending');setBusy(false);void synchronize(next)},[applyAttempt,busy,currentStep,synchronize]);

  const goBack=useCallback(async()=>{const local=attemptRef.current;if(!local||busy||local.run.stepIndex<=0||local.run.completed)return;setBusy(true);await applyAttempt({...local,run:missionRunReducer(local.run,{type:'back'}),updatedAt:new Date().toISOString()});setBusy(false)},[applyAttempt,busy]);

  const completedThisSession=completedAssignmentId===assignmentId;
  return useMemo(()=>({attemptId:attempt?.remoteAttemptId??attempt?.localAttemptId??null,localAttemptId:attempt?.localAttemptId??null,busy,completion:completionKind(run),completedThisSession,currentStep,error,loading,pendingCount:attempt?.pending.length??0,run,syncStatus,retry:()=>synchronize(),submit,registerSupport,goBack}),[attempt,busy,completedThisSession,currentStep,error,goBack,loading,registerSupport,run,submit,syncStatus,synchronize]);
}

function event(eventType:OfflineMissionEvent['eventType'],stepId?:string,progressStepId?:string,completed=false):OfflineMissionEvent{return{operationId:createUuid(),eventType,stepId,occurredAt:new Date().toISOString(),progressStepId,completed}}
function createUuid(){return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3)|8).toString(16)})}
