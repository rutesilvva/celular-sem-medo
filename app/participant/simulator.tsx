import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { SimulationIdentityNotice } from '@/components/SimulationIdentityNotice';
import { AppText, Button, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { MissionAction } from '@/features/mission-engine/executor';
import { resolveMissionPresentation, type MissionPresentation } from '@/features/mission-engine/presentation';
import { useMissionContent } from '@/hooks/useMissionData';
import { useMissionEngine } from '@/hooks/useMissionEngine';
import { getAiMissionSession } from '@/lib/ai-mission-cache';
import type { ParticipantMissionDetails, ParticipantMissionStep } from '@/lib/backend';
import { colors, radius, shadow, spacing } from '@/theme/tokens';

export default function ParticipantSimulatorScreen() {
  const { assignmentId, assessmentId, aiSessionId } = useLocalSearchParams<{ assignmentId?: string; assessmentId?: string; aiSessionId?: string }>();
  const aiSession = aiSessionId ? getAiMissionSession(aiSessionId) : null;
  const query = useMissionContent(aiSession ? null : (assignmentId ?? null));

  if (aiSession) {
    return <MissionExecutor assignmentId={aiSession.id} assessmentId={assessmentId} details={aiSession.details} steps={aiSession.steps} presentation={aiSession.presentation} />;
  }

  if (query.loading) return <SimulatorState kind="loading" retry={query.retry} />;
  if (query.error) return <SimulatorState kind="error" retry={query.retry} />;
  if (!query.data) return <SimulatorState kind="empty" retry={query.retry} />;
  return <MissionExecutor assignmentId={query.data.details.assignmentId} assessmentId={assessmentId} details={query.data.details} steps={query.data.steps} />;
}

function MissionExecutor({ assignmentId, assessmentId, details, steps, presentation: requestedPresentation }: { assignmentId: string; assessmentId?: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[]; presentation?: MissionPresentation }) {
  const router = useRouter();
  const { playInstruction, preferences, stopInstruction } = useApp();
  const engine = useMissionEngine(assignmentId, steps);
  const step = engine.currentStep;
  const lastAutoPlayedStep = useRef<string | null>(null);

  useEffect(() => {
    if (!step || !preferences.autoAudio || lastAutoPlayedStep.current === step.id) return;
    lastAutoPlayedStep.current = step.id;
    playInstruction(step.audioText);
  }, [playInstruction, preferences.autoAudio, step]);

  useEffect(() => () => stopInstruction(), [stopInstruction]);

  useEffect(() => {
    if (!engine.run.completed) return;
    router.replace({ pathname: '/participant/result', params: { assignmentId, assessmentId: assessmentId ?? '', completion: engine.completion, attemptId: engine.localAttemptId ?? '' } });
  }, [assessmentId, assignmentId, engine.completion, engine.localAttemptId, engine.run.completed, router]);

  if (engine.loading) return <SimulatorState kind="loading" retry={engine.retry} />;
  if (!step) return <SimulatorState kind="empty" retry={engine.retry} />;

  const presentation = resolveMissionPresentation(details.missionId, requestedPresentation);

  if (presentation === 'gov-br') {
    return <GovFlowMock assignmentId={assignmentId} assessmentId={assessmentId} details={details} steps={steps} engine={engine} playInstruction={playInstruction} router={router} />;
  }

  if (presentation === 'whatsapp-photo') {
    const target = asObject(step.expectedAction).target;
    const isAttachmentStep = target === 'attachment_button' || step.title.toLowerCase().includes('clipe') || step.title.toLowerCase().includes('anex');
    const hasOptions = Array.isArray(step.options) && step.options.length > 0;
    const optionTarget = target ?? 'training_photo_flowers';

    const handlePhotoAction = async (nextTarget: string) => {
      await engine.submit({ action: 'tap', target: nextTarget });
    };

    const handlePhotoChoice = async (nextTarget: string) => {
      await engine.submit({ action: 'select', target: nextTarget, optionId: nextTarget });
    };

    const showPhotoSheet = isAttachmentStep || hasOptions;

    return (
      <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
        <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
        <SimulationIdentityNotice reference="serviços de mensagens" />
        <SyncStatusCard engine={engine} />

        <Card style={styles.whatsappFrame}>
          <View style={styles.whatsappHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="chevron-back" size={22} color={colors.surface} />
              <View style={styles.avatarMini} />
              <AppText weight="800" color={colors.surface}>Contato de treino</AppText>
            </View>
            <View style={styles.headerRight}>
              <Ionicons name="call-outline" size={18} color={colors.surface} />
              <Ionicons name="videocam-outline" size={18} color={colors.surface} />
              <Ionicons name="ellipsis-vertical" size={18} color={colors.surface} />
            </View>
          </View>

          <View style={styles.chatBody}>
            <View style={styles.chatBubbleRow}><View style={styles.chatBubble}><AppText variant="small">Mensagem</AppText></View></View>
            <View style={styles.chatBubbleRowRight}><View style={styles.chatBubbleGreen}><AppText variant="small">Mensagem</AppText></View></View>

            {showPhotoSheet ? (
              <View style={styles.attachmentScene}>
                {isAttachmentStep ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Abrir opções de anexo" style={styles.cameraButton} disabled={engine.busy} onPress={() => void handlePhotoAction('attachment_button')}>
                    <Ionicons name="camera-outline" size={62} color={colors.surface} />
                  </Pressable>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel="Escolher foto de treinamento" style={styles.cameraButton} disabled={engine.busy} onPress={() => void handlePhotoChoice(optionTarget)}>
                    <Ionicons name="camera-outline" size={62} color={colors.surface} />
                  </Pressable>
                )}

                <View style={styles.actionSheet}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Escolher foto" style={styles.optionRowSelected} disabled={engine.busy} onPress={() => void handlePhotoChoice(optionTarget)}>
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <AppText weight="800" color={colors.primary}>Foto</AppText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Escolher vídeo" style={styles.optionRow} disabled={engine.busy} onPress={() => void engine.submit({ action: 'select', target: 'video_option', optionId: 'video_option' })}>
                    <Ionicons name="videocam-outline" size={20} color={colors.textMuted} />
                    <AppText color={colors.textMuted}>Vídeo</AppText>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Escolher documento" style={styles.optionRow} disabled={engine.busy} onPress={() => void engine.submit({ action: 'select', target: 'document_option', optionId: 'document_option' })}>
                    <Ionicons name="document-outline" size={20} color={colors.textMuted} />
                    <AppText color={colors.textMuted}>Documento</AppText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.photoCard}><View style={styles.photoScene} /></View>
            )}

            <View style={styles.chatBubbleRow}><View style={styles.chatBubble}><AppText variant="small">Mensagem</AppText></View></View>
          </View>

          <View style={styles.chatInputRow}>
            <Ionicons name="add" size={20} color={colors.surface} />
            <View style={styles.inputBox} />
            <Ionicons name="mic" size={20} color={colors.surface} />
          </View>
        </Card>

        <Card style={styles.instructionCard}>
          <View style={styles.instructionTop}>
            <AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText>
            <Tag label="Simulação segura" tone="green" />
          </View>
          <AppText variant="subheading" weight="800">{step.title}</AppText>
          <AppText color={colors.textMuted}>{step.instruction}</AppText>
          <ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
        </Card>

        <StepActions step={step} busy={engine.busy} onSubmit={engine.submit} />

        {engine.run.lastAnswerCorrect === false ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
        {engine.run.usedHint || engine.run.usedHelp ? <Card style={styles.hints}><AppText weight="800">{engine.run.usedHelp ? 'Ajuda passo a passo' : 'Dicas deste passo'}</AppText>{step.hints.map((hint) => <AppText key={hint}>• {hint}</AppText>)}</Card> : null}
        {engine.error ? <AppText color={colors.danger}>{engine.error}</AppText> : null}

        <View style={styles.supportActions}>
          <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
          <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
          <Button label="Pedir ajuda" icon="chatbubble-ellipses-outline" variant="soft" disabled={engine.busy || !engine.attemptId} onPress={() => {
            void engine.registerSupport('help');
            router.push({ pathname: '/participant/help-requests', params: { attemptId: engine.attemptId ?? '', stepId: step.id } });
          }} />
        </View>
      </Screen>
    );
  }

  if (presentation === 'messaging' || presentation === 'mobility' || presentation === 'app-store' || presentation === 'marketplace' || presentation === 'phone-call') {
    return <AppEnvironmentFlow assignmentId={assignmentId} assessmentId={assessmentId} details={details} steps={steps} engine={engine} playInstruction={playInstruction} router={router} presentation={presentation} />;
  }

  if (presentation === 'pix') {
    return <PixFlowMock assignmentId={assignmentId} assessmentId={assessmentId} details={details} steps={steps} engine={engine} playInstruction={playInstruction} router={router} />;
  }

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
      <SimulationIdentityNotice />
      <SyncStatusCard engine={engine} />
      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}>
          <AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText>
          <Tag label="Simulação segura" tone="green" />
        </View>
        <AppText variant="subheading" weight="800">{step.title}</AppText>
        <AppText color={colors.textMuted}>{step.instruction}</AppText>
        <ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
      </Card>
      <Card style={styles.simulation}>
        <View style={styles.safeHeader}>
          <View style={styles.safeIcon}><Ionicons name="shield-checkmark" size={28} color={colors.success} /></View>
          <View style={styles.safeCopy}><AppText weight="800">Ambiente fictício</AppText><AppText variant="small" color={colors.successText}>Sem mensagens, fotos, pagamentos, GPS, downloads ou permissões reais.</AppText></View>
        </View>
        <View style={styles.taskArea}>
          <Ionicons name={iconForStep(step)} size={46} color={colors.primary} />
          <AppText variant="subheading" weight="800" style={styles.center}>{step.title}</AppText>
          <AppText color={colors.textMuted} style={styles.center}>{step.safetyNote}</AppText>
        </View>
        <StepActions step={step} busy={engine.busy} onSubmit={engine.submit} />
      </Card>
      {engine.run.lastAnswerCorrect === false ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
      {engine.run.usedHint || engine.run.usedHelp ? <Card style={styles.hints}><AppText weight="800">{engine.run.usedHelp ? 'Ajuda passo a passo' : 'Dicas deste passo'}</AppText>{step.hints.map((hint) => <AppText key={hint}>• {hint}</AppText>)}</Card> : null}
      {engine.error ? <AppText color={colors.danger}>{engine.error}</AppText> : null}
      <View style={styles.supportActions}>
        <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
        <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
        <Button label="Pedir ajuda" icon="chatbubble-ellipses-outline" variant="soft" disabled={engine.busy || !engine.attemptId} onPress={() => {
          void engine.registerSupport('help');
          router.push({ pathname: '/participant/help-requests', params: { attemptId: engine.attemptId ?? '', stepId: step.id } });
        }} />
      </View>
    </Screen>
  );
}

function GovFlowMock({ assignmentId, assessmentId, details, steps, engine, playInstruction, router }: { assignmentId?: string; assessmentId?: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[]; engine: ReturnType<typeof useMissionEngine>; playInstruction: (text: string) => void; router: ReturnType<typeof useRouter> }) {
  const { preferences } = useApp();
  const step = engine.currentStep;
  const [selectedMother, setSelectedMother] = useState('MARIA');
  const [selectedMonth, setSelectedMonth] = useState('MAIO');
  const [selectedYear, setSelectedYear] = useState('1964');
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [showWarningModal, setShowWarningModal] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'phone'>('phone');

  if (!step) return null;

  const currentStepPos = Math.min(Math.max(step.position, 1), 9);

  const handleNextStep = async () => {
    if (preferences.hapticFeedback) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const expected = asExpectedAction(step.expectedAction);
    if (expected.action === 'choose') {
      await engine.submit({ action: 'choose', optionId: expected.option_id ?? 'finish' });
      return;
    }
    await engine.submit({ action: expected.action === 'tap' ? 'tap' : 'continue', target: expected.target });
  };

  const renderGovScreen = () => {
    switch (currentStepPos) {
      case 1:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
              <View style={styles.govNavIcons}>
                <Ionicons name="contrast-outline" size={18} color="#1351B4" />
                <Ionicons name="hand-left-outline" size={18} color="#1351B4" />
              </View>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Identifique-se no gov.br com:</AppText>

              <View style={styles.govSectionRow}>
                <Ionicons name="card-outline" size={20} color="#1351B4" />
                <AppText weight="700">Número do CPF</AppText>
              </View>
              <AppText variant="small" color={colors.textMuted}>Digite seu CPF para <AppText weight="800">criar</AppText> ou <AppText weight="800">acessar</AppText> sua conta gov.br</AppText>

              <View style={styles.govFieldBlock}>
                <AppText variant="caption" weight="700">CPF</AppText>
                <View style={styles.govInputMock}>
                  <AppText color={colors.text}>123.456.789-00</AppText>
                </View>
              </View>

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>

              <View style={styles.govDividerLine} />
              <AppText variant="caption" weight="700" color={colors.textMuted}>Outras opções de identificação:</AppText>

              <View style={styles.govOptionList}>
                <View style={styles.govOptionRow}>
                  <Ionicons name="cash-outline" size={18} color={colors.success} />
                  <AppText variant="small" weight="700" style={styles.flex1}>Login com seu banco</AppText>
                  <Tag label="CONTA PRATA" tone="green" />
                </View>
                <View style={styles.govOptionRow}>
                  <Ionicons name="qr-code-outline" size={18} color="#1351B4" />
                  <AppText variant="small" style={styles.flex1}>Login com QR code</AppText>
                </View>
                <View style={styles.govOptionRow}>
                  <Ionicons name="key-outline" size={18} color="#1351B4" />
                  <AppText variant="small" style={styles.flex1}>Seu certificado digital</AppText>
                </View>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Vamos criar sua conta gov.br</AppText>
              <AppText variant="small">Vai ser simples! Vamos te guiar durante o processo.</AppText>

              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: termsAgreed }} accessibilityLabel="Li e concordo com os termos simulados" style={styles.govCheckRow} onPress={() => setTermsAgreed(!termsAgreed)}>
                <Ionicons name={termsAgreed ? 'checkbox' : 'square-outline'} size={22} color="#1351B4" />
                <AppText variant="small" style={styles.flex1}>Li e estou de acordo com o <AppText variant="small" color="#1351B4" weight="700">Termo de Uso e Política de Privacidade</AppText></AppText>
              </Pressable>

              <View style={styles.govCaptchaBox}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <View style={styles.flex1}>
                  <AppText weight="700">Sou humano</AppText>
                  <AppText variant="caption" color={colors.textMuted}>Verificação fictícia · nenhum dado enviado</AppText>
                </View>
              </View>

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Vamos criar sua conta gov.br através do seu banco?</AppText>
              <AppText variant="caption" color={colors.textMuted}>Não teremos acesso a seus dados bancários, apenas a seu nome e CPF. Escolha o banco que você já usa pela internet:</AppText>

              <View style={styles.govBankGrid}>
                <View style={styles.govBankTile}><Ionicons name="briefcase-outline" size={20} color={colors.primary} /><AppText variant="small" weight="700">Banco de treino A</AppText></View>
                <View style={styles.govBankTile}><Ionicons name="card-outline" size={20} color={colors.primary} /><AppText variant="small" weight="700">Banco de treino B</AppText></View>
                <View style={styles.govBankTile}><Ionicons name="shield-outline" size={20} color={colors.primary} /><AppText variant="small" weight="700">Banco de treino C</AppText></View>
                <View style={styles.govBankTile}><Ionicons name="wallet-outline" size={20} color={colors.primary} /><AppText variant="small" weight="700">Banco de treino D</AppText></View>
              </View>

              <Pressable style={styles.govOutlineBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#1351B4">Tentar de outra forma</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Vamos criar sua conta gov.br confirmando alguns de seus dados pessoais?</AppText>

              <AppText variant="small" weight="700">1. Qual é o primeiro nome da sua mãe?</AppText>
              <View style={styles.govPillGrid}>
                {['MARIA', 'LEONA', 'ESTRELA', 'JEWEL', 'LILA', 'CARMEZINDA', 'NADINA'].map((name) => (
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedMother === name }} accessibilityLabel={`Escolher ${name} como nome fictício`} key={name} onPress={() => setSelectedMother(name)} style={[styles.govPillItem, selectedMother === name && styles.govPillItemActive]}>
                    <AppText variant="small" weight="800" color={selectedMother === name ? '#1351B4' : colors.text}>{name}</AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="small" weight="700">2. Qual é o seu mês de nascimento ?</AppText>
              <View style={styles.govPillGrid}>
                {['MAIO', 'FEVEREIRO', 'DEZEMBRO', 'ABRIL'].map((m) => (
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedMonth === m }} accessibilityLabel={`Escolher mês fictício ${m}`} key={m} onPress={() => setSelectedMonth(m)} style={[styles.govPillItem, selectedMonth === m && styles.govPillItemActive]}>
                    <AppText variant="small" weight="800" color={selectedMonth === m ? '#1351B4' : colors.text}>{m}</AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="small" weight="700">3. Qual é o seu ano de nascimento ?</AppText>
              <View style={styles.govPillGrid}>
                {['1964', '1966', '1962', '1967', '1968', '1963', '1965'].map((y) => (
                  <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedYear === y }} accessibilityLabel={`Escolher ano fictício ${y}`} key={y} onPress={() => setSelectedYear(y)} style={[styles.govPillItem, selectedYear === y && styles.govPillItemActive]}>
                    <AppText variant="small" weight="800" color={selectedYear === y ? '#1351B4' : colors.text}>{y}</AppText>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>
            </View>
          </View>
        );

      case 5:
        // Nova Foto 1: Confirme seus dados para continuar:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Confirme seus dados para continuar:</AppText>

              <View style={styles.govMaskedBox}>
                <AppText variant="caption" color={colors.textMuted}>CPF SIMULADO</AppText>
                <AppText weight="800">***.456.789-**</AppText>
                <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 8 }}>NOME COMPLETO</AppText>
                <AppText weight="800">MARIA DA SILVA (SIMULADO)</AppText>
              </View>

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
              <AppText variant="small" color="#1351B4" style={styles.centerText}>❓ Como altero meus dados?</AppText>
            </View>
          </View>
        );

      case 6:
        // Nova Foto 2 & 3: Canal de Contato com Stepper (1)-(2)-(3)-(4) e Modal de Alerta
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
              <View style={styles.govNavIcons}>
                <Ionicons name="contrast-outline" size={18} color="#1351B4" />
                <Ionicons name="hand-left-outline" size={18} color="#1351B4" />
              </View>
            </View>

            {/* Stepper Header */}
            <View style={styles.govStepperRow}>
              <View style={styles.govStepCircle}><AppText color="#ffffff" weight="800">1</AppText></View>
              <View style={styles.govStepLine} />
              <View style={styles.govStepCircle}><AppText color="#ffffff" weight="800">2</AppText></View>
              <View style={styles.govStepLine} />
              <View style={[styles.govStepCircle, styles.govStepCircleActive]}><AppText color="#ffffff" weight="800">3</AppText></View>
              <View style={styles.govStepLine} />
              <View style={styles.govStepCircle}><AppText color="#ffffff" weight="800">4</AppText></View>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Enviaremos um código para ativar sua conta gov.br.</AppText>
              <AppText variant="small" color={colors.textMuted}>Informe um contato para recebê-lo.</AppText>

              <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedChannel === 'email' }} accessibilityLabel="Receber código fictício por e-mail" style={styles.govRadioRow} onPress={() => setSelectedChannel('email')}>
                <Ionicons name={selectedChannel === 'email' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#1351B4" />
                <Ionicons name="mail-outline" size={20} color="#1351B4" />
                <AppText weight="700">Por e-mail</AppText>
              </Pressable>

              <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedChannel === 'phone' }} accessibilityLabel="Receber código fictício por telefone" style={styles.govRadioRow} onPress={() => setSelectedChannel('phone')}>
                <Ionicons name={selectedChannel === 'phone' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#1351B4" />
                <Ionicons name="phone-portrait-outline" size={20} color="#1351B4" />
                <AppText weight="700">Por telefone celular</AppText>
              </Pressable>

              <View style={styles.govFieldBlock}>
                <View style={styles.govInputMockGreen}>
                  <AppText weight="800" color="#1351B4">(61) 9999-9999</AppText>
                </View>
              </View>

              {/* Modal Dialog de Atenção se ativo */}
              {showWarningModal ? (
                <View style={styles.govModalAlert}>
                  <View style={styles.govModalBadge}><Ionicons name="warning" size={24} color="#ffffff" /></View>
                  <AppText variant="heading" weight="900" style={styles.centerText}>Atenção</AppText>
                  <AppText variant="small" color={colors.textMuted} style={styles.centerText}>
                    O contato que você informar será o <AppText weight="800">contato cadastrado para sua conta gov.br</AppText>. Ele será usado para recuperar senha, ativar a conta e confirmar outras transações.
                  </AppText>

                  <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" style={styles.govOutlineBtn} onPress={() => setShowWarningModal(false)}>
                    <AppText weight="800" color="#1351B4">OK</AppText>
                  </Pressable>
                </View>
              ) : null}

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
            </View>
          </View>
        );

      case 7:
        // Nova Foto 4: Digite o código recebido em:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Digite o código recebido em:</AppText>
              <AppText weight="800">(61) *****-9999</AppText>

              <View style={styles.govFieldBlock}>
                <View style={styles.govInputMockGreen}>
                  <AppText color={colors.textMuted}>849201 (simulado)</AppText>
                </View>
              </View>

              <AppText variant="small" color={colors.textMuted}>Não recebeu o código? <AppText variant="small" color="#1351B4" weight="800">Reenviar código</AppText></AppText>

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>

              <Pressable accessibilityRole="button" accessibilityLabel="Sair do treino e voltar aos detalhes" style={styles.govOutlineBtn} onPress={() => router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })}>
                <AppText weight="800" color="#1351B4">Voltar aos detalhes da missão</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
            </View>
          </View>
        );

      case 8:
        // Nova Foto 5: Cadastre uma senha para sua conta gov.br com checklist oficial de 5 regras
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Cadastre uma senha para sua conta gov.br.</AppText>
              <AppText variant="small" color={colors.textMuted}>CPF: <AppText weight="800">***.456.789-**</AppText></AppText>

              <View style={styles.govFieldBlock}>
                <AppText variant="caption" weight="700">Senha</AppText>
                <View style={styles.govInputMockRow}>
                  <AppText color={colors.text} style={styles.flex1}>••••••••••••</AppText>
                  <Ionicons name="eye-outline" size={20} color="#1351B4" />
                </View>
              </View>

              <View style={styles.govChecklistBlock}>
                <AppText variant="small" weight="800" color="#1351B4">Sua senha deve conter:</AppText>
                <View style={styles.govCheckItem}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><AppText variant="small" weight="700" color={colors.success}>de 8 à 70 caracteres</AppText></View>
                <View style={styles.govCheckItem}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><AppText variant="small" weight="700" color={colors.success}>letra minúscula</AppText></View>
                <View style={styles.govCheckItem}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><AppText variant="small" weight="700" color={colors.success}>letra maiúscula</AppText></View>
                <View style={styles.govCheckItem}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><AppText variant="small" weight="700" color={colors.success}>número</AppText></View>
                <View style={styles.govCheckItem}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><AppText variant="small" weight="700" color={colors.success}>símbolo (Ex: !@#%$)</AppText></View>
              </View>

              <View style={styles.govFieldBlock}>
                <AppText variant="caption" weight="700">Confirmar Senha</AppText>
                <View style={styles.govInputMockRow}>
                  <AppText color={colors.text} style={styles.flex1}>••••••••••••</AppText>
                  <Ionicons name="eye-outline" size={20} color="#1351B4" />
                </View>
              </View>

              <Pressable style={styles.govPrimaryBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="800" color="#ffffff">Continuar</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color={colors.primary}>Portal de serviços · TREINO</AppText>
              <View style={styles.govAccessibilityBadge}>
                <Ionicons name="accessibility" size={22} color="#ffffff" />
              </View>
            </View>

            <View style={[styles.govCardInternal, styles.govSuccessContent]}>
              <View style={styles.govConfettiRow} accessibilityElementsHidden>
                {['#1351B4', '#E6AC00', '#009B3A', '#D93B3B', '#7C3AED'].map((color, index) => (
                  <View key={color} style={[styles.govConfettiDot, { backgroundColor: color, transform: [{ rotate: `${index * 18}deg` }] }]} />
                ))}
              </View>
              <AppText variant="title" weight="900" color="#1351B4" style={styles.centerText}>Parabéns!</AppText>
              <AppText style={styles.centerText}>Você concluiu a criação de uma <AppText weight="900">conta gov.br simulada!</AppText></AppText>

              <View style={styles.govBronzeRow}>
                <View style={styles.govBronzeCard}>
                  <View style={styles.govBronzeBarLight} />
                  <View style={styles.govBronzeBarMedium} />
                  <View style={styles.govBronzeBarDark} />
                </View>
                <AppText variant="subheading">Sua conta fictícia é nível <AppText variant="subheading" weight="900" color="#A24F3D">BRONZE</AppText></AppText>
              </View>

              <View style={styles.govInfoRow}>
                <Ionicons name="information-circle" size={25} color={colors.text} />
                <AppText variant="small" style={styles.flex1}>Em um processo real, você poderia retornar ao serviço e entrar com sua conta gov.br.</AppText>
              </View>

              <View style={styles.govSimulationNotice}>
                <Ionicons name="shield-checkmark" size={24} color={colors.success} />
                <AppText variant="small" weight="800" color={colors.successText} style={styles.flex1}>Isto foi apenas um treinamento. Nenhuma conta real foi criada e nenhum dado foi enviado.</AppText>
              </View>

              <Pressable accessibilityRole="button" accessibilityLabel="Concluir treinamento da conta Gov.br" style={styles.govOutlineBtn} disabled={engine.busy} onPress={handleNextStep}>
                <AppText weight="900" color="#1351B4">Concluir</AppText>
              </Pressable>
              <AppText variant="small" color="#1351B4" style={styles.centerText}>Saiba mais sobre os níveis da conta gov.br</AppText>
            </View>
          </View>
        );
    }
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
      <SimulationIdentityNotice reference="Gov.br" />
      <SyncStatusCard engine={engine} />
      <Card style={styles.govFrame}>{renderGovScreen()}</Card>
      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}>
          <AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText>
          <Tag label="Simulação segura" tone="green" />
        </View>
        <AppText variant="subheading" weight="800">{step.title}</AppText>
        <AppText color={colors.textMuted}>{step.instruction}</AppText>
        <ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
      </Card>
      {engine.run.lastAnswerCorrect === false ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
      {engine.run.usedHint || engine.run.usedHelp ? <Card style={styles.hints}><AppText weight="800">{engine.run.usedHelp ? 'Ajuda passo a passo' : 'Dicas deste passo'}</AppText>{step.hints.map((hint) => <AppText key={hint}>• {hint}</AppText>)}</Card> : null}
      <View style={styles.supportActions}>
        <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
        <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
      </View>
    </Screen>
  );
}

function AppEnvironmentFlow({ assignmentId, assessmentId, details, steps, engine, playInstruction, router, presentation }: { assignmentId: string; assessmentId?: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[]; engine: ReturnType<typeof useMissionEngine>; playInstruction: (text: string) => void; router: ReturnType<typeof useRouter>; presentation: 'messaging' | 'mobility' | 'app-store' | 'marketplace' | 'phone-call' }) {
  const step = engine.currentStep;
  const [environmentQuery, setEnvironmentQuery] = useState('');
  if (!step) return null;
  const config = {
    messaging: { app: 'Mensagens de treino', icon: 'chatbubble-ellipses-outline' as const, accent: '#176B5B', label: 'Conversa fictícia' },
    mobility: { app: 'Mobilidade de treino', icon: 'car-outline' as const, accent: '#28323C', label: 'Mapa fictício' },
    'app-store': { app: 'Loja de treino', icon: 'apps-outline' as const, accent: '#1769AA', label: 'Aplicativos fictícios' },
    marketplace: { app: 'Loja virtual de treino', icon: 'bag-handle-outline' as const, accent: '#A63A2B', label: 'Compra fictícia' },
    'phone-call': { app: 'Chamada de treino', icon: 'call-outline' as const, accent: '#315A88', label: 'Ligação fictícia' },
  }[presentation];

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
      <SimulationIdentityNotice reference={config.app} />
      <SyncStatusCard engine={engine} />
      <Card style={styles.environmentFrame}>
        <View style={[styles.environmentHeader, { backgroundColor: config.accent }]}>
          <View style={styles.environmentHeaderIcon}><Ionicons name={config.icon} size={25} color={colors.surface} /></View>
          <View style={styles.flex1}><AppText variant="caption" color={colors.surface}>AMBIENTE EDUCATIVO</AppText><AppText weight="900" color={colors.surface}>{config.app}</AppText></View>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.surface} />
        </View>
        <View style={styles.environmentToolbar}><Pressable accessibilityRole="button" accessibilityLabel="Voltar aos detalhes da missão" hitSlop={10} onPress={() => router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><AppText variant="small" weight="800">{config.label}</AppText><Tag label={`ETAPA ${step.position}/${steps.length}`} tone="purple" /></View>
        {presentation === 'app-store' ? (
          <AppStoreExperience step={step} busy={engine.busy} query={environmentQuery} onQueryChange={setEnvironmentQuery} onSubmit={engine.submit} accent={config.accent} />
        ) : presentation === 'mobility' ? (
          <MobilityExperience step={step} busy={engine.busy} query={environmentQuery} onQueryChange={setEnvironmentQuery} onSubmit={engine.submit} accent={config.accent} />
        ) : presentation === 'marketplace' ? (
          <MarketplaceExperience step={step} busy={engine.busy} query={environmentQuery} onQueryChange={setEnvironmentQuery} onSubmit={engine.submit} />
        ) : (
          <><EnvironmentScene presentation={presentation} step={step} accent={config.accent} query={environmentQuery} onQueryChange={setEnvironmentQuery} /><EnvironmentActions step={step} busy={engine.busy} accent={config.accent} onSubmit={engine.submit} /></>
        )}
        <View style={styles.environmentHomeIndicator} />
      </Card>
      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}><AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText><Tag label="Simulação segura" tone="green" /></View>
        <AppText variant="subheading" weight="800">{step.title}</AppText><AppText color={colors.textMuted}>{step.instruction}</AppText><ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
      </Card>
      {engine.run.lastAnswerCorrect === false ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Essa ação não é a mais segura. Nada aconteceu de verdade; tente outra opção.</AppText></Card> : null}
      <View style={styles.supportActions}><Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} /><Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} /></View>
    </Screen>
  );
}

function MarketplaceExperience({ step, busy, query, onQueryChange, onSubmit }: { step: ParticipantMissionStep; busy: boolean; query: string; onQueryChange: (value: string) => void; onSubmit: (action: MissionAction) => Promise<void> }) {
  const [payment, setPayment] = useState<'pix' | 'card'>('pix');
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [variant, setVariant] = useState<'branca' | 'preta'>('branca');
  const [cartSelected, setCartSelected] = useState(true);
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [sellerMessage, setSellerMessage] = useState('');
  const [delivery, setDelivery] = useState<'standard' | 'express'>('standard');
  const [checkoutStage, setCheckoutStage] = useState<'details' | 'review' | 'success'>('details');
  const searched = query.trim().length >= 3;

  if (step.position === 1) return <View style={styles.marketplaceScreen}>
    <View style={styles.marketplaceTopBar}><View><AppText variant="caption" weight="900" color={colors.surface}>AMBIENTE EDUCATIVO</AppText><AppText variant="heading" weight="900" color={colors.surface}>Compra Fácil</AppText></View><View style={styles.marketplaceTopIcons}><View style={styles.marketplaceHeaderIcon}><Ionicons name="cart-outline" size={27} color={colors.surface} /></View><View style={styles.marketplaceHeaderIcon}><Ionicons name="chatbubble-ellipses-outline" size={25} color={colors.surface} /><View style={styles.marketplaceNotificationBadge}><AppText variant="caption" weight="900" color={colors.surface}>1</AppText></View></View></View></View>
    <View style={styles.marketplaceSearch}><Ionicons name="search" size={23} color="#E45A37" /><TextInput accessibilityLabel="Pesquisar produto fictício" onChangeText={onQueryChange} placeholder="Buscar na loja de treino" placeholderTextColor={colors.placeholder} returnKeyType="search" style={styles.marketplaceSearchInput} value={query} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => onQueryChange('')}><Ionicons name="close-circle" size={22} color={colors.textMuted} /></Pressable> : null}</View>
    <View style={styles.marketplacePromo}><View style={styles.marketplacePromoCopy}><Tag label="TREINO SEGURO" tone="green" /><AppText variant="subheading" weight="900" color={colors.surface}>Ofertas educativas</AppText><AppText variant="small" color={colors.surface}>Aprenda a comparar preço, loja, frete e avaliações</AppText><View style={styles.marketplacePromoDots}><View style={styles.marketplacePromoDotActive} /><View style={styles.marketplacePromoDot} /><View style={styles.marketplacePromoDot} /></View></View><Ionicons name="bag-handle" size={65} color={colors.surface} /></View>
    <View style={styles.marketplaceShortcuts}><MarketplaceShortcut icon="ticket-outline" label="Cupons" /><MarketplaceShortcut icon="storefront-outline" label="Lojas" /><MarketplaceShortcut icon="videocam-outline" label="Vídeos" /><MarketplaceShortcut icon="person-outline" label="Conta" /></View>
    <AppText variant="subheading" weight="900">Sugestões de treinamento</AppText>
    <View style={styles.marketplaceGrid}><MarketplaceProduct icon="bulb-outline" title="Luminária de leitura" price="R$ 30,00" sold="340 vendidos" onPress={() => { onQueryChange('Luminária de leitura'); void onSubmit({ action: 'continue' }); }} /><MarketplaceProduct icon="leaf-outline" title="Kit de jardinagem" price="R$ 42,00" sold="82 vendidos" /></View>
    <View style={styles.mobilityPrivacyNote}><Ionicons name="shield-checkmark" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Todos os produtos, lojas e preços são fictícios.</AppText></View>
    <Button label="Pesquisar produto" icon="search" disabled={!searched || busy} onPress={() => void onSubmit({ action: 'continue' })} />
    <MarketplaceBottomNav active="home" />
  </View>;

  if (step.position === 2 && listingOpen) return <View style={styles.marketplaceScreen}>
    <View style={styles.marketplacePageTitle}><Pressable accessibilityRole="button" accessibilityLabel="Voltar aos resultados" onPress={() => setListingOpen(false)}><Ionicons name="arrow-back" size={26} color="#E45A37" /></Pressable><View style={styles.marketplaceTopIcons}><Ionicons name="share-social-outline" size={24} color={colors.text} /><Pressable accessibilityRole="button" accessibilityLabel={cartAdded ? 'Abrir carrinho com um produto' : 'Carrinho vazio'} disabled={!cartAdded || busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'safe-listing' })} style={styles.marketplaceCartIcon}><Ionicons name="cart-outline" size={27} color="#E45A37" />{cartAdded ? <View style={styles.marketplaceCartBadge}><AppText variant="caption" weight="900" color={colors.surface}>1</AppText></View> : null}</Pressable></View></View>
    <View style={styles.marketplaceProductHero}><Ionicons name="bulb-outline" size={92} color="#E45A37" /><View style={styles.marketplaceGalleryDots}><View style={styles.marketplaceGalleryDotActive} /><View style={styles.marketplaceGalleryDot} /><View style={styles.marketplaceGalleryDot} /></View></View>
    <AppText variant="heading" weight="900">Luminária de leitura ajustável</AppText>
    <View style={styles.marketplaceRatingRow}><AppText weight="900" color="#E45A37">4,8 ★</AppText><AppText variant="small" color={colors.textMuted}>126 avaliações</AppText><AppText variant="small" color={colors.textMuted}>340 vendidos</AppText></View>
    <AppText variant="heading" weight="900" color="#E45A37">R$ 30,00</AppText>
    <View style={styles.marketplaceSellerCard}><View style={styles.marketplaceSellerAvatar}><Ionicons name="storefront" size={26} color="#E45A37" /></View><View style={styles.flex1}><AppText weight="900">Casa Clara — Loja Exemplo</AppText><AppText variant="small" color={colors.textMuted}>4,9 ★ · responde rapidamente</AppText></View><Tag label="BEM AVALIADA" tone="green" /></View>
    <View style={styles.marketplaceCheckoutCard}><AppText weight="900">Escolha a cor</AppText><View style={styles.marketplaceVariationRow}>{(['branca', 'preta'] as const).map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: variant === item }} onPress={() => setVariant(item)} style={[styles.marketplaceVariation, variant === item && styles.marketplaceVariationSelected]}><AppText weight="800">{item === 'branca' ? 'Branca' : 'Preta'}</AppText></Pressable>)}</View><View style={styles.marketplaceTotalRow}><AppText>Quantidade</AppText><View style={styles.marketplaceQuantity}><Ionicons name="remove" size={20} color={colors.textMuted} /><AppText weight="900">1</AppText><Ionicons name="add" size={20} color={colors.textMuted} /></View></View></View>
    <View style={styles.marketplaceProtection}><Ionicons name="shield-checkmark" size={24} color={colors.success} /><View style={styles.flex1}><AppText weight="900">Compra protegida no ambiente de treino</AppText><AppText variant="small" color={colors.textMuted}>Confira sempre avaliações, descrição e pagamento dentro do aplicativo.</AppText></View></View>
    {cartAdded ? <View style={styles.marketplaceAddedNotice}><Ionicons name="checkmark-circle" size={26} color={colors.success} /><View style={styles.flex1}><AppText weight="900" color={colors.successText}>Produto adicionado ao carrinho</AppText><AppText variant="small" color={colors.successText}>Toque em “Ir para o carrinho” para continuar.</AppText></View></View> : null}
    {cartAdded ? <View style={styles.marketplaceCartActions}><Button label="Continuar comprando" variant="secondary" onPress={() => setListingOpen(false)} /><Button label="Ir para o carrinho (1)" icon="cart-outline" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'safe-listing' })} /></View> : <Button label="Adicionar ao carrinho" icon="cart-outline" disabled={busy} onPress={() => setCartAdded(true)} />}
    <MarketplaceBottomNav active="home" cartCount={cartAdded ? 1 : 0} />
  </View>;

  if (step.position === 2) return <View style={styles.marketplaceScreen}>
    <View style={styles.marketplaceSearch}><Ionicons name="arrow-back" size={22} color={colors.text} /><AppText style={styles.flex1}>{query || 'Luminária de leitura'}</AppText><Pressable accessibilityRole="button" accessibilityLabel={cartAdded ? 'Abrir carrinho com um produto' : 'Carrinho vazio'} disabled={!cartAdded || busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'safe-listing' })} style={styles.marketplaceCartIcon}><Ionicons name="cart-outline" size={25} color="#E45A37" />{cartAdded ? <View style={styles.marketplaceCartBadge}><AppText variant="caption" weight="900" color={colors.surface}>1</AppText></View> : null}</Pressable></View>
    <AppText variant="caption" weight="900" color={colors.textMuted}>COMPARE ANTES DE COMPRAR</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir anúncio seguro" disabled={busy} onPress={() => setListingOpen(true)} style={({ pressed }) => [styles.marketplaceListing, styles.marketplaceListingSafe, pressed && styles.bankActionRowPressed]}><View style={styles.marketplaceProductImage}><Ionicons name="bulb-outline" size={48} color="#E45A37" /></View><View style={styles.flex1}><Tag label="LOJA BEM AVALIADA" tone="green" /><AppText weight="900">Luminária de leitura ajustável</AppText><AppText variant="small" color={colors.textMuted}>Casa Clara — Loja Exemplo</AppText><AppText variant="small" weight="900" color="#E45A37">R$ 30,00</AppText><AppText variant="caption" color={colors.success}>4,8 ★ · 126 avaliações · 340 vendidos</AppText></View><Ionicons name="chevron-forward" size={24} color={colors.textMuted} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher anúncio inseguro" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'unsafe-listing' })} style={({ pressed }) => [styles.marketplaceListing, pressed && styles.bankActionRowPressed]}><View style={[styles.marketplaceProductImage, styles.marketplaceProductImageRisk]}><Ionicons name="warning-outline" size={45} color={colors.danger} /></View><View style={styles.flex1}><Tag label="ATENÇÃO" tone="red" /><AppText weight="900">Oferta sem identificação</AppText><AppText variant="small" color={colors.danger}>Pagamento solicitado por mensagem</AppText><AppText variant="small" weight="900" color={colors.danger}>R$ 5,00</AppText></View></Pressable>
    <MarketplaceBottomNav active="home" cartCount={cartAdded ? 1 : 0} />
  </View>;

  if (step.position === 3) return <View style={styles.marketplaceScreen}>
    <View style={styles.marketplacePageTitle}><Ionicons name="arrow-back" size={25} color="#E45A37" /><AppText variant="heading" weight="900">Carrinho (1)</AppText><AppText color={colors.textMuted}>Editar</AppText></View>
    <View style={styles.marketplaceCartCard}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: cartSelected }} onPress={() => setCartSelected((value) => !value)} style={styles.marketplaceStoreRow}><Ionicons name={cartSelected ? 'checkbox' : 'square-outline'} size={25} color="#E45A37" /><Tag label="INDICADO" tone="green" /><AppText weight="900">Casa Clara</AppText></Pressable><View style={styles.marketplaceCartProduct}><View style={styles.marketplaceProductImage}><Ionicons name="bulb-outline" size={44} color="#E45A37" /></View><View style={styles.flex1}><AppText weight="800">Luminária de leitura ajustável</AppText><AppText variant="small" color={colors.textMuted}>Cor: {variant} · Quantidade: 1</AppText><AppText weight="900" color="#E45A37">R$ 30,00</AppText></View><View style={styles.marketplaceQuantity}><Ionicons name="remove" size={18} color={colors.textMuted} /><AppText weight="900">1</AppText><Ionicons name="add" size={18} color={colors.textMuted} /></View></View><Pressable accessibilityRole="button" onPress={() => setCouponOpen((value) => !value)} style={styles.marketplaceCouponRow}><Ionicons name="ticket-outline" size={22} color="#E45A37" /><AppText style={styles.flex1}>Cupom da loja</AppText><AppText variant="small" color="#E45A37">{couponOpen ? 'Fechar' : 'Inserir código'}</AppText></Pressable>{couponOpen ? <View style={styles.marketplaceCouponInputRow}><TextInput accessibilityLabel="Código de cupom fictício" onChangeText={setCoupon} placeholder="Digite um cupom fictício" placeholderTextColor={colors.placeholder} style={styles.marketplaceCouponInput} value={coupon} /><Button label="Aplicar" variant="soft" onPress={() => setCoupon('SEM CUPOM DISPONÍVEL')} /></View> : null}</View>
    <View style={styles.marketplaceTotals}><View style={styles.marketplaceTotalRow}><AppText>Subtotal do produto</AppText><AppText>R$ 30,00</AppText></View><View style={styles.marketplaceTotalRow}><AppText>Frete</AppText><AppText>R$ 8,00</AppText></View><View style={styles.marketplaceDivider} /><View style={styles.marketplaceTotalRow}><AppText weight="900">Total</AppText><AppText weight="900" color="#E45A37">R$ 38,00</AppText></View></View>
    {!cartSelected ? <View style={styles.marketplaceWarning}><Ionicons name="information-circle" size={22} color={colors.warning} /><AppText variant="small" style={styles.flex1}>Marque o produto para continuar a compra.</AppText></View> : null}
    <View style={styles.marketplaceCheckoutBar}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: cartSelected }} accessibilityLabel="Selecionar todos os produtos" onPress={() => setCartSelected((value) => !value)} style={styles.marketplaceSelectAll}><Ionicons name={cartSelected ? 'checkbox' : 'square-outline'} size={27} color="#E45A37" /><AppText variant="small">Tudo</AppText></Pressable><View style={styles.marketplaceCheckoutTotal}><View style={styles.marketplaceFreightLine}><Ionicons name="car-outline" size={17} color={colors.success} /><AppText variant="caption" color={colors.success}>Frete R$ 8,00</AppText></View><View style={styles.marketplaceTotalInline}><AppText variant="small">Total</AppText><AppText variant="subheading" weight="900" color="#E45A37">R$ 38,00</AppText></View></View><Pressable accessibilityRole="button" accessibilityLabel="Continuar com um produto, total de trinta e oito reais" disabled={busy || !cartSelected} onPress={() => void onSubmit({ action: 'choose', optionId: 'total-38' })} style={({ pressed }) => [styles.marketplaceContinueButton, (!cartSelected || busy) && styles.marketplaceContinueButtonDisabled, pressed && styles.bankActionRowPressed]}><AppText weight="900" color={colors.surface}>Continuar (1)</AppText></Pressable></View>
    <MarketplaceBottomNav active="cart" cartCount={1} />
  </View>;

  if (checkoutStage === 'success') return <View style={styles.marketplaceSuccessScreen}>
    <View style={styles.marketplaceSuccessCircle}><Ionicons name="checkmark" size={55} color={colors.surface} /></View><AppText variant="heading" weight="900" style={styles.center}>Pedido fictício confirmado!</AppText><AppText color={colors.textMuted} style={styles.center}>Você praticou todo o caminho de uma compra sem gastar dinheiro.</AppText><View style={styles.marketplaceCheckoutCard}><View style={styles.marketplaceTotalRow}><AppText color={colors.textMuted}>Número de treino</AppText><AppText weight="900">SIM-2026-001</AppText></View><View style={styles.marketplaceTotalRow}><AppText color={colors.textMuted}>Pagamento</AppText><AppText weight="900">{payment === 'pix' ? 'Pix fictício' : 'Cartão fictício'}</AppText></View><View style={styles.marketplaceTotalRow}><AppText color={colors.textMuted}>Total</AppText><AppText weight="900" color="#E45A37">R$ 38,00</AppText></View></View><View style={styles.mobilityPrivacyNote}><Ionicons name="shield-checkmark" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Este comprovante é apenas educativo. Nenhum pedido foi enviado.</AppText></View><Button label="Concluir missão" icon="checkmark-circle-outline" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'finish-training' })} />
  </View>;

  if (checkoutStage === 'review') return <View style={styles.marketplaceScreen}>
    <View style={styles.marketplacePageTitle}><Pressable accessibilityRole="button" accessibilityLabel="Voltar e editar pedido" onPress={() => setCheckoutStage('details')}><Ionicons name="arrow-back" size={25} color="#E45A37" /></Pressable><AppText variant="heading" weight="900">Confirme seu pedido</AppText><View style={{ width: 25 }} /></View>
    <View style={styles.marketplaceCheckoutCard}><AppText weight="900">Entrega</AppText><AppText>{address}</AppText><AppText variant="small" color={colors.textMuted}>{delivery === 'standard' ? 'Entrega padrão · prazo fictício de 5 dias' : 'Entrega rápida · prazo fictício de 2 dias'}</AppText></View>
    <View style={styles.marketplaceCheckoutCard}><AppText weight="900">Produto</AppText><View style={styles.marketplaceCartProduct}><View style={styles.marketplaceProductImage}><Ionicons name="bulb-outline" size={42} color="#E45A37" /></View><View style={styles.flex1}><AppText weight="900">Luminária de leitura ajustável</AppText><AppText variant="small" color={colors.textMuted}>Cor: {variant} · 1 unidade</AppText></View><AppText weight="900">R$ 30,00</AppText></View></View>
    <View style={styles.marketplaceCheckoutCard}><View style={styles.marketplaceTotalRow}><AppText>Produto</AppText><AppText>R$ 30,00</AppText></View><View style={styles.marketplaceTotalRow}><AppText>Frete</AppText><AppText>R$ 8,00</AppText></View><View style={styles.marketplaceTotalRow}><AppText>Pagamento</AppText><AppText>{payment === 'pix' ? 'Pix fictício' : 'Cartão •••• 4242'}</AppText></View><View style={styles.marketplaceDivider} /><View style={styles.marketplaceTotalRow}><AppText variant="subheading" weight="900">Total</AppText><AppText variant="subheading" weight="900" color="#E45A37">R$ 38,00</AppText></View></View>
    <Button label="Confirmar pedido fictício" icon="shield-checkmark-outline" disabled={busy} onPress={() => setCheckoutStage('success')} />
  </View>;

  return <View style={styles.marketplaceScreen}>
    <View style={styles.marketplacePageTitle}><Ionicons name="arrow-back" size={25} color="#E45A37" /><AppText variant="heading" weight="900">Revisar pedido</AppText></View>
    <View style={styles.marketplaceCheckoutCard}><AppText variant="caption" weight="900" color={colors.textMuted}>ENDEREÇO FICTÍCIO</AppText><View style={[styles.marketplaceAddressRow, addressError && styles.marketplaceAddressRowError]}><Ionicons name="location" size={24} color={addressError ? colors.danger : '#E45A37'} /><TextInput accessibilityLabel="Endereço fictício de entrega" onChangeText={(value) => { setAddress(value); if (value.trim()) setAddressError(false); }} placeholder="Ex.: Rua das Flores, 100" placeholderTextColor={colors.placeholder} style={styles.marketplaceAddressInput} value={address} /></View>{addressError ? <AppText variant="small" weight="800" color={colors.danger}>Informe um endereço fictício para continuar.</AppText> : null}<Pressable accessibilityRole="button" onPress={() => { setAddress('Rua das Flores, 100 — Centro'); setAddressError(false); }} style={styles.marketplaceFakeAddressButton}><Ionicons name="sparkles-outline" size={20} color="#E45A37" /><AppText variant="small" weight="900" color="#E45A37">Usar endereço fictício de treino</AppText></Pressable><AppText variant="caption" color={colors.textMuted}>Para sua segurança, não use seu endereço real neste treinamento.</AppText></View>
    <View style={styles.marketplaceCheckoutCard}><View style={styles.marketplaceCartProduct}><View style={styles.marketplaceProductImage}><Ionicons name="bulb-outline" size={42} color="#E45A37" /></View><View style={styles.flex1}><AppText weight="900">Luminária de leitura ajustável</AppText><AppText variant="small" color={colors.textMuted}>Cor: {variant} · 1 unidade</AppText><AppText weight="900" color="#E45A37">R$ 30,00</AppText></View></View><AppText weight="900">Opção de entrega</AppText><Pressable accessibilityRole="radio" accessibilityState={{ checked: delivery === 'standard' }} onPress={() => setDelivery('standard')} style={[styles.marketplaceDeliveryOption, delivery === 'standard' && styles.marketplaceDeliverySelected]}><Ionicons name="cube-outline" size={25} color="#E45A37" /><View style={styles.flex1}><AppText weight="900">Entrega padrão</AppText><AppText variant="small" color={colors.textMuted}>Prazo fictício de 5 dias</AppText></View><AppText weight="900">R$ 8,00</AppText></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ checked: delivery === 'express' }} onPress={() => setDelivery('express')} style={[styles.marketplaceDeliveryOption, delivery === 'express' && styles.marketplaceDeliverySelected]}><Ionicons name="flash-outline" size={25} color="#E45A37" /><View style={styles.flex1}><AppText weight="900">Entrega rápida</AppText><AppText variant="small" color={colors.textMuted}>Prazo fictício de 2 dias</AppText></View><AppText variant="small" color={colors.textMuted}>Indisponível no treino</AppText></Pressable><TextInput accessibilityLabel="Mensagem fictícia para o vendedor" onChangeText={setSellerMessage} placeholder="Mensagem para o vendedor (opcional)" placeholderTextColor={colors.placeholder} style={styles.marketplaceSellerInput} value={sellerMessage} /><View style={styles.marketplaceDivider} /><View style={styles.marketplaceTotalRow}><AppText weight="900">Total</AppText><AppText weight="900" color="#E45A37">R$ 38,00</AppText></View></View>
    <View style={styles.marketplaceCheckoutCard}><AppText variant="subheading" weight="900">Método de pagamento</AppText><Pressable accessibilityRole="radio" accessibilityState={{ checked: payment === 'pix' }} onPress={() => setPayment('pix')} style={styles.marketplacePaymentRow}><Ionicons name="qr-code-outline" size={26} color="#24A99B" /><AppText style={styles.flex1}>Pix</AppText><Ionicons name={payment === 'pix' ? 'radio-button-on' : 'radio-button-off'} size={25} color="#E45A37" /></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ checked: payment === 'card' }} onPress={() => setPayment('card')} style={styles.marketplacePaymentRow}><Ionicons name="card-outline" size={26} color="#3478F6" /><View style={styles.flex1}><AppText>Cartão de crédito</AppText><AppText variant="caption" color={colors.textMuted}>Cartão fictício •••• 4242</AppText></View><Ionicons name={payment === 'card' ? 'radio-button-on' : 'radio-button-off'} size={25} color="#E45A37" /></Pressable></View>
    <View style={styles.mobilityPrivacyNote}><Ionicons name="shield-checkmark" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Finalizar encerra somente o treino. Nenhum pedido ou pagamento será criado.</AppText></View>
    <View style={styles.marketplaceOrderBar}><View><AppText variant="caption" color={colors.textMuted}>Total</AppText><AppText variant="subheading" weight="900" color="#E45A37">R$ 38,00</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Fazer pedido fictício, total de trinta e oito reais" disabled={busy} onPress={() => { if (!address.trim()) { setAddressError(true); return; } setCheckoutStage('review'); }} style={({ pressed }) => [styles.marketplacePlaceOrderButton, busy && styles.marketplaceContinueButtonDisabled, pressed && styles.bankActionRowPressed]}><AppText weight="900" color={colors.surface}>FAZER PEDIDO</AppText></Pressable></View>
  </View>;
}

function MarketplaceShortcut({ icon, label }: { icon: 'ticket-outline' | 'storefront-outline' | 'videocam-outline' | 'person-outline'; label: string }) {
  return <View style={styles.marketplaceShortcut}><View style={styles.marketplaceShortcutIcon}><Ionicons name={icon} size={23} color="#E45A37" /></View><AppText variant="caption" style={styles.center}>{label}</AppText></View>;
}

function MarketplaceProduct({ icon, title, price, sold, onPress }: { icon: 'bulb-outline' | 'leaf-outline'; title: string; price: string; sold: string; onPress?: () => void }) {
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `Abrir ${title}` : undefined} onPress={onPress} style={({ pressed }) => [styles.marketplaceProductTile, pressed && styles.bankActionRowPressed]}><View style={styles.marketplaceProductTileImage}><Ionicons name={icon} size={52} color="#E45A37" /><View style={styles.marketplaceDiscountBadge}><AppText variant="caption" weight="900" color={colors.surface}>-20%</AppText></View></View><AppText variant="small" weight="800" numberOfLines={2}>{title}</AppText><AppText weight="900" color="#E45A37">{price}</AppText><View style={styles.marketplaceProductMeta}><AppText variant="caption" color={colors.textMuted}>{sold}</AppText><AppText variant="caption" color="#E6A300">4,8 ★</AppText></View></Pressable>;
}

function MarketplaceBottomNav({ active, cartCount = 0 }: { active: 'home' | 'cart'; cartCount?: number }) {
  const items = [
    { key: 'home', icon: 'home-outline' as const, label: 'Início' },
    { key: 'feed', icon: 'play-circle-outline' as const, label: 'Vídeos' },
    { key: 'notifications', icon: 'notifications-outline' as const, label: 'Notificações' },
    { key: 'cart', icon: 'cart-outline' as const, label: 'Carrinho' },
    { key: 'account', icon: 'person-outline' as const, label: 'Eu' },
  ];
  return <View style={styles.marketplaceBottomNav}>{items.map((item) => <View key={item.key} style={styles.marketplaceBottomNavItem}><View style={styles.marketplaceBottomIcon}><Ionicons name={item.icon} size={23} color={active === item.key ? '#E45A37' : colors.textMuted} />{item.key === 'cart' && cartCount > 0 ? <View style={styles.marketplaceBottomBadge}><AppText variant="caption" weight="900" color={colors.surface}>{cartCount}</AppText></View> : null}</View><AppText variant="caption" weight={active === item.key ? '900' : '500'} color={active === item.key ? '#E45A37' : colors.textMuted}>{item.label}</AppText></View>)}</View>;
}

function MobilityExperience({ step, busy, query, onQueryChange, onSubmit, accent }: { step: ParticipantMissionStep; busy: boolean; query: string; onQueryChange: (value: string) => void; onSubmit: (action: MissionAction) => Promise<void>; accent: string }) {
  const [pickupReview, setPickupReview] = useState(false);
  const [editingAddresses, setEditingAddresses] = useState(false);
  const [originAddress, setOriginAddress] = useState('Rua das Flores, 120');
  const [mobilityApp, setMobilityApp] = useState<'uber' | '99'>('uber');
  const [mobilityLoggedIn, setMobilityLoggedIn] = useState(false);
  const [loginStage, setLoginStage] = useState<'welcome' | 'phone' | 'code' | 'profile' | 'password' | 'terms'>('welcome');
  const [accountFlow, setAccountFlow] = useState<'login' | 'signup'>('signup');
  const [trainingPhone, setTrainingPhone] = useState('(83) 90000-0000');
  const [trainingCode, setTrainingCode] = useState('');
  const [trainingFirstName, setTrainingFirstName] = useState('');
  const [trainingLastName, setTrainingLastName] = useState('');
  const [trainingEmail, setTrainingEmail] = useState('');
  const [trainingPassword, setTrainingPassword] = useState('');
  const [trainingLanguage, setTrainingLanguage] = useState<'Português' | 'English'>('Português');
  const [trainingTermsAccepted, setTrainingTermsAccepted] = useState(false);
  const [ridePhase, setRidePhase] = useState<'options' | 'pickup' | 'payment' | 'confirming'>('options');
  const [selectedRide, setSelectedRide] = useState<'economy' | 'comfort' | 'moto' | 'delivery'>('economy');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'cash'>('credit');
  const [registeringCard, setRegisteringCard] = useState(false);
  const [trainingCardRegistered, setTrainingCardRegistered] = useState(true);
  const hasDestination = query.trim().length >= 3;
  const serviceAccent = mobilityApp === 'uber' ? accent : '#E8B600';
  const rideCatalog = mobilityApp === 'uber' ? {
    economy: { label: 'UberX', price: 'R$ 8,50', description: 'Carro para até 4 pessoas, geralmente com menor preço.' },
    comfort: { label: 'Comfort', price: 'R$ 12,90', description: 'Carro mais espaçoso e motoristas bem avaliados.' },
    moto: { label: 'Uber Moto', price: 'R$ 5,90', description: 'Viagem de motocicleta para apenas 1 passageiro.' },
    delivery: { label: 'Uber Envios', price: 'R$ 7,40', description: 'Envio de um item pequeno; não transporta passageiro.' },
  } : {
    economy: { label: '99Pop', price: 'R$ 8,20', description: 'Carro para até 4 pessoas, com opção econômica.' },
    comfort: { label: '99Plus', price: 'R$ 12,40', description: 'Carro de categoria superior, com mais conforto.' },
    moto: { label: '99Moto', price: 'R$ 5,60', description: 'Viagem de motocicleta para apenas 1 passageiro.' },
    delivery: { label: '99Entrega', price: 'R$ 7,10', description: 'Envio de um item pequeno; não transporta passageiro.' },
  };
  const rideDetails = rideCatalog[selectedRide];
  const paymentDetails = {
    pix: { label: 'Pix', description: 'Pagamento digital confirmado somente dentro do aplicativo.' },
    credit: { label: 'Cartão de crédito', description: trainingCardRegistered ? 'Cartão de treino terminado em 4242.' : 'Cadastre um cartão fictício para praticar.' },
    cash: { label: 'Dinheiro', description: 'Pagamento diretamente ao condutor; combine se precisa de troco.' },
  }[paymentMethod];
  const destinationAddress = query.trim() || 'Biblioteca Municipal';

  if (step.position === 1 && !mobilityLoggedIn) return <View style={styles.mobilityLogin}>
    <View style={[styles.mobilityLoginBrand, { backgroundColor: mobilityApp === 'uber' ? '#1E252B' : '#F3C623' }]}><Ionicons name="car-sport" size={42} color={mobilityApp === 'uber' ? colors.surface : colors.text} /><AppText variant="heading" weight="900" color={mobilityApp === 'uber' ? colors.surface : colors.text}>{mobilityApp === 'uber' ? 'Uber · treino' : '99 · treino'}</AppText></View>
    <View style={styles.mobilityAppChooser}>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: mobilityApp === 'uber' }} onPress={() => { setMobilityApp('uber'); setLoginStage('welcome'); }} style={[styles.mobilityAppChoice, mobilityApp === 'uber' && styles.mobilityAppChoiceUber]}><View style={[styles.mobilityAppMonogram, styles.mobilityAppMonogramUber]}><AppText weight="900" color={colors.surface}>U</AppText></View><AppText weight="900">Treinar Uber</AppText></Pressable>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: mobilityApp === '99' }} onPress={() => { setMobilityApp('99'); setLoginStage('welcome'); }} style={[styles.mobilityAppChoice, mobilityApp === '99' && styles.mobilityAppChoice99]}><View style={[styles.mobilityAppMonogram, styles.mobilityAppMonogram99]}><AppText weight="900" color={colors.text}>99</AppText></View><AppText weight="900">Treinar 99</AppText></Pressable>
    </View>
    {loginStage === 'welcome' ? <>
      <View style={styles.mobilityLoginCopy}><AppText variant="heading" weight="900">Bem-vindo!</AppText><AppText color={colors.textMuted}>Escolha se deseja praticar a entrada em uma conta ou criar uma conta pela primeira vez.</AppText></View>
      <Button label="Entrar em uma conta de treino" icon="log-in-outline" onPress={() => { setAccountFlow('login'); setTrainingCode(''); setLoginStage('phone'); }} />
      <Button label="Criar cadastro de treino" icon="person-add-outline" variant="secondary" onPress={() => { setAccountFlow('signup'); setTrainingCode(''); setLoginStage('phone'); }} />
    </> : loginStage === 'phone' ? <>
      <View style={styles.mobilityLoginCopy}><AppText variant="heading" weight="900">{accountFlow === 'signup' ? 'Qual é o seu telefone?' : 'Entre para pedir uma viagem'}</AppText><AppText color={colors.textMuted}>{accountFlow === 'signup' ? 'O cadastro começa pela confirmação do número do celular.' : 'Digite o telefone vinculado à conta.'}</AppText></View>
      <View style={styles.mobilityPhoneRow}><View style={styles.mobilityCountryCode}><AppText weight="900">+55</AppText></View><TextInput accessibilityLabel="Número de celular fictício" inputMode="tel" onChangeText={setTrainingPhone} placeholder="Número do celular" placeholderTextColor={colors.placeholder} style={styles.mobilityPhoneInput} value={trainingPhone} /></View>
      <View style={styles.mobilityPrivacyNote}><Ionicons name="shield-checkmark" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Use somente o número fictício já preenchido. Nenhum SMS será enviado.</AppText></View>
      <Button label="Continuar" icon="arrow-forward" disabled={trainingPhone.replace(/\D/g, '').length < 10} onPress={() => { setTrainingCode(''); setLoginStage('code'); }} />
      <Button label="Voltar" variant="secondary" onPress={() => setLoginStage('welcome')} />
    </> : loginStage === 'code' ? <>
      <View style={styles.mobilityLoginCopy}><AppText variant="heading" weight="900">Digite o código</AppText><AppText color={colors.textMuted}>Em um acesso real, o código chegaria por SMS. Neste treino, use <AppText weight="900">1234</AppText>.</AppText></View>
      <TextInput accessibilityLabel="Código de verificação fictício" inputMode="numeric" maxLength={4} onChangeText={(value) => setTrainingCode(value.replace(/\D/g, ''))} placeholder="Código de 4 números" placeholderTextColor={colors.placeholder} style={styles.mobilityCodeInput} value={trainingCode} />
      {trainingCode.length === 4 && trainingCode !== '1234' ? <View accessibilityRole="alert" style={styles.mobilityLoginError}><Ionicons name="information-circle" size={22} color={colors.danger} /><AppText variant="small" color={colors.danger} style={styles.flex1}>Código incorreto. Digite 1234 para continuar o treinamento.</AppText></View> : null}
      <Button label="Confirmar código" icon="checkmark-circle-outline" disabled={trainingCode !== '1234'} onPress={() => accountFlow === 'signup' ? setLoginStage('profile') : setMobilityLoggedIn(true)} />
      <Button label="Voltar e corrigir o telefone" variant="secondary" onPress={() => { setTrainingCode(''); setLoginStage('phone'); }} />
    </> : loginStage === 'profile' ? <>
      <View style={styles.mobilityLoginCopy}><AppText variant="heading" weight="900">Como devemos chamar você?</AppText><AppText color={colors.textMuted}>Preencha todos os campos usando dados fictícios.</AppText></View>
      <View style={styles.mobilityNameRow}><TextInput accessibilityLabel="Nome fictício" autoCapitalize="words" onChangeText={setTrainingFirstName} placeholder="Nome" placeholderTextColor={colors.placeholder} style={[styles.mobilityProfileInput, styles.flex1]} value={trainingFirstName} /><TextInput accessibilityLabel="Sobrenome fictício" autoCapitalize="words" onChangeText={setTrainingLastName} placeholder="Sobrenome" placeholderTextColor={colors.placeholder} style={[styles.mobilityProfileInput, styles.flex1]} value={trainingLastName} /></View>
      <TextInput accessibilityLabel="E-mail fictício" autoCapitalize="none" inputMode="email" onChangeText={setTrainingEmail} placeholder="E-mail" placeholderTextColor={colors.placeholder} style={styles.mobilityProfileInput} value={trainingEmail} />
      <AppText variant="small" weight="800">Idioma preferido</AppText><View style={styles.mobilityLanguageRow}>{(['Português', 'English'] as const).map((language) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: trainingLanguage === language }} key={language} onPress={() => setTrainingLanguage(language)} style={[styles.mobilityLanguageOption, trainingLanguage === language && styles.mobilityRideSelected]}><AppText weight="800">{language}</AppText></Pressable>)}</View>
      <Button label="Continuar" icon="arrow-forward" disabled={!trainingFirstName.trim() || !trainingLastName.trim() || !trainingEmail.includes('@')} onPress={() => setLoginStage('password')} />
      <Button label="Voltar" variant="secondary" onPress={() => setLoginStage('code')} />
    </> : loginStage === 'password' ? <>
      <View style={styles.mobilityLoginCopy}><AppText variant="heading" weight="900">Crie uma senha</AppText><AppText color={colors.textMuted}>Em uma conta real, use uma senha exclusiva e não compartilhe o código recebido por SMS.</AppText></View>
      <TextInput accessibilityLabel="Senha fictícia" autoCapitalize="none" onChangeText={setTrainingPassword} placeholder="Senha" placeholderTextColor={colors.placeholder} secureTextEntry style={styles.mobilityProfileInput} value={trainingPassword} />
      <View style={styles.mobilityPasswordRules}><AppText variant="small" color={trainingPassword.length >= 8 ? colors.successText : colors.textMuted}>✓ Pelo menos 8 caracteres</AppText><AppText variant="small" color={/[0-9]/.test(trainingPassword) ? colors.successText : colors.textMuted}>✓ Pelo menos um número</AppText></View>
      <Button label="Continuar" icon="arrow-forward" disabled={trainingPassword.length < 8 || !/[0-9]/.test(trainingPassword)} onPress={() => setLoginStage('terms')} />
      <Button label="Voltar" variant="secondary" onPress={() => setLoginStage('profile')} />
    </> : <>
      <View style={styles.mobilityLoginCopy}><AppText variant="heading" weight="900">Revise seu cadastro</AppText><AppText color={colors.textMuted}>Confira os dados de treinamento antes de concluir.</AppText></View>
      <View style={styles.mobilitySignupSummary}><SignupSummaryRow label="Nome" value={`${trainingFirstName} ${trainingLastName}`} /><SignupSummaryRow label="Telefone" value={trainingPhone} /><SignupSummaryRow label="E-mail" value={trainingEmail} /><SignupSummaryRow label="Idioma" value={trainingLanguage} /></View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: trainingTermsAccepted }} onPress={() => setTrainingTermsAccepted((current) => !current)} style={styles.mobilityTermsRow}><Ionicons name={trainingTermsAccepted ? 'checkbox' : 'square-outline'} size={28} color={colors.primary} /><AppText variant="small" style={styles.flex1}>Li e aceito os termos e o aviso de privacidade <AppText variant="small" weight="900">fictícios deste treinamento</AppText>.</AppText></Pressable>
      <View style={styles.mobilityPrivacyNote}><Ionicons name="shield-checkmark" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Nenhuma conta real será criada e nenhum dado será enviado.</AppText></View>
      <Button label="Criar conta de treinamento" icon="person-add-outline" disabled={!trainingTermsAccepted} onPress={() => setMobilityLoggedIn(true)} />
      <Button label="Voltar" variant="secondary" onPress={() => setLoginStage('password')} />
    </>}
    <AppText variant="caption" color={colors.textMuted} style={styles.center}>Simulação educativa independente. Não cria conta no Uber ou na 99.</AppText>
  </View>;

  if (step.position === 1) return <View style={styles.mobilityExperience}>
    <View style={styles.mobilityTopRow}><View><AppText variant="caption" color={colors.textMuted}>PONTO DE PARTIDA FICTÍCIO</AppText><AppText weight="900">Localização de treino</AppText></View><Ionicons name="notifications-outline" size={24} color={colors.text} /></View>
    <View style={styles.mobilityAppChooser}>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: mobilityApp === 'uber' }} onPress={() => setMobilityApp('uber')} style={[styles.mobilityAppChoice, mobilityApp === 'uber' && styles.mobilityAppChoiceUber]}><View style={[styles.mobilityAppMonogram, styles.mobilityAppMonogramUber]}><AppText weight="900" color={colors.surface}>U</AppText></View><View><AppText weight="900">Treinar Uber</AppText><AppText variant="caption" color={colors.textMuted}>Fluxo educativo</AppText></View></Pressable>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: mobilityApp === '99' }} onPress={() => setMobilityApp('99')} style={[styles.mobilityAppChoice, mobilityApp === '99' && styles.mobilityAppChoice99]}><View style={[styles.mobilityAppMonogram, styles.mobilityAppMonogram99]}><AppText weight="900" color={colors.text}>99</AppText></View><View><AppText weight="900">Treinar 99</AppText><AppText variant="caption" color={colors.textMuted}>Fluxo educativo</AppText></View></Pressable>
    </View>
    <AppText variant="caption" color={colors.textMuted} style={styles.center}>Referência educativa sem afiliação. As telas não são oficiais.</AppText>
    <View style={styles.mobilityTabs}><View style={styles.mobilityTabActive}><Ionicons name="car-sport" size={22} color={accent} /><AppText weight="900">Viagens</AppText></View><View style={styles.mobilityTab}><Ionicons name="cube-outline" size={21} color={colors.textMuted} /><AppText color={colors.textMuted}>Entregas</AppText></View></View>
    <MobilityMapScene compact origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilitySearchBox}><Ionicons name="search" size={25} color={colors.text} /><TextInput accessibilityLabel="Digite o destino da viagem simulada" autoCorrect={false} onChangeText={onQueryChange} placeholder="Para onde?" placeholderTextColor={colors.placeholder} returnKeyType="search" style={styles.mobilitySearchInput} value={query} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar destino" hitSlop={8} onPress={() => onQueryChange('')}><Ionicons name="close-circle" size={23} color={colors.textMuted} /></Pressable> : null}</View>
    <View style={styles.mobilityCoach}><Ionicons name="information-circle-outline" size={26} color={colors.primary} /><View style={styles.flex1}><AppText weight="900">Digite um lugar conhecido</AppText><AppText variant="small" color={colors.textMuted}>Experimente “Biblioteca Municipal”. O aplicativo não acessa sua localização real.</AppText></View></View>
    <Button label="Procurar destinos" icon="search" disabled={!hasDestination || busy} onPress={() => void onSubmit({ action: 'continue' })} />
  </View>;

  if (step.position === 2 && editingAddresses) return <View style={styles.mobilityExperience}>
    <View style={styles.mobilityPlanningHeader}><Pressable accessibilityRole="button" accessibilityLabel="Voltar aos resultados" hitSlop={10} onPress={() => setEditingAddresses(false)}><Ionicons name="arrow-back" size={25} color={colors.text} /></Pressable><View style={styles.flex1}><AppText variant="subheading" weight="900">Digite os endereços</AppText><AppText variant="caption" color={colors.textMuted}>Os dados ficam somente nesta simulação</AppText></View></View>
    <View style={styles.mobilityRouteFields}><View style={styles.mobilityRouteDots}><View style={styles.mobilityOriginDot} /><View style={styles.mobilityDotsLine} /><View style={styles.mobilityEndSquare} /></View><View style={styles.flex1}><TextInput accessibilityLabel="Endereço de partida" autoCorrect={false} onChangeText={setOriginAddress} placeholder="De onde você vai sair?" placeholderTextColor={colors.placeholder} style={styles.mobilityAddressInput} value={originAddress} /><TextInput accessibilityLabel="Endereço de destino" autoCorrect={false} onChangeText={onQueryChange} placeholder="Para onde você vai?" placeholderTextColor={colors.placeholder} returnKeyType="search" style={styles.mobilityAddressInput} value={query} /></View></View>
    <View style={styles.mobilityPrivacyNote}><Ionicons name="lock-closed-outline" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Endereços usados apenas para praticar. Não fazemos busca real nem acessamos sua localização.</AppText></View>
    <Button label="Ver destinos simulados" icon="search" disabled={!originAddress.trim() || !hasDestination} onPress={() => setEditingAddresses(false)} />
  </View>;

  if (step.position === 2 && !pickupReview) return <View style={styles.mobilityExperience}>
    <View style={styles.mobilityPlanningHeader}><Pressable accessibilityRole="button" accessibilityLabel="Editar endereços" hitSlop={10} onPress={() => setEditingAddresses(true)}><Ionicons name="arrow-back" size={25} color={colors.text} /></Pressable><View style={styles.flex1}><AppText variant="subheading" weight="900">Planeje sua viagem</AppText><AppText variant="caption" color={colors.textMuted}>Agora · Para mim</AppText></View></View>
    <View style={styles.mobilityRouteFields}><View style={styles.mobilityRouteDots}><View style={styles.mobilityOriginDot} /><View style={styles.mobilityDotsLine} /><View style={styles.mobilityEndSquare} /></View><View style={styles.flex1}><View style={styles.mobilityField}><AppText variant="small">{originAddress}</AppText></View><View style={styles.mobilityField}><AppText variant="small" color={colors.textMuted}>{destinationAddress}</AppText></View></View><Pressable accessibilityRole="button" accessibilityLabel="Editar endereços" onPress={() => setEditingAddresses(true)} style={styles.mobilityEditButton}><Ionicons name="create-outline" size={22} color={colors.primary} /></Pressable></View>
    <AppText variant="caption" weight="800" color={colors.textMuted}>DESTINOS DE TREINAMENTO</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={`Escolher ${destinationAddress}`} disabled={busy} onPress={() => setPickupReview(true)} style={({ pressed }) => [styles.mobilityPlaceRow, pressed && styles.bankActionRowPressed]}><View style={styles.mobilityPlaceIcon}><Ionicons name="location-outline" size={24} color={serviceAccent} /></View><View style={styles.flex1}><AppText weight="900">{destinationAddress}</AppText><AppText variant="small" color={colors.textMuted}>Resultado fictício para o endereço digitado</AppText></View><Ionicons name="chevron-forward" size={22} color={colors.textMuted} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher endereço desconhecido" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'unknown' })} style={({ pressed }) => [styles.mobilityPlaceRow, pressed && styles.bankActionRowPressed]}><View style={styles.mobilityPlaceIcon}><Ionicons name="help-outline" size={24} color={colors.textMuted} /></View><View style={styles.flex1}><AppText weight="800">Endereço desconhecido</AppText><AppText variant="small" color={colors.textMuted}>Confira antes de escolher</AppText></View></Pressable>
  </View>;

  if (step.position === 2) return <View style={styles.mobilityExperience}>
    <MobilityMapScene origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><Tag label={`TREINO ${mobilityApp === 'uber' ? 'UBER' : '99'}`} tone="purple" /><AppText variant="subheading" weight="900">Confirme o destino</AppText><View style={styles.mobilityAddressRow}><Ionicons name="location" size={24} color={serviceAccent} /><View style={styles.flex1}><AppText weight="900">{destinationAddress}</AppText><AppText variant="small" color={colors.textMuted}>Local inserido por você · exibido apenas no treino</AppText></View></View><Button label="Usar este destino" icon="checkmark" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'library' })} /><Button label="Voltar aos resultados" variant="secondary" onPress={() => setPickupReview(false)} /></View>
  </View>;

  if (ridePhase === 'pickup') return <View style={styles.mobilityExperience}>
    <MobilityMapScene route origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><AppText variant="subheading" weight="900">Confirme o ponto de partida</AppText><View style={styles.mobilityAddressRow}><Ionicons name="navigate-circle" size={28} color={accent} /><View style={styles.flex1}><AppText weight="900">{originAddress}</AppText><AppText variant="small" color={colors.textMuted}>Endereço digitado · nenhum GPS utilizado</AppText></View></View><Button label="Confirmar partida" disabled={busy} onPress={() => setRidePhase('payment')} /><Button label="Voltar às opções" variant="secondary" onPress={() => setRidePhase('options')} /></View>
  </View>;

  if (ridePhase === 'payment' && registeringCard) return <View style={styles.mobilityExperience}>
    <MobilityMapScene route origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><View style={styles.mobilityPlanningHeader}><Pressable accessibilityRole="button" accessibilityLabel="Voltar às formas de pagamento" hitSlop={10} onPress={() => setRegisteringCard(false)}><Ionicons name="arrow-back" size={25} color={colors.text} /></Pressable><View style={styles.flex1}><AppText variant="subheading" weight="900">Cadastrar cartão de treino</AppText><AppText variant="caption" color={colors.textMuted}>Não digite dados de um cartão real</AppText></View></View>
      <View style={styles.mobilityTrainingCard}><View style={styles.mobilityCardTop}><Ionicons name="card" size={28} color={colors.surface} /><AppText weight="900" color={colors.surface}>CARTÃO FICTÍCIO</AppText></View><AppText variant="subheading" weight="900" color={colors.surface}>•••• •••• •••• 4242</AppText><View style={styles.mobilityCardBottom}><AppText variant="caption" color={colors.surface}>PESSOA DE TREINO</AppText><AppText variant="caption" color={colors.surface}>12/30</AppText></View></View>
      <View style={styles.mobilityPrivacyNote}><Ionicons name="shield-checkmark" size={22} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>O aplicativo usa somente este cartão inventado. Nenhum número digitado é necessário.</AppText></View>
      <Button label="Cadastrar cartão fictício" icon="card-outline" onPress={() => { setTrainingCardRegistered(true); setPaymentMethod('credit'); setRegisteringCard(false); }} />
    </View>
  </View>;

  if (ridePhase === 'payment') return <View style={styles.mobilityExperience}>
    <MobilityMapScene route origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><AppText variant="caption" weight="800" color={colors.primary}>PAGAMENTO DE TREINAMENTO</AppText><AppText variant="subheading" weight="900">Como você quer pagar?</AppText>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === 'pix' }} onPress={() => setPaymentMethod('pix')} style={[styles.mobilityPaymentRow, paymentMethod === 'pix' && styles.mobilityRideSelected]}><View style={styles.mobilityPaymentIcon}><Ionicons name="qr-code-outline" size={25} color={colors.primary} /></View><View style={styles.flex1}><AppText weight="900">Pix</AppText><AppText variant="small" color={colors.textMuted}>Confirme o Pix apenas dentro do aplicativo.</AppText></View><Ionicons name={paymentMethod === 'pix' ? 'radio-button-on' : 'radio-button-off'} size={24} color={colors.primary} /></Pressable>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === 'credit' }} onPress={() => setPaymentMethod('credit')} style={[styles.mobilityPaymentRow, paymentMethod === 'credit' && styles.mobilityRideSelected]}><View style={styles.mobilityPaymentIcon}><Ionicons name="card-outline" size={26} color={colors.primary} /></View><View style={styles.flex1}><AppText weight="900">Cartão de crédito</AppText><AppText variant="small" color={colors.textMuted}>{trainingCardRegistered ? 'Cartão fictício •••• 4242' : 'Nenhum cartão de treino cadastrado'}</AppText></View><Ionicons name={paymentMethod === 'credit' ? 'radio-button-on' : 'radio-button-off'} size={24} color={colors.primary} /></Pressable>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === 'cash' }} onPress={() => setPaymentMethod('cash')} style={[styles.mobilityPaymentRow, paymentMethod === 'cash' && styles.mobilityRideSelected]}><View style={styles.mobilityPaymentIcon}><Ionicons name="cash-outline" size={27} color={colors.primary} /></View><View style={styles.flex1}><AppText weight="900">Dinheiro</AppText><AppText variant="small" color={colors.textMuted}>Pague ao condutor e informe se precisa de troco.</AppText></View><Ionicons name={paymentMethod === 'cash' ? 'radio-button-on' : 'radio-button-off'} size={24} color={colors.primary} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Cadastrar um cartão fictício" onPress={() => setRegisteringCard(true)} style={styles.mobilityAddPayment}><Ionicons name="add-circle-outline" size={25} color={colors.primary} /><View style={styles.flex1}><AppText weight="900" color={colors.primary}>Cadastrar cartão</AppText><AppText variant="small" color={colors.textMuted}>Pratique com dados fictícios já preenchidos</AppText></View><Ionicons name="chevron-forward" size={21} color={colors.textMuted} /></Pressable>
      <Button label={`Continuar com ${paymentDetails.label}`} icon="arrow-forward" disabled={paymentMethod === 'credit' && !trainingCardRegistered} onPress={() => setRidePhase('confirming')} />
      <Button label="Voltar ao ponto de partida" variant="secondary" onPress={() => setRidePhase('pickup')} />
    </View>
  </View>;

  if (ridePhase === 'confirming') return <View style={styles.mobilityExperience}>
    <MobilityMapScene route origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><View style={styles.mobilityConfirmIcon}><Ionicons name={selectedRide === 'moto' || selectedRide === 'delivery' ? 'bicycle' : 'car-sport'} size={38} color={accent} /></View><AppText variant="subheading" weight="900" style={styles.center}>Confirmar solicitação simulada?</AppText><AppText color={colors.textMuted} style={styles.center}>{destinationAddress} · {rideDetails.label} · {rideDetails.price}</AppText><AppText variant="small" color={colors.textMuted} style={styles.center}>{rideDetails.description}</AppText><View style={styles.mobilityPaymentSummary}><Ionicons name={paymentMethod === 'pix' ? 'qr-code-outline' : paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'} size={24} color={colors.primary} /><View style={styles.flex1}><AppText weight="900">{paymentDetails.label}</AppText><AppText variant="small" color={colors.textMuted}>{paymentDetails.description}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel="Alterar forma de pagamento" onPress={() => setRidePhase('payment')}><AppText weight="900" color={colors.primary}>Alterar</AppText></Pressable></View><View style={styles.mobilitySafetyRow}><Ionicons name="shield-checkmark" size={23} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Nenhum veículo será chamado, nenhum item será enviado e nenhuma cobrança será feita.</AppText></View><Button label="Confirmar somente o treino" icon="checkmark-circle-outline" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'confirm-training' })} /><Button label="Revisar opções" variant="secondary" onPress={() => setRidePhase('options')} /></View>
  </View>;

  return <View style={styles.mobilityExperience}>
    <MobilityMapScene route origin={originAddress} destination={destinationAddress} />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><AppText variant="caption" weight="800" color={colors.success}>PREÇOS FICTÍCIOS</AppText><AppText variant="subheading" weight="900">Escolha uma opção</AppText>
      <Pressable accessibilityRole="radio" accessibilityLabel={`${rideCatalog.economy.label}, carro econômico para até quatro pessoas`} accessibilityState={{ checked: selectedRide === 'economy' }} onPress={() => setSelectedRide('economy')} style={[styles.mobilityRideRow, selectedRide === 'economy' && styles.mobilityRideSelected]}><View style={styles.mobilityVehicleIcon}><Ionicons name="car-sport" size={29} color={serviceAccent} /></View><View style={styles.flex1}><AppText weight="900">{rideCatalog.economy.label}</AppText><AppText variant="small" color={colors.textMuted}>{rideCatalog.economy.description}</AppText><AppText variant="caption" color={colors.textMuted}>Chegada simulada em 5 min</AppText></View><AppText weight="900">{rideCatalog.economy.price}</AppText></Pressable>
      <Pressable accessibilityRole="radio" accessibilityLabel={`${rideCatalog.comfort.label}, carro mais confortável`} accessibilityState={{ checked: selectedRide === 'comfort' }} onPress={() => setSelectedRide('comfort')} style={[styles.mobilityRideRow, selectedRide === 'comfort' && styles.mobilityRideSelected]}><View style={styles.mobilityVehicleIcon}><Ionicons name="car" size={29} color={serviceAccent} /></View><View style={styles.flex1}><AppText weight="900">{rideCatalog.comfort.label}</AppText><AppText variant="small" color={colors.textMuted}>{rideCatalog.comfort.description}</AppText><AppText variant="caption" color={colors.textMuted}>Chegada simulada em 7 min</AppText></View><AppText weight="900">{rideCatalog.comfort.price}</AppText></Pressable>
      <Pressable accessibilityRole="radio" accessibilityLabel={`${rideCatalog.moto.label}, motocicleta para um passageiro`} accessibilityState={{ checked: selectedRide === 'moto' }} onPress={() => setSelectedRide('moto')} style={[styles.mobilityRideRow, selectedRide === 'moto' && styles.mobilityRideSelected]}><View style={styles.mobilityVehicleIcon}><Ionicons name="bicycle" size={29} color={serviceAccent} /></View><View style={styles.flex1}><AppText weight="900">{rideCatalog.moto.label}</AppText><AppText variant="small" color={colors.textMuted}>{rideCatalog.moto.description}</AppText><AppText variant="caption" color={colors.textMuted}>Use capacete e confira placa e condutor</AppText></View><AppText weight="900">{rideCatalog.moto.price}</AppText></Pressable>
      <Pressable accessibilityRole="radio" accessibilityLabel={`${rideCatalog.delivery.label}, entrega de item pequeno sem passageiro`} accessibilityState={{ checked: selectedRide === 'delivery' }} onPress={() => setSelectedRide('delivery')} style={[styles.mobilityRideRow, selectedRide === 'delivery' && styles.mobilityRideSelected]}><View style={styles.mobilityVehicleIcon}><Ionicons name="cube" size={28} color={serviceAccent} /></View><View style={styles.flex1}><AppText weight="900">{rideCatalog.delivery.label}</AppText><AppText variant="small" color={colors.textMuted}>{rideCatalog.delivery.description}</AppText><AppText variant="caption" color={colors.textMuted}>Embale o item e não envie objetos proibidos</AppText></View><AppText weight="900">{rideCatalog.delivery.price}</AppText></Pressable>
      <View style={styles.mobilitySelectedExplanation}><Ionicons name="information-circle" size={24} color={colors.primary} /><View style={styles.flex1}><AppText weight="900">O que significa {rideDetails.label}?</AppText><AppText variant="small" color={colors.textMuted}>{rideDetails.description}</AppText></View></View>
      <Button label={`Escolher ${rideDetails.label}`} icon={selectedRide === 'moto' || selectedRide === 'delivery' ? 'bicycle-outline' : 'car-outline'} disabled={busy} onPress={() => setRidePhase('pickup')} />
    </View>
  </View>;
}

function MobilityMapScene({ route = false, compact = false, origin = 'Entrada principal', destination = 'Biblioteca Municipal' }: { route?: boolean; compact?: boolean; origin?: string; destination?: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [focusedPoint, setFocusedPoint] = useState<'pickup' | 'destination' | null>(null);

  return <View accessibilityLabel="Mapa fictício da viagem, sem uso de GPS" style={[styles.mobilityMap, compact && styles.mobilityMapCompact]}>
    <View style={[styles.mobilityMapCanvas, zoomed && styles.mobilityMapCanvasZoomed]}>
    <View style={[styles.mobilityBlock, styles.mobilityBlockNorth]} />
    <View style={[styles.mobilityBlock, styles.mobilityBlockWest]} />
    <View style={[styles.mobilityBlock, styles.mobilityBlockEast]} />
    <View style={[styles.mobilityBlock, styles.mobilityBlockSouth]} />
    <View style={[styles.mobilityRoad, styles.mobilityRoadHorizontal]} />
    <View style={[styles.mobilityRoad, styles.mobilityRoadHorizontalSecond]} />
    <View style={[styles.mobilityRoad, styles.mobilityRoadVertical]} />
    <View style={[styles.mobilityRoad, styles.mobilityRoadVerticalSecond]} />
    <View style={[styles.mobilityRoad, styles.mobilityRoadDiagonal]} />
    <View style={[styles.mobilityStreetName, styles.mobilityStreetCentral]}><AppText variant="caption" color={colors.textMuted}>RUA CENTRAL</AppText></View>
    <View style={[styles.mobilityStreetName, styles.mobilityStreetGarden]}><AppText variant="caption" color={colors.textMuted}>AV. JARDIM</AppText></View>
    <View style={[styles.mobilityLandmark, styles.mobilityLandmarkPark]}><Ionicons name="leaf" size={15} color="#39724A" /><AppText variant="caption" color="#39724A">Praça</AppText></View>
    <View style={[styles.mobilityLandmark, styles.mobilityLandmarkLibrary]}><Ionicons name="library" size={15} color="#765326" /><AppText variant="caption" color="#765326">Biblioteca</AppText></View>
    <View style={styles.mobilityMapLabel}><AppText variant="caption" color={colors.textMuted}>Mapa ilustrativo · sem GPS</AppText></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Ponto de partida fictício" onPress={() => setFocusedPoint('pickup')} style={styles.mobilityPickupDot}><View style={styles.mobilityPickupDotInner} /></Pressable>
    {route ? <>
      <View style={[styles.mobilityRouteLine, styles.mobilityRouteLineOne]} />
      <View style={[styles.mobilityRouteLine, styles.mobilityRouteLineTwo]} />
      <View style={styles.mobilityCarMarker}><Ionicons name="car-sport" size={18} color={colors.surface} /></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Destino fictício: ${destination}`} onPress={() => setFocusedPoint('destination')} style={styles.mobilityDestinationPin}><Ionicons name="flag" size={20} color={colors.surface} /></Pressable>
    </> : null}
    </View>
    <View style={styles.mobilityZoomControls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Aumentar mapa" disabled={zoomed} onPress={() => setZoomed(true)} style={[styles.mobilityZoomButton, zoomed && styles.mobilityZoomButtonDisabled]}><Ionicons name="add" size={24} color={colors.text} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Diminuir mapa" disabled={!zoomed} onPress={() => setZoomed(false)} style={[styles.mobilityZoomButton, !zoomed && styles.mobilityZoomButtonDisabled]}><Ionicons name="remove" size={24} color={colors.text} /></Pressable>
    </View>
    {focusedPoint ? <View accessibilityLiveRegion="polite" style={styles.mobilityMapCallout}><AppText variant="small" weight="800">{focusedPoint === 'pickup' ? `Partida: ${origin}` : `Destino: ${destination}`}</AppText><AppText variant="caption" color={colors.textMuted}>Exibido somente nesta simulação</AppText></View> : null}
  </View>;
}

function SignupSummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.mobilitySignupSummaryRow}><AppText variant="small" color={colors.textMuted}>{label}</AppText><AppText variant="small" weight="900">{value}</AppText></View>;
}

function EnvironmentScene({ presentation, step, accent, query, onQueryChange }: { presentation: 'messaging' | 'mobility' | 'app-store' | 'marketplace' | 'phone-call'; step: ParticipantMissionStep; accent: string; query: string; onQueryChange: (value: string) => void }) {
  if (presentation === 'messaging') return <View style={styles.environmentScene}><View style={styles.fakeChatReceived}><AppText variant="small">Olá! Preciso que você faça isso agora. É urgente.</AppText></View><View style={styles.fakeChatReceived}><AppText variant="small">Use este link ou envie o valor solicitado.</AppText></View><View style={styles.fakeChatInput}><AppText variant="small" color={colors.textMuted}>Mensagem</AppText><Ionicons name="send" size={20} color={accent} /></View></View>;
  if (presentation === 'mobility') return <View style={styles.environmentScene}><View style={styles.fakeMap}><Ionicons name="location" size={34} color={accent} /><View style={styles.fakeRoute} /><Ionicons name="flag" size={30} color={colors.primary} /></View><View style={styles.fakeSearch}><Ionicons name="search" size={20} color={colors.textMuted} /><AppText variant="small">Para onde você vai?</AppText></View></View>;
  if (presentation === 'app-store') {
    const hasSearch = query.trim().length > 0;
    return <View style={styles.environmentScene}>
      <View style={styles.storeSearchBox}>
        <Ionicons name="search" size={22} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Buscar na loja de aplicativos de treinamento"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onQueryChange}
          placeholder="Buscar aplicativos"
          placeholderTextColor={colors.placeholder}
          returnKeyType="search"
          style={styles.storeSearchInput}
          value={query}
        />
        {hasSearch ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8} onPress={() => onQueryChange('')}><Ionicons name="close-circle" size={22} color={colors.textMuted} /></Pressable> : null}
      </View>
      {!hasSearch ? <View style={styles.storeEmptyState}><Ionicons name="search-outline" size={38} color={colors.primary} /><AppText weight="900">Digite o nome do aplicativo</AppText><AppText variant="small" color={colors.textMuted} style={styles.center}>Experimente escrever “Conecta Fácil” para visualizar resultados fictícios.</AppText></View> : <>
        <AppText variant="small" weight="800" color={colors.textMuted}>RESULTADOS DE TREINAMENTO</AppText>
        <View style={styles.fakeProduct}><View style={[styles.fakeAppIcon, { backgroundColor: accent }]}><Ionicons name="apps" size={28} color={colors.surface} /></View><View style={styles.flex1}><AppText weight="900">Conecta Fácil</AppText><AppText variant="caption" color={colors.textMuted}>Empresa Exemplo · 4,8 ★ · aplicativo de treino</AppText></View><Tag label="VERIFICADO" tone="green" /></View>
        <View style={styles.fakeProduct}><View style={[styles.fakeAppIcon, styles.fakeAppIconUnknown]}><Ionicons name="help" size={28} color={colors.textMuted} /></View><View style={styles.flex1}><AppText weight="900">Conecta Grátis</AppText><AppText variant="caption" color={colors.danger}>Desenvolvedor desconhecido · poucas avaliações</AppText></View><Tag label="ATENÇÃO" tone="red" /></View>
      </>}
    </View>;
  }
  if (presentation === 'marketplace') return <View style={styles.environmentScene}><View style={styles.fakeSearch}><Ionicons name="search" size={20} color={colors.textMuted} /><AppText variant="small">Buscar produtos</AppText><Ionicons name="cart-outline" size={20} color={accent} /></View><View style={styles.fakeProduct}><View style={styles.fakeProductImage}><Ionicons name="cube-outline" size={42} color={accent} /></View><View style={styles.flex1}><AppText weight="900">Produto de treinamento</AppText><AppText variant="small">R$ 30,00 + R$ 8,00 de frete</AppText><AppText variant="caption" color={colors.success}>Loja bem avaliada · descrição completa</AppText></View></View></View>;
  return <View style={[styles.environmentScene, styles.fakeCallScene]}><View style={[styles.fakeCallerAvatar, { backgroundColor: accent }]}><Ionicons name="person" size={48} color={colors.surface} /></View><AppText variant="subheading" weight="900">Número não identificado</AppText><AppText color={colors.textMuted}>Chamada de treinamento em andamento</AppText><View style={styles.fakeCallControls}><View style={styles.fakeCallButton}><Ionicons name="mic-off" size={24} color={colors.text} /></View><View style={[styles.fakeCallButton, styles.fakeCallEnd]}><Ionicons name="call" size={24} color={colors.surface} /></View><View style={styles.fakeCallButton}><Ionicons name="volume-high" size={24} color={colors.text} /></View></View></View>;
}

function AppStoreExperience({ step, busy, query, onQueryChange, onSubmit, accent }: { step: ParticipantMissionStep; busy: boolean; query: string; onQueryChange: (value: string) => void; onSubmit: (action: MissionAction) => Promise<void>; accent: string }) {
  const [installPhase, setInstallPhase] = useState<'details' | 'downloading' | 'installed' | 'opened'>('details');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const searched = query.trim().length >= 3;

  useEffect(() => {
    if (installPhase !== 'downloading') return;
    const timer = setInterval(() => setDownloadProgress((current) => {
      const next = Math.min(100, current + 20);
      if (next === 100) {
        clearInterval(timer);
        setTimeout(() => setInstallPhase('installed'), 250);
      }
      return next;
    }), 350);
    return () => clearInterval(timer);
  }, [installPhase]);
  if (step.position === 1) return <View style={styles.storeExperience}>
    <View style={styles.storeSearchBox}><Ionicons name="search" size={22} color={colors.textMuted} /><TextInput accessibilityLabel="Digite o nome do aplicativo" autoCapitalize="none" autoCorrect={false} onChangeText={onQueryChange} placeholder="Digite: Conecta Fácil" placeholderTextColor={colors.placeholder} returnKeyType="search" style={styles.storeSearchInput} value={query} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8} onPress={() => onQueryChange('')}><Ionicons name="close-circle" size={22} color={colors.textMuted} /></Pressable> : null}</View>
    {!searched ? <View style={styles.storeCoach}><View style={styles.storeCoachNumber}><AppText weight="900" color={colors.surface}>1</AppText></View><View style={styles.flex1}><AppText weight="900">Toque na lupa e escreva o nome</AppText><AppText variant="small" color={colors.textMuted}>Você pode digitar “Conecta Fácil”. Nada será pesquisado na loja real.</AppText></View></View> : <View style={styles.storeSearchSuccess}><Ionicons name="checkmark-circle" size={28} color={colors.success} /><View style={styles.flex1}><AppText weight="900">Busca pronta</AppText><AppText variant="small" color={colors.textMuted}>Agora toque em “Mostrar resultados”.</AppText></View></View>}
    <Button label="Mostrar resultados" icon="search" disabled={!searched || busy} onPress={() => void onSubmit({ action: 'continue' })} />
  </View>;

  if (step.position === 2) return <View style={styles.storeExperience}>
    <View style={styles.storeSearchBox}><Ionicons name="search" size={22} color={colors.textMuted} /><AppText style={styles.flex1}>{query || 'Conecta Fácil'}</AppText><Ionicons name="options-outline" size={22} color={colors.textMuted} /></View>
    <View style={styles.storeCoach}><View style={styles.storeCoachNumber}><AppText weight="900" color={colors.surface}>2</AppText></View><View style={styles.flex1}><AppText weight="900">Compare antes de escolher</AppText><AppText variant="small" color={colors.textMuted}>Confira nome, desenvolvedor, avaliação e quantidade de avaliações.</AppText></View></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher Conecta Fácil da Empresa Exemplo" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'official' })} style={({ pressed }) => [styles.storeResultCard, styles.storeResultTrusted, pressed && styles.bankActionRowPressed]}><View style={[styles.fakeAppIcon, { backgroundColor: accent }]}><Ionicons name="apps" size={28} color={colors.surface} /></View><View style={styles.flex1}><AppText weight="900">Conecta Fácil</AppText><AppText variant="small" color={colors.textMuted}>Empresa Exemplo</AppText><AppText variant="caption" color={colors.success}>4,8 ★ · muitas avaliações · verificado</AppText></View><Ionicons name="chevron-forward" size={24} color={colors.textMuted} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher Conecta Grátis de desenvolvedor desconhecido" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'copy' })} style={({ pressed }) => [styles.storeResultCard, pressed && styles.bankActionRowPressed]}><View style={[styles.fakeAppIcon, styles.fakeAppIconUnknown]}><Ionicons name="help" size={28} color={colors.textMuted} /></View><View style={styles.flex1}><AppText weight="900">Conecta Grátis</AppText><AppText variant="small" color={colors.danger}>Desenvolvedor desconhecido</AppText><AppText variant="caption" color={colors.danger}>Sem avaliações suficientes</AppText></View><Ionicons name="chevron-forward" size={24} color={colors.textMuted} /></Pressable>
  </View>;

  if (installPhase === 'opened') return <View style={styles.storeOpenedScreen}>
    <View style={[styles.storeOpenedLogo, { backgroundColor: accent }]}><Ionicons name="apps" size={64} color={colors.surface} /></View>
    <AppText variant="heading" weight="900">Conecta Fácil</AppText>
    <Tag label="APLICATIVO DE TREINAMENTO" tone="purple" />
    <AppText color={colors.textMuted} style={styles.center}>Você abriu o aplicativo fictício com sucesso. Nenhum aplicativo real foi iniciado.</AppText>
    <View style={styles.storeOpenedWelcome}><Ionicons name="sparkles-outline" size={26} color={colors.primary} /><View style={styles.flex1}><AppText weight="900">Bem-vindo ao treino!</AppText><AppText variant="small" color={colors.textMuted}>Agora você já conhece as etapas para buscar, instalar e abrir um aplicativo.</AppText></View></View>
    <Button label="Concluir treinamento" icon="checkmark-circle-outline" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'install-training' })} />
  </View>;

  return <View style={styles.storeExperience}>
    <View style={styles.storeAppDetail}><View style={[styles.fakeAppIcon, { backgroundColor: accent }]}><Ionicons name="apps" size={28} color={colors.surface} /></View><View style={styles.flex1}><AppText variant="subheading" weight="900">Conecta Fácil</AppText><AppText variant="small" color={colors.textMuted}>Empresa Exemplo · sem anúncios</AppText></View><Ionicons name="ellipsis-vertical" size={22} color={colors.textMuted} /></View>
    <View style={styles.storeStats}><View style={styles.storeStat}><AppText weight="900">4,8 ★</AppText><AppText variant="caption" color={colors.textMuted}>1 mil avaliações</AppText></View><View style={styles.storeStat}><AppText weight="900">Livre</AppText><AppText variant="caption" color={colors.textMuted}>Classificação</AppText></View><View style={styles.storeStat}><AppText weight="900">18 MB</AppText><AppText variant="caption" color={colors.textMuted}>Tamanho fictício</AppText></View></View>
    {installPhase === 'details' ? <>
      <Button label="Instalar" icon="download-outline" disabled={busy} onPress={() => { setDownloadProgress(0); setInstallPhase('downloading'); }} />
      <View style={styles.storePreview}><Ionicons name="phone-portrait-outline" size={54} color={accent} /><View style={styles.flex1}><AppText weight="900">Sobre este aplicativo</AppText><AppText variant="small" color={colors.textMuted}>Aplicativo fictício criado apenas para aprender o processo de instalação com segurança.</AppText></View></View>
    </> : installPhase === 'downloading' ? <>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: downloadProgress }} style={styles.storeDownloadRow}><View style={[styles.storeDownloadRing, { borderColor: accent }]}><AppText weight="900" color={accent}>{downloadProgress}%</AppText></View><View style={styles.flex1}><AppText weight="900">Instalando no ambiente de treino…</AppText><AppText variant="small" color={colors.textMuted}>{downloadProgress} de 100 · nenhum arquivo real será baixado</AppText></View></View>
      <View style={styles.storeProgressTrack}><View style={[styles.storeProgressFill, { backgroundColor: accent, width: `${downloadProgress}%` }]} /></View>
      <Button label="Cancelar instalação simulada" variant="secondary" onPress={() => { setInstallPhase('details'); setDownloadProgress(0); }} />
    </> : <>
      <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.storeInstalled}><Ionicons name="checkmark-circle" size={34} color={colors.success} /><View style={styles.flex1}><AppText weight="900">Aplicativo instalado no treino</AppText><AppText variant="small" color={colors.textMuted}>Nenhum aplicativo foi instalado no seu aparelho.</AppText></View></View>
      <View style={styles.storeInstalledActions}><Button label="Desinstalar" variant="secondary" onPress={() => { setInstallPhase('details'); setDownloadProgress(0); }} /><Button label="Abrir" disabled={busy} onPress={() => setInstallPhase('opened')} /></View>
    </>}
    <View style={styles.storeCoach}><View style={styles.storeCoachNumber}><AppText weight="900" color={colors.surface}>3</AppText></View><View style={styles.flex1}><AppText weight="900">Tudo acontece apenas na simulação</AppText><AppText variant="small" color={colors.textMuted}>Você pode acompanhar o progresso sem consumir internet, memória ou instalar arquivos.</AppText></View></View>
  </View>;
}

function EnvironmentActions({ step, busy, accent, onSubmit }: { step: ParticipantMissionStep; busy: boolean; accent: string; onSubmit: (action: MissionAction) => Promise<void> }) {
  const expected = asObject(step.expectedAction); const options = Array.isArray(step.options) ? step.options.filter(isOption) : [];
  if (!options.length) return <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onSubmit({ action: 'continue' })} style={[styles.environmentPrimaryAction, { backgroundColor: accent }]}><AppText weight="900" color={colors.surface}>Continuar no ambiente de treino</AppText></Pressable>;
  return <View style={styles.environmentActionList}>{options.map(option => <Pressable accessibilityRole="button" accessibilityLabel={option.label} disabled={busy} key={option.id} onPress={() => void onSubmit({ action: expected.action === 'select' ? 'select' : 'choose', optionId: option.id })} style={({ pressed }) => [styles.environmentOption, pressed && styles.bankActionRowPressed]}><View style={[styles.environmentOptionIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={option.id.includes('cancel') || option.id.includes('refuse') || option.id.includes('ignore') || option.id.includes('do-not') ? 'shield-checkmark-outline' : 'chevron-forward-circle-outline'} size={24} color={accent} /></View><AppText weight="800" style={styles.flex1}>{option.label}</AppText><Ionicons name="chevron-forward" size={21} color={colors.textMuted} /></Pressable>)}</View>;
}

function PixFlowMock({ assignmentId, assessmentId, details, steps, engine, playInstruction, router }: { assignmentId: string; assessmentId?: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[]; engine: ReturnType<typeof useMissionEngine>; playInstruction: (text: string) => void; router: ReturnType<typeof useRouter> }) {
  const step = engine.currentStep;
  if (!step) return null;

  const screenIndex = Math.min(Math.max(step.position, 1), 4);

  const renderPixScreen = () => {
    switch (screenIndex) {
      case 1:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}>
              <AppText variant="small" weight="700">9:41</AppText>
              <View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View>
            </View>
            <PixBankHeader />
            <View style={styles.bankBalanceCard}><View><AppText variant="small" color={colors.textMuted}>Saldo disponível</AppText><AppText variant="subheading" weight="900">R$ ••••••</AppText></View><Ionicons name="eye-off-outline" size={22} color={colors.textMuted} /></View>
            <View style={styles.bankSectionTitle}><AppText variant="subheading" weight="900">Resumo do Pix</AppText><Tag label="SIMULAÇÃO" tone="purple" /></View>
            <View style={styles.pixSummaryCard}>
              <AppText variant="small" color={colors.textMuted}>Destinatária fictícia</AppText>
              <AppText variant="heading" weight="900">Ana Treino</AppText>
              <View style={styles.pixDivider} />
              <AppText variant="small" color={colors.textMuted}>Valor exibido no treino</AppText>
              <AppText variant="heading" weight="900">R$ 25,00</AppText>
            </View>
            <View style={styles.pixSafetyRow}><Ionicons name="lock-closed-outline" size={20} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Dados inventados. Nenhuma transferência será realizada.</AppText></View>
            <PixBankActions step={step} busy={engine.busy} onSubmit={engine.submit} />
            <PixBankNav />
          </View>
        );
      case 2:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <PixBankHeader compact />
            <View style={styles.modalTop}><AppText variant="small" weight="800" color={colors.primary}>CONFERÊNCIA DO PIX</AppText><Tag label="PASSO 2" tone="purple" /></View>
            <View style={styles.textStack}><AppText variant="heading" weight="900">Quem aparece no resumo?</AppText><AppText color={colors.textMuted}>Compare o nome antes de continuar.</AppText></View>
            <View style={styles.pixSummaryCompact}><Ionicons name="person-circle-outline" size={42} color={colors.primary} /><View style={styles.flex1}><AppText variant="small" color={colors.textMuted}>Destinatária</AppText><AppText weight="900">Ana Treino</AppText></View></View>
            <PixBankActions step={step} busy={engine.busy} onSubmit={engine.submit} />
            <PixBankNav />
          </View>
        );
      case 3:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <PixBankHeader compact />
            <View style={styles.modalTop}><AppText variant="small" weight="800" color={colors.primary}>CONFERÊNCIA DO PIX</AppText><Tag label="PASSO 3" tone="purple" /></View>
            <View style={styles.textStack}><AppText variant="heading" weight="900">Confira o valor</AppText><AppText color={colors.textMuted}>Compare o valor combinado com o valor exibido.</AppText></View>
            <View style={styles.pixComparisonRow}>
              <View style={styles.pixComparisonCard}><AppText variant="small" color={colors.textMuted}>Pedido</AppText><AppText variant="subheading" weight="900">R$ 20,00</AppText></View>
              <Ionicons name="arrow-forward" size={24} color={colors.primary} />
              <View style={[styles.pixComparisonCard, styles.pixComparisonWarning]}><AppText variant="small" color={colors.textMuted}>Na tela</AppText><AppText variant="subheading" weight="900">R$ 25,00</AppText></View>
            </View>
            <PixBankActions step={step} busy={engine.busy} onSubmit={engine.submit} />
            <PixBankNav />
          </View>
        );
      case 4:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <PixBankHeader compact />
            <View style={styles.modalTop}><AppText variant="small" weight="800" color={colors.primary}>REVISÃO FINAL</AppText><Tag label="DECISÃO SEGURA" tone="green" /></View>
            <View style={styles.pixWarningCard}><Ionicons name="warning-outline" size={34} color={colors.warning} /><AppText variant="subheading" weight="900" style={styles.center}>O valor está diferente</AppText><AppText color={colors.textMuted} style={styles.center}>Quando os dados não conferem, não prossiga com a transferência.</AppText></View>
            <PixBankActions step={step} busy={engine.busy} onSubmit={engine.submit} />
            <PixBankNav />
          </View>
        );
    }
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
      <SimulationIdentityNotice reference="serviços Pix e aplicativos bancários" />
      <SyncStatusCard engine={engine} />
      <Card style={styles.pixMockCard}>{renderPixScreen()}</Card>
      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}>
          <AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText>
          <Tag label="Simulação segura" tone="green" />
        </View>
        <AppText variant="subheading" weight="800">{step.title}</AppText>
        <AppText color={colors.textMuted}>{step.instruction}</AppText>
        <ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
      </Card>
      <View style={styles.supportActions}>
        <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
        <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
      </View>
    </Screen>
  );
}

function PixBankHeader({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.bankHeader, compact && styles.bankHeaderCompact]}>
      <View style={styles.bankHeaderTop}>
        <View style={styles.bankAvatar}><Ionicons name="person-outline" size={22} color={colors.surface} /></View>
        <View style={styles.flex1}>
          <AppText variant="caption" color={colors.surface}>BANCO DE TREINAMENTO</AppText>
          <AppText weight="900" color={colors.surface}>{compact ? 'Área Pix' : 'Olá! Vamos praticar?'}</AppText>
        </View>
        <View style={styles.bankHeaderActions}><Ionicons name="help-circle-outline" size={22} color={colors.surface} /><Ionicons name="notifications-outline" size={22} color={colors.surface} /></View>
      </View>
      {!compact ? <AppText variant="small" color={colors.surface}>Ambiente educativo · nenhuma operação real</AppText> : null}
    </View>
  );
}

function PixBankNav() {
  return (
    <View style={styles.bankBottomNav} accessibilityLabel="Navegação ilustrativa do banco de treinamento">
      <View style={styles.bankNavItem}><Ionicons name="home-outline" size={20} color={colors.textMuted} /><AppText variant="caption" color={colors.textMuted}>Início</AppText></View>
      <View style={[styles.bankNavItem, styles.bankNavItemActive]}><Ionicons name="swap-horizontal" size={20} color={colors.primary} /><AppText variant="caption" weight="800" color={colors.primary}>Pix</AppText></View>
      <View style={styles.bankNavItem}><Ionicons name="card-outline" size={20} color={colors.textMuted} /><AppText variant="caption" color={colors.textMuted}>Cartões</AppText></View>
      <View style={styles.bankNavItem}><Ionicons name="menu-outline" size={20} color={colors.textMuted} /><AppText variant="caption" color={colors.textMuted}>Menu</AppText></View>
    </View>
  );
}

function PixBankActions({ step, busy, onSubmit }: { step: ParticipantMissionStep; busy: boolean; onSubmit: (action: MissionAction) => Promise<void> }) {
  const expected = asObject(step.expectedAction);
  const options = Array.isArray(step.options) ? step.options.filter(isOption) : [];

  if (!options.length) {
    return <Button label="Continuar conferência" icon="arrow-forward" variant="primary" disabled={busy} onPress={() => void onSubmit({ action: 'continue' })} />;
  }

  return (
    <View style={styles.bankActionList}>
      <AppText variant="small" weight="800" color={colors.textMuted}>{step.position === 4 ? 'ESCOLHA UMA AÇÃO' : 'TOQUE NA INFORMAÇÃO CORRETA'}</AppText>
      {options.map((option) => {
        const cancelAction = option.id === 'cancel';
        const riskyAction = option.id === 'confirm';
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={option.label}
            disabled={busy}
            key={option.id}
            onPress={() => void onSubmit({ action: expected.action === 'select' ? 'select' : 'choose', optionId: option.id })}
            style={({ pressed }) => [
              styles.bankActionRow,
              cancelAction && styles.bankActionRowSafe,
              riskyAction && styles.bankActionRowRisky,
              pressed && styles.bankActionRowPressed,
            ]}
          >
            <View style={[styles.bankActionIcon, cancelAction && styles.bankActionIconSafe]}>
              <Ionicons
                name={cancelAction ? 'close-circle-outline' : step.position === 2 ? 'person-outline' : step.position === 3 ? 'calculator-outline' : 'arrow-forward-outline'}
                size={24}
                color={cancelAction ? colors.success : colors.primary}
              />
            </View>
            <AppText weight="800" style={styles.flex1}>{option.label}</AppText>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

function StepActions({ step, busy, onSubmit }: { step: ParticipantMissionStep; busy: boolean; onSubmit: (action: MissionAction) => Promise<void> }) {
  const { preferences } = useApp();
  const expected = asObject(step.expectedAction);
  const options = Array.isArray(step.options) ? step.options.filter(isOption) : [];

  const handleAction = async (action: MissionAction) => {
    if (preferences.hapticFeedback) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSubmit(action);
  };

  if (options.length) {
    return (
      <View style={styles.options}>
        {options.map((option) => (
          <Button
            key={option.id}
            label={option.label}
            variant="secondary"
            disabled={busy}
            onPress={() => void handleAction({ action: expected.action === 'select' ? 'select' : 'choose', optionId: option.id })}
          />
        ))}
      </View>
    );
  }
  const action = expected.action === 'tap' ? 'tap' : 'continue';
  return (
    <Button
      label={action === 'tap' ? labelForTarget(expected.target) : 'Continuar'}
      icon={action === 'tap' ? 'hand-left-outline' : 'arrow-forward'}
      disabled={busy}
      onPress={() => void handleAction({ action, target: expected.target })}
    />
  );
}

function SyncStatusCard({ engine }: { engine: ReturnType<typeof useMissionEngine> }) {
  if (engine.syncStatus === 'synced') return null;
  const offline = engine.syncStatus === 'offline';
  const failed = engine.syncStatus === 'failed';
  const syncing = engine.syncStatus === 'syncing';
  return (
    <Card style={styles.syncCard}>
      <Ionicons name={offline ? 'cloud-offline-outline' : failed ? 'alert-circle-outline' : 'cloud-upload-outline'} size={24} color={failed ? colors.danger : colors.primary} />
      <View style={styles.safeCopy}>
        <AppText weight="800">{offline ? 'Praticando sem internet' : failed ? 'Sincronização pendente' : syncing ? 'Sincronizando…' : 'Alterações salvas no aparelho'}</AppText>
        <AppText variant="small" color={colors.textMuted}>{engine.pendingCount} atividade(s) aguardando envio. Você pode continuar normalmente.</AppText>
      </View>
      {failed ? <Button label="Tentar novamente" variant="soft" onPress={() => void engine.retry()} /> : null}
    </Card>
  );
}

function asObject(value: ParticipantMissionStep['expectedAction']): { action?: string; target?: string } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as { action?: string; target?: string } : {};
}
function asExpectedAction(value: ParticipantMissionStep['expectedAction']): { action?: string; target?: string; option_id?: string } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as { action?: string; target?: string; option_id?: string } : {};
}
function isOption(value: unknown): value is { id: string; label: string } {
  return Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string' && typeof (value as { label?: unknown }).label === 'string');
}
function labelForTarget(target?: string) {
  const labels: Record<string, string> = { attachment_button: 'Tocar no clipe', location_option: 'Escolher localização' };
  return target ? labels[target] ?? 'Tocar na opção indicada' : 'Continuar';
}
function iconForStep(step: ParticipantMissionStep): 'phone-portrait-outline' | 'hand-left-outline' | 'list-outline' | 'shield-checkmark-outline' {
  if (step.type === 'instruction') return 'phone-portrait-outline';
  if (step.type === 'tap_target') return 'hand-left-outline';
  if (step.type === 'multiple_choice') return 'list-outline';
  return 'shield-checkmark-outline';
}
function SimulatorState({ kind, retry }: { kind: 'loading' | 'error' | 'empty'; retry: () => void }) {
  const router = useRouter();
  return <Screen footer={<ParticipantNav active="missions" />}><Header title="Simulador seguro" onBack={() => router.replace('/participant/missions')} /><DataState kind={kind} title={kind === 'loading' ? 'Preparando o treino' : kind === 'error' ? 'Não foi possível carregar' : 'Treino indisponível'} message="A versão publicada não está disponível para esta turma." onRetry={retry} /></Screen>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  instructionCard: { backgroundColor: '#F6EEFF', borderColor: colors.primaryMuted, gap: spacing.md },
  instructionTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  simulation: { backgroundColor: '#FFFDFB', borderColor: colors.primaryDark, borderWidth: 2, gap: spacing.xl, minHeight: 390, ...shadow },
  safeHeader: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.md },
  safeIcon: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  safeCopy: { flex: 1 },
  taskArea: { alignItems: 'center', backgroundColor: '#F8F3FF', borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  center: { textAlign: 'center' },
  options: { gap: spacing.md },
  feedback: { alignItems: 'center', backgroundColor: colors.warningSoft, flexDirection: 'row', gap: spacing.md },
  hints: { backgroundColor: colors.primarySoft, gap: spacing.sm },
  supportActions: { gap: spacing.md },
  syncCard: { alignItems: 'center', backgroundColor: colors.warningSoft, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  whatsappFrame: { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: 28, borderWidth: 2, overflow: 'hidden', padding: 0 },
  whatsappHeader: { alignItems: 'center', backgroundColor: colors.primary, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerLeft: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  avatarMini: { backgroundColor: '#c4d6d5', borderRadius: 999, height: 24, width: 24 },
  chatBody: { backgroundColor: '#F8F3FF', gap: spacing.sm, padding: spacing.md },
  chatBubbleRow: { flexDirection: 'row' },
  chatBubbleRowRight: { flexDirection: 'row', justifyContent: 'flex-end' },
  chatBubble: { backgroundColor: colors.surface, borderRadius: 16, maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chatBubbleGreen: { backgroundColor: colors.primarySoft, borderRadius: 16, maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  photoCard: { alignItems: 'center', backgroundColor: '#24394d', borderRadius: 18, height: 180, justifyContent: 'center', overflow: 'hidden' },
  photoScene: { backgroundColor: '#2b9ac0', borderRadius: 18, height: '100%', width: '100%' },
  attachmentScene: { alignItems: 'center', gap: spacing.md, justifyContent: 'center', minHeight: 220, paddingBottom: spacing.sm, paddingTop: spacing.md },
  cameraButton: { alignItems: 'center', backgroundColor: '#1b1e20', borderRadius: 999, height: 170, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, width: 170 },
  actionSheet: { alignSelf: 'stretch', backgroundColor: '#f0f3f8', borderRadius: 22, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  optionRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  optionRowSelected: { alignItems: 'center', backgroundColor: '#e6eefb', borderRadius: 14, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  chatInputRow: { alignItems: 'center', backgroundColor: colors.primary, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  inputBox: { backgroundColor: '#1d3747', borderRadius: 14, flex: 1, height: 36 },
  pixMockCard: { backgroundColor: '#e9e9e9', borderColor: '#d8d8d8', borderRadius: 28, overflow: 'hidden', padding: 0 },
  phoneShell: { backgroundColor: '#F4F1F7', gap: spacing.lg, minHeight: 620, padding: 18, width: '100%' },
  statusBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 6 },
  signalGroup: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  signal: { backgroundColor: '#1f1f1f', borderRadius: 8, height: 8, width: 8 },
  pixHeaderPurple: { backgroundColor: colors.primary, borderRadius: 18, marginBottom: 16, padding: 18 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatarSmall: { backgroundColor: '#d8d5d8', borderRadius: 999, height: 32, width: 32 },
  headerProfile: { flex: 1 },
  balanceBox: { backgroundColor: '#ffffff', borderRadius: 18, gap: 4, marginBottom: 18, paddingHorizontal: 18, paddingVertical: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  actionItem: { alignItems: 'center', width: 72 },
  actionCircle: { alignItems: 'center', backgroundColor: '#e8e8e8', borderRadius: 999, height: 52, justifyContent: 'center', marginBottom: 8, width: 52 },
  bottomSpacer: { height: 90 },
  modalTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  areaTitle: { marginBottom: 16 },
  inputStub: { backgroundColor: '#f1ecff', borderRadius: 12, height: 52, marginBottom: 20 },
  iconGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  iconTile: { alignItems: 'center', backgroundColor: '#f1f1f1', borderRadius: 999, height: 60, justifyContent: 'center', width: 60 },
  textStack: { gap: 16, marginBottom: 16 },
  copiarBox: { alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', minHeight: 42 },
  keypad: { backgroundColor: '#dfe4ea', borderRadius: 18, gap: 8, padding: 12 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  keyCell: { alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 10, height: 48, justifyContent: 'center', width: '30%' },
  detailStack: { gap: 12, marginBottom: 18 },
  detailTable: { backgroundColor: '#ffffff', borderRadius: 12, gap: 10, padding: 12 },
  detailRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  methodHeading: { gap: 6, marginBottom: 18 },
  choiceCard: { backgroundColor: '#ffffff', borderRadius: 18, gap: 16, marginBottom: 18, padding: 18 },
  choiceRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  choiceText: { flex: 1 },
  radio: { backgroundColor: '#6d1bbf', borderRadius: 999, height: 18, width: 18 },
  radioEmpty: { borderColor: '#c7c7c7', borderRadius: 999, borderWidth: 2, height: 18, width: 18 },
  loadingText: { marginTop: 80 },
  progressBarTrack: { backgroundColor: '#e5e5e5', borderRadius: 999, height: 8, marginBottom: 24, marginTop: 64, overflow: 'hidden' },
  progressBarFill: { backgroundColor: '#6d1bbf', borderRadius: 999, height: 8, width: '65%' },
  successCircle: { alignItems: 'center', backgroundColor: '#1ab270', borderRadius: 999, height: 84, justifyContent: 'center', marginBottom: 20, marginTop: 40, width: 84 },
  successTitle: { marginBottom: 20, textAlign: 'center' },
  successTable: { backgroundColor: '#ffffff', borderRadius: 16, gap: 12, marginBottom: 18, padding: 18 },
  successRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  bottomAction: { marginTop: 24 },
  pixTrainingHeader: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  pixTrainingIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: radius.round, height: 52, justifyContent: 'center', width: 52 },
  pixSummaryCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  pixSummaryCompact: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  pixDivider: { backgroundColor: colors.border, height: 1, marginVertical: spacing.sm },
  pixSafetyRow: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  pixComparisonRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  pixComparisonCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flex: 1, gap: spacing.xs, padding: spacing.md },
  pixComparisonWarning: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  pixWarningCard: { alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: colors.warning, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.xl },
  bankHeader: { backgroundColor: colors.primary, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
  bankHeaderCompact: { paddingVertical: spacing.md },
  bankHeaderTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  bankAvatar: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.55)', borderRadius: radius.round, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  bankHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  bankBalanceCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  bankSectionTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  bankBottomNav: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-around', marginTop: 'auto', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  bankNavItem: { alignItems: 'center', borderRadius: radius.md, gap: 2, minWidth: 58, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  bankNavItemActive: { backgroundColor: colors.primarySoft },
  bankActionList: { gap: spacing.sm },
  bankActionRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 64, padding: spacing.md },
  bankActionRowSafe: { backgroundColor: colors.successSoft, borderColor: colors.success },
  bankActionRowRisky: { borderColor: colors.border },
  bankActionRowPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  bankActionIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 42, justifyContent: 'center', width: 42 },
  bankActionIconSafe: { backgroundColor: colors.successSoft },
  environmentFrame: { backgroundColor: '#F4F5F7', borderColor: colors.border, borderRadius: 28, borderWidth: 1, gap: spacing.md, overflow: 'hidden', padding: 0 },
  environmentHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  environmentHeaderIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  environmentToolbar: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  environmentScene: { gap: spacing.md, justifyContent: 'flex-start', minHeight: 180, padding: spacing.lg },
  environmentActionList: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  environmentOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 66, padding: spacing.md },
  environmentOptionIcon: { alignItems: 'center', borderRadius: radius.round, height: 42, justifyContent: 'center', width: 42 },
  environmentPrimaryAction: { alignItems: 'center', borderRadius: radius.lg, justifyContent: 'center', marginHorizontal: spacing.lg, minHeight: 54, padding: spacing.md },
  environmentHomeIndicator: { alignSelf: 'center', backgroundColor: '#222', borderRadius: radius.round, height: 5, marginBottom: spacing.sm, marginTop: spacing.xs, width: 110 },
  marketplaceScreen: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  marketplaceTopBar: { alignItems: 'center', backgroundColor: '#E45A37', borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  marketplaceTopIcons: { flexDirection: 'row', gap: spacing.lg },
  marketplaceHeaderIcon: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 34, position: 'relative' },
  marketplaceNotificationBadge: { alignItems: 'center', backgroundColor: '#C93636', borderColor: colors.surface, borderRadius: radius.round, borderWidth: 2, height: 21, justifyContent: 'center', position: 'absolute', right: -7, top: -4, width: 21 },
  marketplaceCartIcon: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, position: 'relative' },
  marketplaceCartBadge: { alignItems: 'center', backgroundColor: '#E45A37', borderColor: colors.surface, borderRadius: radius.round, borderWidth: 2, height: 23, justifyContent: 'center', position: 'absolute', right: -3, top: -2, width: 23 },
  marketplaceSearch: { alignItems: 'center', backgroundColor: colors.surface, borderColor: '#F2A48F', borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', gap: spacing.sm, minHeight: 54, paddingHorizontal: spacing.md },
  marketplaceSearchInput: { color: colors.text, flex: 1, fontSize: 17, minHeight: 50 },
  marketplacePromo: { alignItems: 'center', backgroundColor: '#E45A37', borderRadius: radius.lg, flexDirection: 'row', justifyContent: 'space-between', minHeight: 112, padding: spacing.lg },
  marketplacePromoCopy: { flex: 1, gap: spacing.xs },
  marketplacePromoDots: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  marketplacePromoDot: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radius.round, height: 6, width: 6 },
  marketplacePromoDotActive: { backgroundColor: colors.surface, borderRadius: radius.round, height: 6, width: 18 },
  marketplaceShortcuts: { flexDirection: 'row', justifyContent: 'space-between' },
  marketplaceShortcut: { alignItems: 'center', gap: spacing.xs, width: '23%' },
  marketplaceShortcutIcon: { alignItems: 'center', backgroundColor: colors.surface, borderColor: '#F2C4B7', borderRadius: radius.md, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  marketplaceGrid: { flexDirection: 'row', gap: spacing.md },
  marketplaceProductTile: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.xs, padding: spacing.sm },
  marketplaceProductTileImage: { alignItems: 'center', backgroundColor: '#FFF1EC', borderRadius: radius.md, height: 110, justifyContent: 'center', position: 'relative' },
  marketplaceDiscountBadge: { alignItems: 'center', backgroundColor: '#E45A37', borderBottomLeftRadius: radius.sm, borderTopRightRadius: radius.md, justifyContent: 'center', paddingHorizontal: spacing.xs, paddingVertical: 3, position: 'absolute', right: 0, top: 0 },
  marketplaceProductMeta: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  marketplaceListing: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 130, padding: spacing.md },
  marketplaceListingSafe: { borderColor: colors.success },
  marketplaceProductImage: { alignItems: 'center', backgroundColor: '#FFF1EC', borderRadius: radius.md, height: 90, justifyContent: 'center', width: 90 },
  marketplaceProductImageRisk: { backgroundColor: '#FFF0F1' },
  marketplacePageTitle: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  marketplaceCartCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  marketplaceStoreRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  marketplaceCartProduct: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  marketplaceCouponRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md },
  marketplaceTotals: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  marketplaceTotalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  marketplaceDivider: { backgroundColor: colors.border, height: 1 },
  marketplaceTotalChoices: { gap: spacing.sm },
  marketplaceCheckoutBar: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm, ...shadow },
  marketplaceSelectAll: { alignItems: 'center', gap: 2, justifyContent: 'center', minHeight: 58, minWidth: 54 },
  marketplaceCheckoutTotal: { alignItems: 'flex-end', flex: 1, gap: 2 },
  marketplaceFreightLine: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  marketplaceTotalInline: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.xs },
  marketplaceContinueButton: { alignItems: 'center', backgroundColor: '#E45A37', borderRadius: radius.md, justifyContent: 'center', minHeight: 58, minWidth: 142, paddingHorizontal: spacing.md },
  marketplaceContinueButtonDisabled: { backgroundColor: '#C8C4C6' },
  marketplaceOrderBar: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.lg, justifyContent: 'flex-end', padding: spacing.sm, ...shadow },
  marketplacePlaceOrderButton: { alignItems: 'center', backgroundColor: '#E45A37', borderRadius: radius.md, justifyContent: 'center', minHeight: 58, minWidth: 180, paddingHorizontal: spacing.lg },
  marketplaceCheckoutCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  marketplaceAddressRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  marketplaceAddressRowError: { backgroundColor: '#FFF0F1', borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.sm },
  marketplaceAddressInput: { borderBottomColor: colors.border, borderBottomWidth: 1, color: colors.text, flex: 1, fontSize: 16, minHeight: 48 },
  marketplaceFakeAddressButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF1EC', borderRadius: radius.md, flexDirection: 'row', gap: spacing.xs, minHeight: 42, paddingHorizontal: spacing.md },
  marketplacePaymentRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 58, paddingVertical: spacing.sm },
  marketplaceProductHero: { alignItems: 'center', backgroundColor: '#FFF1EC', borderRadius: radius.lg, gap: spacing.md, justifyContent: 'center', minHeight: 230, padding: spacing.xl },
  marketplaceGalleryDots: { flexDirection: 'row', gap: spacing.xs },
  marketplaceGalleryDot: { backgroundColor: colors.border, borderRadius: radius.round, height: 7, width: 7 },
  marketplaceGalleryDotActive: { backgroundColor: '#E45A37', borderRadius: radius.round, height: 7, width: 20 },
  marketplaceRatingRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  marketplaceSellerCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  marketplaceSellerAvatar: { alignItems: 'center', backgroundColor: '#FFF1EC', borderRadius: radius.round, height: 48, justifyContent: 'center', width: 48 },
  marketplaceVariationRow: { flexDirection: 'row', gap: spacing.sm },
  marketplaceVariation: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flex: 1, minHeight: 48, justifyContent: 'center', padding: spacing.sm },
  marketplaceVariationSelected: { backgroundColor: '#FFF1EC', borderColor: '#E45A37', borderWidth: 2 },
  marketplaceQuantity: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  marketplaceProtection: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: colors.success, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  marketplaceAddedNotice: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: colors.success, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  marketplaceCartActions: { gap: spacing.sm },
  marketplaceCouponInputRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  marketplaceCouponInput: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, flex: 1, minHeight: 48, paddingHorizontal: spacing.md },
  marketplaceWarning: { alignItems: 'center', backgroundColor: colors.warningSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  marketplaceDeliveryOption: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 68, padding: spacing.md },
  marketplaceDeliverySelected: { backgroundColor: '#FFF1EC', borderColor: '#E45A37', borderWidth: 2 },
  marketplaceSellerInput: { backgroundColor: '#F7F7F8', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 52, paddingHorizontal: spacing.md },
  marketplaceSuccessScreen: { alignItems: 'stretch', gap: spacing.lg, padding: spacing.xl },
  marketplaceSuccessCircle: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.success, borderRadius: radius.round, height: 92, justifyContent: 'center', width: 92 },
  marketplaceBottomNav: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  marketplaceBottomNavItem: { alignItems: 'center', gap: 2, minWidth: 54 },
  marketplaceBottomIcon: { alignItems: 'center', justifyContent: 'center', minHeight: 28, minWidth: 30, position: 'relative' },
  marketplaceBottomBadge: { alignItems: 'center', backgroundColor: '#E45A37', borderColor: colors.surface, borderRadius: radius.round, borderWidth: 1, height: 19, justifyContent: 'center', position: 'absolute', right: -4, top: -5, width: 19 },
  fakeChatReceived: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 18, maxWidth: '82%', padding: spacing.md, ...shadow },
  fakeChatInput: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fakeMap: { alignItems: 'center', backgroundColor: '#DDE9DF', borderRadius: radius.lg, flexDirection: 'row', height: 180, justifyContent: 'space-around', overflow: 'hidden' },
  fakeRoute: { borderColor: '#FFFFFF', borderStyle: 'dashed', borderTopWidth: 4, width: '45%' },
  fakeSearch: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  mobilityExperience: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  mobilityLogin: { backgroundColor: colors.surface, gap: spacing.lg, minHeight: 480, padding: spacing.lg },
  mobilityLoginBrand: { alignItems: 'center', borderRadius: radius.xl, flexDirection: 'row', gap: spacing.md, justifyContent: 'center', minHeight: 105, padding: spacing.lg },
  mobilityLoginCopy: { gap: spacing.sm, paddingVertical: spacing.sm },
  mobilityPhoneRow: { flexDirection: 'row', gap: spacing.sm },
  mobilityCountryCode: { alignItems: 'center', backgroundColor: '#EEF0F2', borderRadius: radius.md, justifyContent: 'center', minHeight: 58, width: 72 },
  mobilityPhoneInput: { backgroundColor: '#EEF0F2', borderRadius: radius.md, color: colors.text, flex: 1, fontSize: 19, minHeight: 58, paddingHorizontal: spacing.md },
  mobilityCodeInput: { backgroundColor: '#EEF0F2', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: 10, minHeight: 66, paddingHorizontal: spacing.lg, textAlign: 'center' },
  mobilityLoginError: { alignItems: 'center', backgroundColor: '#FFF0F1', borderColor: colors.danger, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  mobilityNameRow: { flexDirection: 'row', gap: spacing.sm },
  mobilityProfileInput: { backgroundColor: '#EEF0F2', borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, fontSize: 17, minHeight: 56, paddingHorizontal: spacing.md },
  mobilityLanguageRow: { flexDirection: 'row', gap: spacing.sm },
  mobilityLanguageOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1.5, flex: 1, minHeight: 50, justifyContent: 'center', padding: spacing.sm },
  mobilityPasswordRules: { backgroundColor: colors.primarySoft, borderRadius: radius.md, gap: spacing.xs, padding: spacing.md },
  mobilitySignupSummary: { backgroundColor: '#F5F6F7', borderRadius: radius.lg, gap: spacing.sm, padding: spacing.md },
  mobilitySignupSummaryRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 38 },
  mobilityTermsRow: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  mobilityTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  mobilityAppChooser: { flexDirection: 'row', gap: spacing.sm },
  mobilityAppChoice: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flex: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 68, padding: spacing.sm },
  mobilityAppChoiceUber: { backgroundColor: '#F2F3F4', borderColor: '#1E252B', borderWidth: 2.5 },
  mobilityAppChoice99: { backgroundColor: '#FFF7D6', borderColor: '#E8B600', borderWidth: 2.5 },
  mobilityAppMonogram: { alignItems: 'center', borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  mobilityAppMonogramUber: { backgroundColor: '#1E252B' },
  mobilityAppMonogram99: { backgroundColor: '#F3C623' },
  mobilityTabs: { borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.lg },
  mobilityTab: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  mobilityTabActive: { alignItems: 'center', borderBottomColor: '#28323C', borderBottomWidth: 3, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  mobilitySearchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1.5, flexDirection: 'row', gap: spacing.sm, minHeight: 62, paddingHorizontal: spacing.lg, ...shadow },
  mobilitySearchInput: { color: colors.text, flex: 1, fontSize: 20, minHeight: 58 },
  mobilityCoach: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  mobilityPlanningHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  mobilityRouteFields: { backgroundColor: colors.surface, borderColor: colors.text, borderRadius: radius.lg, borderWidth: 2, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  mobilityRouteDots: { alignItems: 'center', paddingVertical: 7, width: 18 },
  mobilityOriginDot: { backgroundColor: '#3478F6', borderRadius: radius.round, height: 12, width: 12 },
  mobilityDotsLine: { backgroundColor: colors.textMuted, flex: 1, marginVertical: 3, width: 2 },
  mobilityEndSquare: { backgroundColor: colors.text, borderRadius: 2, height: 12, width: 12 },
  mobilityField: { borderBottomColor: colors.border, borderBottomWidth: 1, minHeight: 42, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  mobilityAddressInput: { borderBottomColor: colors.border, borderBottomWidth: 1, color: colors.text, fontSize: 17, minHeight: 50, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  mobilityEditButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 44, justifyContent: 'center', width: 44 },
  mobilityPrivacyNote: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  mobilityPlaceRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 76, padding: spacing.md },
  mobilityPlaceIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  mobilityMap: { backgroundColor: '#E8ECEF', borderRadius: radius.lg, height: 260, overflow: 'hidden', position: 'relative' },
  mobilityMapCompact: { height: 190 },
  mobilityMapCanvas: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, transform: [{ scale: 1 }] },
  mobilityMapCanvasZoomed: { transform: [{ scale: 1.22 }] },
  mobilityBlock: { backgroundColor: '#D6DCDF', borderColor: '#C8D0D4', borderRadius: 9, borderWidth: 1, position: 'absolute' },
  mobilityBlockNorth: { height: 64, left: 18, top: 34, width: '35%' },
  mobilityBlockWest: { height: 74, left: 15, top: 145, width: '31%' },
  mobilityBlockEast: { height: 68, right: 18, top: 31, width: '31%' },
  mobilityBlockSouth: { bottom: 13, height: 67, right: 14, width: '37%' },
  mobilityRoad: { backgroundColor: '#FFFFFF', position: 'absolute' },
  mobilityRoadHorizontal: { height: 27, left: -20, right: -20, top: 107, transform: [{ rotate: '-8deg' }] },
  mobilityRoadHorizontalSecond: { bottom: 43, height: 23, left: -20, right: -20, transform: [{ rotate: '-4deg' }] },
  mobilityRoadVertical: { bottom: -30, right: 88, top: -30, transform: [{ rotate: '12deg' }], width: 31 },
  mobilityRoadVerticalSecond: { bottom: -35, left: 105, top: -35, transform: [{ rotate: '-5deg' }], width: 24 },
  mobilityRoadDiagonal: { bottom: 35, height: 25, left: -30, right: -30, transform: [{ rotate: '20deg' }] },
  mobilityStreetName: { position: 'absolute' },
  mobilityStreetCentral: { left: '37%', top: 119, transform: [{ rotate: '-8deg' }] },
  mobilityStreetGarden: { right: 62, top: 146, transform: [{ rotate: '78deg' }] },
  mobilityLandmark: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radius.sm, flexDirection: 'row', gap: 3, paddingHorizontal: 6, paddingVertical: 4, position: 'absolute' },
  mobilityLandmarkPark: { left: 28, top: 61 },
  mobilityLandmarkLibrary: { bottom: 25, right: 23 },
  mobilityMapLabel: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radius.round, left: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, position: 'absolute', top: spacing.sm },
  mobilityPickupDot: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.round, height: 34, justifyContent: 'center', left: '28%', position: 'absolute', top: '48%', width: 34, ...shadow },
  mobilityPickupDotInner: { backgroundColor: '#3478F6', borderRadius: radius.round, height: 15, width: 15 },
  mobilityRouteLine: { backgroundColor: '#28323C', borderRadius: radius.round, height: 6, position: 'absolute' },
  mobilityRouteLineOne: { left: '32%', top: '53%', transform: [{ rotate: '-18deg' }], width: '27%' },
  mobilityRouteLineTwo: { left: '55%', top: '43%', transform: [{ rotate: '-43deg' }], width: '22%' },
  mobilityCarMarker: { alignItems: 'center', backgroundColor: '#28323C', borderColor: colors.surface, borderRadius: radius.round, borderWidth: 2, height: 34, justifyContent: 'center', left: '49%', position: 'absolute', top: '44%', width: 34, ...shadow },
  mobilityDestinationPin: { alignItems: 'center', backgroundColor: '#28323C', borderRadius: radius.round, height: 42, justifyContent: 'center', position: 'absolute', right: '21%', top: '31%', width: 42, ...shadow },
  mobilityZoomControls: { gap: 2, position: 'absolute', right: spacing.sm, top: spacing.sm },
  mobilityZoomButton: { alignItems: 'center', backgroundColor: colors.surface, height: 42, justifyContent: 'center', width: 42, ...shadow },
  mobilityZoomButtonDisabled: { opacity: 0.45 },
  mobilityMapCallout: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, bottom: spacing.sm, left: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, position: 'absolute', ...shadow },
  mobilityBottomSheet: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, gap: spacing.md, marginTop: -42, padding: spacing.lg, ...shadow },
  mobilitySheetHandle: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: radius.round, height: 5, width: 54 },
  mobilityAddressRow: { alignItems: 'center', backgroundColor: '#F5F6F7', borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  mobilityRideRow: { alignItems: 'center', borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 78, padding: spacing.md },
  mobilityRideSelected: { backgroundColor: colors.primarySoft, borderColor: '#28323C', borderWidth: 2.5 },
  mobilityVehicleIcon: { alignItems: 'center', backgroundColor: '#EEF0F2', borderRadius: radius.md, height: 52, justifyContent: 'center', width: 58 },
  mobilitySelectedExplanation: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  mobilityPaymentRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 74, padding: spacing.md },
  mobilityPaymentIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  mobilityAddPayment: { alignItems: 'center', borderColor: colors.primaryMuted, borderRadius: radius.lg, borderStyle: 'dashed', borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 68, padding: spacing.md },
  mobilityPaymentSummary: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  mobilityTrainingCard: { backgroundColor: '#303943', borderRadius: radius.xl, gap: spacing.xl, minHeight: 180, padding: spacing.lg, ...shadow },
  mobilityCardTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  mobilityCardBottom: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  mobilityConfirmIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#EEF0F2', borderRadius: radius.round, height: 76, justifyContent: 'center', width: 76 },
  mobilitySafetyRow: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  storeSearchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primaryMuted, borderRadius: radius.round, borderWidth: 2, flexDirection: 'row', gap: spacing.sm, minHeight: 54, paddingHorizontal: spacing.md },
  storeSearchInput: { color: colors.text, flex: 1, fontSize: 17, minHeight: 50 },
  storeEmptyState: { alignItems: 'center', gap: spacing.sm, justifyContent: 'center', minHeight: 150, padding: spacing.lg },
  storeExperience: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  storeCoach: { alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  storeCoachNumber: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 36, justifyContent: 'center', width: 36 },
  storeSearchSuccess: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: colors.success, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  storeResultCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, minHeight: 88, padding: spacing.md },
  storeResultTrusted: { borderColor: colors.success },
  storeAppDetail: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  storePermissionAlert: { alignItems: 'center', backgroundColor: colors.warningSoft, borderColor: colors.warning, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  storeUnsafeFeedback: { alignItems: 'center', backgroundColor: '#FFF0F1', borderColor: colors.danger, borderRadius: radius.lg, borderWidth: 1.5, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  storeStats: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', paddingVertical: spacing.md },
  storeStat: { alignItems: 'center', borderRightColor: colors.border, borderRightWidth: 1, flex: 1, gap: 2 },
  storePreview: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.lg, minHeight: 120, padding: spacing.lg },
  storeDownloadRow: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  storeDownloadRing: { alignItems: 'center', borderRadius: radius.round, borderWidth: 5, height: 68, justifyContent: 'center', width: 68 },
  storeProgressTrack: { backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 10, overflow: 'hidden' },
  storeProgressFill: { borderRadius: radius.round, height: '100%' },
  storeInstalled: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: colors.success, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  storeInstalledActions: { gap: spacing.sm },
  storeOpenedScreen: { alignItems: 'center', gap: spacing.lg, justifyContent: 'center', minHeight: 410, padding: spacing.xl },
  storeOpenedLogo: { alignItems: 'center', borderRadius: 28, height: 120, justifyContent: 'center', width: 120, ...shadow },
  storeOpenedWelcome: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.primarySoft, borderColor: colors.primaryMuted, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  fakeProduct: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  fakeAppIcon: { alignItems: 'center', borderRadius: radius.lg, height: 60, justifyContent: 'center', width: 60 },
  fakeAppIconUnknown: { backgroundColor: '#E4E4E8' },
  fakeProductImage: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 88, justifyContent: 'center', width: 88 },
  fakeCallScene: { alignItems: 'center' },
  fakeCallerAvatar: { alignItems: 'center', borderRadius: radius.round, height: 96, justifyContent: 'center', width: 96 },
  fakeCallControls: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xl },
  fakeCallButton: { alignItems: 'center', backgroundColor: '#E2E4E8', borderRadius: radius.round, height: 58, justifyContent: 'center', width: 58 },
  fakeCallEnd: { backgroundColor: '#C93636', transform: [{ rotate: '135deg' }] },
  govFrame: { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 2, borderRadius: radius.xl, overflow: 'hidden', padding: 0 },
  govScreenContainer: { backgroundColor: '#F8FAFC', paddingBottom: spacing.lg },
  govTopNav: { alignItems: 'center', backgroundColor: colors.primarySoft, borderBottomColor: colors.primaryMuted, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  govNavIcons: { flexDirection: 'row', gap: spacing.md },
  govCardInternal: { gap: spacing.md, padding: spacing.lg },
  govSectionRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  govFieldBlock: { gap: spacing.xs, marginTop: spacing.xs },
  govInputMock: { backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, height: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  govPrimaryBtn: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.round, height: 50, justifyContent: 'center', marginTop: spacing.sm },
  govOutlineBtn: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.round, borderWidth: 1.5, height: 48, justifyContent: 'center', marginTop: spacing.sm },
  govDividerLine: { backgroundColor: '#E2E8F0', height: 1, marginVertical: spacing.xs },
  govOptionList: { gap: spacing.sm },
  govOptionRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  govCheckRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs },
  govCaptchaBox: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  govBankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  govBankTile: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: '48%' },
  govPillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  govPillItem: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.round, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  govPillItemActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  govMaskedBox: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  govStepperRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginVertical: spacing.sm },
  govStepCircle: { backgroundColor: '#CBD5E1', borderRadius: radius.round, height: 12, width: 12 },
  govStepCircleActive: { backgroundColor: colors.primary, height: 16, width: 16 },
  govStepLine: { backgroundColor: '#CBD5E1', height: 2, width: 24 },
  govRadioRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  govInputMockGreen: { backgroundColor: '#ECFDF3', borderColor: colors.success, borderRadius: radius.md, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  govModalAlert: { backgroundColor: '#FFF8E1', borderColor: colors.warning, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  govModalBadge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: radius.round, height: 36, justifyContent: 'center', width: 36 },
  govInputMockRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: spacing.md },
  govChecklistBlock: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  govCheckItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  govAccessibilityBadge: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, height: 42, justifyContent: 'center', width: 42 },
  govSuccessContent: { alignItems: 'stretch', paddingVertical: spacing.xl },
  govConfettiRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  govConfettiDot: { borderRadius: 3, height: 9, width: 5 },
  govBronzeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginVertical: spacing.md },
  govBronzeCard: { backgroundColor: '#ffffff', borderRadius: radius.sm, gap: 4, padding: spacing.sm, ...shadow },
  govBronzeBarLight: { backgroundColor: '#F3D3CB', height: 7, width: 52 },
  govBronzeBarMedium: { backgroundColor: '#D98A78', height: 7, width: 52 },
  govBronzeBarDark: { backgroundColor: '#A24F3D', height: 7, width: 52 },
  govInfoRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  govSimulationNotice: { alignItems: 'center', backgroundColor: colors.successSoft, borderColor: colors.success, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  centerText: { textAlign: 'center' },
  flex1: { flex: 1 },
});
