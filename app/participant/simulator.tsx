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

        {engine.run.mistakes > 0 ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
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
      {engine.run.mistakes > 0 ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
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
      {engine.run.mistakes > 0 ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
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
        <View style={styles.environmentToolbar}><Ionicons name="chevron-back" size={22} color={colors.text} /><AppText variant="small" weight="800">{config.label}</AppText><Tag label={`ETAPA ${step.position}/${steps.length}`} tone="purple" /></View>
        {presentation === 'app-store' ? (
          <AppStoreExperience step={step} busy={engine.busy} query={environmentQuery} onQueryChange={setEnvironmentQuery} onSubmit={engine.submit} accent={config.accent} />
        ) : presentation === 'mobility' ? (
          <MobilityExperience step={step} busy={engine.busy} query={environmentQuery} onQueryChange={setEnvironmentQuery} onSubmit={engine.submit} accent={config.accent} />
        ) : (
          <><EnvironmentScene presentation={presentation} step={step} accent={config.accent} query={environmentQuery} onQueryChange={setEnvironmentQuery} /><EnvironmentActions step={step} busy={engine.busy} accent={config.accent} onSubmit={engine.submit} /></>
        )}
        <View style={styles.environmentHomeIndicator} />
      </Card>
      <Card style={styles.instructionCard}>
        <View style={styles.instructionTop}><AppText variant="small" weight="800" color={colors.primary}>PASSO {step.position} DE {steps.length}</AppText><Tag label="Simulação segura" tone="green" /></View>
        <AppText variant="subheading" weight="800">{step.title}</AppText><AppText color={colors.textMuted}>{step.instruction}</AppText><ProgressBar value={Math.round(100 * step.position / steps.length)} height={10} />
      </Card>
      {engine.run.mistakes > 0 ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Essa ação não é a mais segura. Nada aconteceu de verdade; tente outra opção.</AppText></Card> : null}
      <View style={styles.supportActions}><Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} /><Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} /></View>
    </Screen>
  );
}

function MobilityExperience({ step, busy, query, onQueryChange, onSubmit, accent }: { step: ParticipantMissionStep; busy: boolean; query: string; onQueryChange: (value: string) => void; onSubmit: (action: MissionAction) => Promise<void>; accent: string }) {
  const [pickupReview, setPickupReview] = useState(false);
  const [ridePhase, setRidePhase] = useState<'options' | 'pickup' | 'confirming'>('options');
  const [selectedRide, setSelectedRide] = useState<'economy' | 'comfort'>('economy');
  const hasDestination = query.trim().length >= 3;

  if (step.position === 1) return <View style={styles.mobilityExperience}>
    <View style={styles.mobilityTopRow}><View><AppText variant="caption" color={colors.textMuted}>PONTO DE PARTIDA FICTÍCIO</AppText><AppText weight="900">Localização de treino</AppText></View><Ionicons name="notifications-outline" size={24} color={colors.text} /></View>
    <View style={styles.mobilityTabs}><View style={styles.mobilityTabActive}><Ionicons name="car-sport" size={22} color={accent} /><AppText weight="900">Viagens</AppText></View><View style={styles.mobilityTab}><Ionicons name="cube-outline" size={21} color={colors.textMuted} /><AppText color={colors.textMuted}>Entregas</AppText></View></View>
    <View style={styles.mobilitySearchBox}><Ionicons name="search" size={25} color={colors.text} /><TextInput accessibilityLabel="Digite o destino da viagem simulada" autoCorrect={false} onChangeText={onQueryChange} placeholder="Para onde?" placeholderTextColor={colors.placeholder} returnKeyType="search" style={styles.mobilitySearchInput} value={query} />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar destino" hitSlop={8} onPress={() => onQueryChange('')}><Ionicons name="close-circle" size={23} color={colors.textMuted} /></Pressable> : null}</View>
    <View style={styles.mobilityCoach}><Ionicons name="information-circle-outline" size={26} color={colors.primary} /><View style={styles.flex1}><AppText weight="900">Digite um lugar conhecido</AppText><AppText variant="small" color={colors.textMuted}>Experimente “Biblioteca Municipal”. O aplicativo não acessa sua localização real.</AppText></View></View>
    <Button label="Procurar destinos" icon="search" disabled={!hasDestination || busy} onPress={() => void onSubmit({ action: 'continue' })} />
  </View>;

  if (step.position === 2 && !pickupReview) return <View style={styles.mobilityExperience}>
    <View style={styles.mobilityPlanningHeader}><Ionicons name="arrow-back" size={25} color={colors.text} /><View style={styles.flex1}><AppText variant="subheading" weight="900">Planeje sua viagem</AppText><AppText variant="caption" color={colors.textMuted}>Agora · Para mim</AppText></View></View>
    <View style={styles.mobilityRouteFields}><View style={styles.mobilityRouteDots}><View style={styles.mobilityOriginDot} /><View style={styles.mobilityDotsLine} /><View style={styles.mobilityEndSquare} /></View><View style={styles.flex1}><View style={styles.mobilityField}><AppText variant="small">Localização de treino</AppText></View><View style={styles.mobilityField}><AppText variant="small" color={colors.textMuted}>{query || 'Para onde?'}</AppText></View></View></View>
    <AppText variant="caption" weight="800" color={colors.textMuted}>DESTINOS DE TREINAMENTO</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher Biblioteca Municipal" disabled={busy} onPress={() => setPickupReview(true)} style={({ pressed }) => [styles.mobilityPlaceRow, pressed && styles.bankActionRowPressed]}><View style={styles.mobilityPlaceIcon}><Ionicons name="library-outline" size={24} color={accent} /></View><View style={styles.flex1}><AppText weight="900">Biblioteca Municipal</AppText><AppText variant="small" color={colors.textMuted}>Praça Central · endereço fictício</AppText></View><Ionicons name="chevron-forward" size={22} color={colors.textMuted} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher endereço desconhecido" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'unknown' })} style={({ pressed }) => [styles.mobilityPlaceRow, pressed && styles.bankActionRowPressed]}><View style={styles.mobilityPlaceIcon}><Ionicons name="help-outline" size={24} color={colors.textMuted} /></View><View style={styles.flex1}><AppText weight="800">Endereço desconhecido</AppText><AppText variant="small" color={colors.textMuted}>Confira antes de escolher</AppText></View></Pressable>
  </View>;

  if (step.position === 2) return <View style={styles.mobilityExperience}>
    <MobilityMapScene />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><AppText variant="subheading" weight="900">Confirme o destino</AppText><View style={styles.mobilityAddressRow}><Ionicons name="location" size={24} color={accent} /><View style={styles.flex1}><AppText weight="900">Biblioteca Municipal</AppText><AppText variant="small" color={colors.textMuted}>Praça Central · local fictício</AppText></View></View><Button label="Usar este destino" icon="checkmark" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'library' })} /><Button label="Voltar aos resultados" variant="secondary" onPress={() => setPickupReview(false)} /></View>
  </View>;

  if (ridePhase === 'pickup') return <View style={styles.mobilityExperience}>
    <MobilityMapScene route />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><AppText variant="subheading" weight="900">Confirme o ponto de partida</AppText><View style={styles.mobilityAddressRow}><Ionicons name="navigate-circle" size={28} color={accent} /><View style={styles.flex1}><AppText weight="900">Entrada principal</AppText><AppText variant="small" color={colors.textMuted}>Local de treino · nenhum GPS utilizado</AppText></View></View><Button label="Confirmar partida" disabled={busy} onPress={() => setRidePhase('confirming')} /><Button label="Voltar às opções" variant="secondary" onPress={() => setRidePhase('options')} /></View>
  </View>;

  if (ridePhase === 'confirming') return <View style={styles.mobilityExperience}>
    <MobilityMapScene route />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><View style={styles.mobilityConfirmIcon}><Ionicons name="car-sport" size={38} color={accent} /></View><AppText variant="subheading" weight="900" style={styles.center}>Confirmar viagem simulada?</AppText><AppText color={colors.textMuted} style={styles.center}>Biblioteca Municipal · {selectedRide === 'economy' ? 'Econômico · R$ 8,50' : 'Conforto · R$ 12,90'}</AppText><View style={styles.mobilitySafetyRow}><Ionicons name="shield-checkmark" size={23} color={colors.success} /><AppText variant="small" color={colors.successText} style={styles.flex1}>Nenhum carro será chamado e nenhuma cobrança será feita.</AppText></View><Button label="Confirmar somente o treino" icon="checkmark-circle-outline" disabled={busy} onPress={() => void onSubmit({ action: 'choose', optionId: 'confirm-training' })} /><Button label="Revisar opções" variant="secondary" onPress={() => setRidePhase('options')} /></View>
  </View>;

  return <View style={styles.mobilityExperience}>
    <MobilityMapScene route />
    <View style={styles.mobilityBottomSheet}><View style={styles.mobilitySheetHandle} /><AppText variant="caption" weight="800" color={colors.success}>PREÇOS FICTÍCIOS</AppText><AppText variant="subheading" weight="900">Escolha uma opção</AppText>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedRide === 'economy' }} onPress={() => setSelectedRide('economy')} style={[styles.mobilityRideRow, selectedRide === 'economy' && styles.mobilityRideSelected]}><View style={styles.mobilityVehicleIcon}><Ionicons name="car-sport" size={29} color={accent} /></View><View style={styles.flex1}><AppText weight="900">Econômico</AppText><AppText variant="small" color={colors.textMuted}>Chegada em 5 min · até 4 pessoas</AppText></View><AppText weight="900">R$ 8,50</AppText></Pressable>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: selectedRide === 'comfort' }} onPress={() => setSelectedRide('comfort')} style={[styles.mobilityRideRow, selectedRide === 'comfort' && styles.mobilityRideSelected]}><View style={styles.mobilityVehicleIcon}><Ionicons name="car" size={29} color={accent} /></View><View style={styles.flex1}><AppText weight="900">Conforto</AppText><AppText variant="small" color={colors.textMuted}>Chegada em 7 min · mais espaço</AppText></View><AppText weight="900">R$ 12,90</AppText></Pressable>
      <Button label={`Escolher ${selectedRide === 'economy' ? 'Econômico' : 'Conforto'}`} icon="car-outline" disabled={busy} onPress={() => setRidePhase('pickup')} />
    </View>
  </View>;
}

function MobilityMapScene({ route = false }: { route?: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  const [focusedPoint, setFocusedPoint] = useState<'pickup' | 'destination' | null>(null);

  return <View accessibilityLabel="Mapa fictício da viagem, sem uso de GPS" style={styles.mobilityMap}>
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
      <Pressable accessibilityRole="button" accessibilityLabel="Destino fictício: Biblioteca Municipal" onPress={() => setFocusedPoint('destination')} style={styles.mobilityDestinationPin}><Ionicons name="flag" size={20} color={colors.surface} /></Pressable>
    </> : null}
    </View>
    <View style={styles.mobilityZoomControls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Aumentar mapa" disabled={zoomed} onPress={() => setZoomed(true)} style={[styles.mobilityZoomButton, zoomed && styles.mobilityZoomButtonDisabled]}><Ionicons name="add" size={24} color={colors.text} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Diminuir mapa" disabled={!zoomed} onPress={() => setZoomed(false)} style={[styles.mobilityZoomButton, !zoomed && styles.mobilityZoomButtonDisabled]}><Ionicons name="remove" size={24} color={colors.text} /></Pressable>
    </View>
    {focusedPoint ? <View accessibilityLiveRegion="polite" style={styles.mobilityMapCallout}><AppText variant="small" weight="800">{focusedPoint === 'pickup' ? 'Partida: Entrada principal' : 'Destino: Biblioteca Municipal'}</AppText><AppText variant="caption" color={colors.textMuted}>Local totalmente fictício</AppText></View> : null}
  </View>;
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
  fakeChatReceived: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 18, maxWidth: '82%', padding: spacing.md, ...shadow },
  fakeChatInput: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fakeMap: { alignItems: 'center', backgroundColor: '#DDE9DF', borderRadius: radius.lg, flexDirection: 'row', height: 180, justifyContent: 'space-around', overflow: 'hidden' },
  fakeRoute: { borderColor: '#FFFFFF', borderStyle: 'dashed', borderTopWidth: 4, width: '45%' },
  fakeSearch: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.round, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  mobilityExperience: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  mobilityTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
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
  mobilityPlaceRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 76, padding: spacing.md },
  mobilityPlaceIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radius.round, height: 46, justifyContent: 'center', width: 46 },
  mobilityMap: { backgroundColor: '#E8ECEF', borderRadius: radius.lg, height: 260, overflow: 'hidden', position: 'relative' },
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
