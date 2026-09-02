import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ParticipantNav } from '@/components/BottomNav';
import { DataState } from '@/components/DataState';
import { Screen } from '@/components/Screen';
import { AppText, Button, Card, Header, ProgressBar, Tag } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { MissionAction } from '@/features/mission-engine/executor';
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
    return <MissionExecutor assignmentId={aiSession.id} assessmentId={assessmentId} details={aiSession.details} steps={aiSession.steps} />;
  }

  if (query.loading) return <SimulatorState kind="loading" retry={query.retry} />;
  if (query.error) return <SimulatorState kind="error" retry={query.retry} />;
  if (!query.data) return <SimulatorState kind="empty" retry={query.retry} />;
  return <MissionExecutor assignmentId={query.data.details.assignmentId} assessmentId={assessmentId} details={query.data.details} steps={query.data.steps} />;
}

function MissionExecutor({ assignmentId, assessmentId, details, steps }: { assignmentId: string; assessmentId?: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[] }) {
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

  const isWhatsAppPhotoFlow = details.title.toLowerCase().includes('foto') || details.title.toLowerCase().includes('whatsapp');
  const isPixFlow = details.title.toLowerCase().includes('pix');
  const isGovFlow = details.title.toLowerCase().includes('gov') || details.summary.toLowerCase().includes('gov') || details.category.toLowerCase().includes('gov');

  if (isGovFlow) {
    return <GovFlowMock assignmentId={assignmentId} assessmentId={assessmentId} details={details} steps={steps} engine={engine} playInstruction={playInstruction} router={router} />;
  }

  if (isWhatsAppPhotoFlow) {
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

        <Card style={styles.whatsappFrame}>
          <View style={styles.whatsappHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="chevron-back" size={22} color={colors.surface} />
              <View style={styles.avatarMini} />
              <AppText weight="800" color={colors.surface}>Kate Tanner</AppText>
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
                  <Pressable style={styles.cameraButton} disabled={engine.busy} onPress={() => void handlePhotoAction('attachment_button')}>
                    <Ionicons name="camera-outline" size={62} color={colors.surface} />
                  </Pressable>
                ) : (
                  <Pressable style={styles.cameraButton} disabled={engine.busy} onPress={() => void handlePhotoChoice(optionTarget)}>
                    <Ionicons name="camera-outline" size={62} color={colors.surface} />
                  </Pressable>
                )}

                <View style={styles.actionSheet}>
                  <Pressable style={styles.optionRowSelected} disabled={engine.busy} onPress={() => void handlePhotoChoice(optionTarget)}>
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <AppText weight="800" color={colors.primary}>Foto</AppText>
                  </Pressable>
                  <Pressable style={styles.optionRow} disabled={engine.busy} onPress={() => void engine.submit({ action: 'select', target: 'video_option', optionId: 'video_option' })}>
                    <Ionicons name="videocam-outline" size={20} color={colors.textMuted} />
                    <AppText color={colors.textMuted}>Vídeo</AppText>
                  </Pressable>
                  <Pressable style={styles.optionRow} disabled={engine.busy} onPress={() => void engine.submit({ action: 'select', target: 'document_option', optionId: 'document_option' })}>
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

  if (isPixFlow) {
    return <PixFlowMock assignmentId={assignmentId} assessmentId={assessmentId} details={details} steps={steps} engine={engine} playInstruction={playInstruction} router={router} />;
  }

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
      {engine.syncStatus !== 'synced' ? <Card style={styles.syncCard}><Ionicons name={engine.syncStatus === 'offline' ? 'cloud-offline-outline' : engine.syncStatus === 'failed' ? 'alert-circle-outline' : 'cloud-upload-outline'} size={24} color={engine.syncStatus === 'failed' ? colors.danger : colors.primary} /><View style={styles.safeCopy}><AppText weight="800">{engine.syncStatus === 'offline' ? 'Praticando sem internet' : engine.syncStatus === 'failed' ? 'Sincronização pendente' : engine.syncStatus === 'syncing' ? 'Sincronizando…' : 'Alterações salvas no aparelho'}</AppText><AppText variant="small" color={colors.textMuted}>{engine.pendingCount} evento(s) aguardando envio. Você pode continuar normalmente.</AppText></View>{engine.syncStatus === 'failed' ? <Button label="Tentar" variant="soft" onPress={() => void engine.retry()} /> : null}</Card> : null}
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

  const currentStepPos = Math.min(Math.max(step.position, 1), 8);

  const handleNextStep = async () => {
    if (preferences.hapticFeedback) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const expected = asObject(step.expectedAction);
    const optionId = expected.target ?? expected.action ?? 'continue';
    await engine.submit({ action: 'continue', optionId, target: optionId });
  };

  const renderGovScreen = () => {
    switch (currentStepPos) {
      case 1:
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color="#1351B4"><AppText variant="heading" weight="900" color="#1351B4">gov</AppText><AppText variant="heading" weight="900" color="#E6AC00">.</AppText><AppText variant="heading" weight="900" color="#009B3A">br</AppText></AppText>
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
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Vamos criar sua conta gov.br</AppText>
              <AppText variant="small">Vai ser simples! Vamos te guiar durante o processo.</AppText>

              <Pressable style={styles.govCheckRow} onPress={() => setTermsAgreed(!termsAgreed)}>
                <Ionicons name={termsAgreed ? 'checkbox' : 'square-outline'} size={22} color="#1351B4" />
                <AppText variant="small" style={styles.flex1}>Li e estou de acordo com o <AppText variant="small" color="#1351B4" weight="700">Termo de Uso e Política de Privacidade</AppText></AppText>
              </Pressable>

              <View style={styles.govCaptchaBox}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <View style={styles.flex1}>
                  <AppText weight="700">Sou humano</AppText>
                  <AppText variant="caption" color={colors.textMuted}>hCaptcha - Privacidade e Termos</AppText>
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
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Vamos criar sua conta gov.br através do seu banco?</AppText>
              <AppText variant="caption" color={colors.textMuted}>Não teremos acesso a seus dados bancários, apenas a seu nome e CPF. Escolha o banco que você já usa pela internet:</AppText>

              <View style={styles.govBankGrid}>
                <View style={styles.govBankTile}><Ionicons name="briefcase-outline" size={20} color="#1351B4" /><AppText variant="small" weight="700">Banco do Brasil</AppText></View>
                <View style={styles.govBankTile}><Ionicons name="card-outline" size={20} color="#EC7000" /><AppText variant="small" weight="700">Itaú</AppText></View>
                <View style={styles.govBankTile}><Ionicons name="shield-outline" size={20} color="#CC092F" /><AppText variant="small" weight="700">Bradesco</AppText></View>
                <View style={styles.govBankTile}><Ionicons name="wallet-outline" size={20} color="#005CA9" /><AppText variant="small" weight="700">Caixa Econômica</AppText></View>
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
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
            </View>

            <View style={styles.govCardInternal}>
              <AppText variant="subheading" weight="800">Vamos criar sua conta gov.br confirmando alguns de seus dados pessoais?</AppText>

              <AppText variant="small" weight="700">1. Qual é o primeiro nome da sua mãe?</AppText>
              <View style={styles.govPillGrid}>
                {['MARIA', 'LEONA', 'ESTRELA', 'JEWEL', 'LILA', 'CARMEZINDA', 'NADINA'].map((name) => (
                  <Pressable key={name} onPress={() => setSelectedMother(name)} style={[styles.govPillItem, selectedMother === name && styles.govPillItemActive]}>
                    <AppText variant="small" weight="800" color={selectedMother === name ? '#1351B4' : colors.text}>{name}</AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="small" weight="700">2. Qual é o seu mês de nascimento ?</AppText>
              <View style={styles.govPillGrid}>
                {['MAIO', 'FEVEREIRO', 'DEZEMBRO', 'ABRIL'].map((m) => (
                  <Pressable key={m} onPress={() => setSelectedMonth(m)} style={[styles.govPillItem, selectedMonth === m && styles.govPillItemActive]}>
                    <AppText variant="small" weight="800" color={selectedMonth === m ? '#1351B4' : colors.text}>{m}</AppText>
                  </Pressable>
                ))}
              </View>

              <AppText variant="small" weight="700">3. Qual é o seu ano de nascimento ?</AppText>
              <View style={styles.govPillGrid}>
                {['1964', '1966', '1962', '1967', '1968', '1963', '1965'].map((y) => (
                  <Pressable key={y} onPress={() => setSelectedYear(y)} style={[styles.govPillItem, selectedYear === y && styles.govPillItemActive]}>
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
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
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
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
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

              <Pressable style={styles.govRadioRow} onPress={() => setSelectedChannel('email')}>
                <Ionicons name={selectedChannel === 'email' ? 'radio-button-on' : 'radio-button-off'} size={22} color="#1351B4" />
                <Ionicons name="mail-outline" size={20} color="#1351B4" />
                <AppText weight="700">Por e-mail</AppText>
              </Pressable>

              <Pressable style={styles.govRadioRow} onPress={() => setSelectedChannel('phone')}>
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

                  <Pressable style={styles.govOutlineBtn} onPress={() => setShowWarningModal(false)}>
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
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
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

              <Pressable style={styles.govOutlineBtn} onPress={() => {}}>
                <AppText weight="800" color="#1351B4">Voltar à tela anterior</AppText>
              </Pressable>

              <AppText variant="small" color="#1351B4" style={styles.centerText}>Voltar ao início</AppText>
            </View>
          </View>
        );

      default:
        // Nova Foto 5: Cadastre uma senha para sua conta gov.br com checklist oficial de 5 regras
        return (
          <View style={styles.govScreenContainer}>
            <View style={styles.govTopNav}>
              <AppText variant="heading" weight="900" color="#1351B4">gov.br</AppText>
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
    }
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
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
      <StepActions step={step} busy={engine.busy} onSubmit={engine.submit} />
      {engine.run.mistakes > 0 ? <Card style={styles.feedback}><Ionicons name="information-circle" size={24} color={colors.warning} /><AppText style={styles.safeCopy}>Ainda não é essa opção. Nada aconteceu de verdade; tente novamente ou peça uma dica.</AppText></Card> : null}
      {engine.run.usedHint || engine.run.usedHelp ? <Card style={styles.hints}><AppText weight="800">{engine.run.usedHelp ? 'Ajuda passo a passo' : 'Dicas deste passo'}</AppText>{step.hints.map((hint) => <AppText key={hint}>• {hint}</AppText>)}</Card> : null}
      <View style={styles.supportActions}>
        <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
        <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
      </View>
    </Screen>
  );
}

function PixFlowMock({ assignmentId, assessmentId, details, steps, engine, playInstruction, router }: { assignmentId: string; assessmentId?: string; details: ParticipantMissionDetails; steps: ParticipantMissionStep[]; engine: ReturnType<typeof useMissionEngine>; playInstruction: (text: string) => void; router: ReturnType<typeof useRouter> }) {
  const step = engine.currentStep;
  if (!step) return null;

  const screenIndex = Math.min(Math.max(step.position, 1), 7);
  const bottomLabel = screenIndex >= 5 ? 'Pagar' : 'Continuar';

  const renderPixScreen = () => {
    switch (screenIndex) {
      case 1:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}>
              <AppText variant="small" weight="700">9:41</AppText>
              <View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View>
            </View>
            <View style={styles.pixHeaderPurple}>
              <View style={styles.headerRow}>
                <View style={styles.avatarSmall} />
                <View style={styles.headerProfile}>
                  <AppText weight="800" color={colors.surface}>Olá, Gineton Rodrigues</AppText>
                  <AppText variant="small" color={colors.surface}>Você é cliente Nubank +</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.surface} />
              </View>
            </View>
            <View style={styles.balanceBox}>
              <AppText variant="small" color={colors.textMuted}>Saldo em conta</AppText>
              <AppText weight="800">R$ 1.200,46</AppText>
              <AppText variant="small" color={colors.textMuted}>R$ 459,90 em outros bancos</AppText>
            </View>
            <View style={styles.actionRow}>
              <View style={styles.actionItem}><View style={styles.actionCircle}><Ionicons name="swap-horizontal" size={20} color={colors.text} /></View><AppText variant="caption">Área Pix</AppText></View>
              <View style={styles.actionItem}><View style={styles.actionCircle}><Ionicons name="cash-outline" size={20} color={colors.text} /></View><AppText variant="caption">Pagar</AppText></View>
              <View style={styles.actionItem}><View style={styles.actionCircle}><Ionicons name="card-outline" size={20} color={colors.text} /></View><AppText variant="caption">Receber</AppText></View>
              <View style={styles.actionItem}><View style={styles.actionCircle}><Ionicons name="wallet-outline" size={20} color={colors.text} /></View><AppText variant="caption">Cobrar</AppText></View>
            </View>
            <View style={styles.bottomSpacer} />
          </View>
        );
      case 2:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <View style={styles.modalTop}><Ionicons name="close" size={24} color={colors.text} /><Ionicons name="help-circle-outline" size={20} color={colors.textMuted} /></View>
            <View style={styles.areaTitle}><AppText variant="heading" weight="800">Área Pix</AppText></View>
            <View style={styles.inputStub} />
            <View style={styles.iconGrid}>
              <View style={styles.iconTile}><Ionicons name="swap-horizontal" size={24} color={colors.text} /></View>
              <View style={styles.iconTile}><Ionicons name="calendar-outline" size={24} color={colors.text} /></View>
              <View style={styles.iconTile}><Ionicons name="qr-code-outline" size={24} color={colors.text} /></View>
            </View>
            <View style={styles.bottomAction}><Button label="Pagar" variant="primary" onPress={() => void engine.submit({ action: 'continue' })} /></View>
          </View>
        );
      case 3:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <View style={styles.modalTop}><Ionicons name="close" size={24} color={colors.text} /><Ionicons name="help-circle-outline" size={20} color={colors.textMuted} /></View>
            <View style={styles.textStack}>
              <AppText variant="heading" weight="800">Insira o código Pix do Copia e cola</AppText>
              <View style={styles.copiarBox}><AppText color={colors.textMuted}>Cole o código aqui</AppText></View>
            </View>
            <View style={styles.keypad}>
              <View style={styles.keyRow}><View style={styles.keyCell}><AppText weight="800">1</AppText></View><View style={styles.keyCell}><AppText weight="800">2</AppText></View><View style={styles.keyCell}><AppText weight="800">3</AppText></View></View>
              <View style={styles.keyRow}><View style={styles.keyCell}><AppText weight="800">4</AppText></View><View style={styles.keyCell}><AppText weight="800">5</AppText></View><View style={styles.keyCell}><AppText weight="800">6</AppText></View></View>
              <View style={styles.keyRow}><View style={styles.keyCell}><AppText weight="800">7</AppText></View><View style={styles.keyCell}><AppText weight="800">8</AppText></View><View style={styles.keyCell}><AppText weight="800">9</AppText></View></View>
              <View style={styles.keyRow}><View style={styles.keyCell}><AppText weight="800">* #</AppText></View><View style={styles.keyCell}><AppText weight="800">0</AppText></View><View style={styles.keyCell}><Ionicons name="backspace-outline" size={20} color={colors.text} /></View></View>
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <View style={styles.modalTop}><Ionicons name="close" size={24} color={colors.text} /></View>
            <View style={styles.detailStack}>
              <AppText variant="heading" weight="800">Pagando</AppText>
              <AppText variant="heading" weight="800">R$ 164,20</AppText>
              <AppText variant="small" color={colors.textMuted}>para KOIN ADM. DE CARTÕES</AppText>
              <View style={styles.detailTable}>
                <View style={styles.detailRow}><AppText color={colors.textMuted}>CNPJ</AppText><AppText>12.345.678/0001-00</AppText></View>
                <View style={styles.detailRow}><AppText color={colors.textMuted}>Instituição</AppText><AppText>KOIN</AppText></View>
                <View style={styles.detailRow}><AppText color={colors.textMuted}>Identificador</AppText><AppText>F26052037935790230909</AppText></View>
              </View>
            </View>
            <View style={styles.bottomAction}><Button label="Escolher como quer pagar" variant="primary" onPress={() => void engine.submit({ action: 'continue' })} /></View>
          </View>
        );
      case 5:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <View style={styles.modalTop}><Ionicons name="close" size={24} color={colors.text} /></View>
            <View style={styles.methodHeading}>
              <AppText variant="heading" weight="800">Como você gostaria de pagar R$ 164,20?</AppText>
              <AppText variant="small" color={colors.textMuted}>para KOIN ADM. DE CARTÕES</AppText>
            </View>
            <View style={styles.choiceCard}>
              <View style={styles.choiceRow}><View style={styles.radio} /><View style={styles.choiceText}><AppText weight="800">Saldo da conta</AppText><AppText color={colors.textMuted}>Saldo disponível de R$ 1.200,46</AppText></View></View>
              <View style={styles.choiceRow}><View style={styles.radioEmpty} /><View style={styles.choiceText}><AppText>Você tem um limite de R$ 4.127,20 para usar com Pix no cartão de crédito este mês.</AppText></View></View>
            </View>
            <View style={styles.bottomAction}><Button label="Continuar com saldo da conta" variant="primary" onPress={() => void engine.submit({ action: 'continue' })} /></View>
          </View>
        );
      case 6:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <View style={styles.loadingText}><AppText variant="heading" weight="800">Pagando...</AppText></View>
            <View style={styles.progressBarTrack}><View style={styles.progressBarFill} /></View>
            <View style={styles.bottomAction}><Button label="Continuar" variant="primary" onPress={() => void engine.submit({ action: 'continue' })} /></View>
          </View>
        );
      default:
        return (
          <View style={styles.phoneShell}>
            <View style={styles.statusBar}><AppText variant="small" weight="700">9:41</AppText><View style={styles.signalGroup}><View style={styles.signal} /><View style={styles.signal} /><View style={styles.signal} /></View></View>
            <View style={styles.modalTop}><Ionicons name="close" size={24} color={colors.text} /></View>
            <View style={styles.successCircle}><Ionicons name="checkmark" size={28} color={colors.surface} /></View>
            <AppText variant="heading" weight="800" style={styles.successTitle}>Pagamento concluído</AppText>
            <View style={styles.successTable}>
              <View style={styles.successRow}><AppText>Para</AppText><AppText>Koin Adm. de Cartões</AppText></View>
              <View style={styles.successRow}><AppText>Valor enviado</AppText><AppText>R$ 164,20</AppText></View>
              <View style={styles.successRow}><AppText>Quando</AppText><AppText>Agora</AppText></View>
            </View>
            <View style={styles.bottomAction}><Button label="Abrir comprovante" variant="primary" onPress={() => void engine.submit({ action: 'continue' })} /></View>
          </View>
        );
    }
  };

  return (
    <Screen footer={<ParticipantNav active="missions" />} contentStyle={styles.content}>
      <Header title={details.title} subtitle="Treino interativo — nenhuma ação real" onBack={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/participant/mission-details', params: { assignmentId } })} />
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
      <Button label={bottomLabel} icon="arrow-forward" variant="primary" disabled={engine.busy} onPress={() => void engine.submit({ action: 'continue' })} />
      <View style={styles.supportActions}>
        <Button label="Ouvir instrução" icon="volume-high-outline" variant="secondary" disabled={engine.busy} onPress={() => { playInstruction(step.audioText); void engine.registerSupport('audio'); }} />
        <Button label="Mostrar uma dica" icon="help-circle-outline" variant="soft" disabled={engine.busy} onPress={() => void engine.registerSupport('hint')} />
      </View>
    </Screen>
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

function asObject(value: ParticipantMissionStep['expectedAction']): { action?: string; target?: string } {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as { action?: string; target?: string } : {};
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
  whatsappFrame: { backgroundColor: '#0d1e2d', borderColor: '#1c2f3e', borderRadius: 28, overflow: 'hidden', padding: 0 },
  whatsappHeader: { alignItems: 'center', backgroundColor: '#0e2a3c', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerLeft: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  avatarMini: { backgroundColor: '#c4d6d5', borderRadius: 999, height: 24, width: 24 },
  chatBody: { backgroundColor: '#0f2434', gap: spacing.sm, padding: spacing.md },
  chatBubbleRow: { flexDirection: 'row' },
  chatBubbleRowRight: { flexDirection: 'row', justifyContent: 'flex-end' },
  chatBubble: { backgroundColor: '#1d2f3f', borderRadius: 16, maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chatBubbleGreen: { backgroundColor: '#1b7a5a', borderRadius: 16, maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  photoCard: { alignItems: 'center', backgroundColor: '#24394d', borderRadius: 18, height: 180, justifyContent: 'center', overflow: 'hidden' },
  photoScene: { backgroundColor: '#2b9ac0', borderRadius: 18, height: '100%', width: '100%' },
  attachmentScene: { alignItems: 'center', gap: spacing.md, justifyContent: 'center', minHeight: 220, paddingBottom: spacing.sm, paddingTop: spacing.md },
  cameraButton: { alignItems: 'center', backgroundColor: '#1b1e20', borderRadius: 999, height: 170, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 18, width: 170 },
  actionSheet: { alignSelf: 'stretch', backgroundColor: '#f0f3f8', borderRadius: 22, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  optionRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  optionRowSelected: { alignItems: 'center', backgroundColor: '#e6eefb', borderRadius: 14, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  chatInputRow: { alignItems: 'center', backgroundColor: '#132c3e', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  inputBox: { backgroundColor: '#1d3747', borderRadius: 14, flex: 1, height: 36 },
  pixMockCard: { backgroundColor: '#e9e9e9', borderColor: '#d8d8d8', borderRadius: 28, overflow: 'hidden', padding: 0 },
  phoneShell: { backgroundColor: '#f5f5f5', minHeight: 660, paddingHorizontal: 18, paddingTop: 18, width: '100%' },
  statusBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 6 },
  signalGroup: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  signal: { backgroundColor: '#1f1f1f', borderRadius: 8, height: 8, width: 8 },
  pixHeaderPurple: { backgroundColor: '#6d1bbf', borderRadius: 18, marginBottom: 16, padding: 18 },
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
  govFrame: { backgroundColor: '#ffffff', borderColor: '#1351B4', borderWidth: 2, borderRadius: radius.xl, overflow: 'hidden', padding: 0 },
  govScreenContainer: { backgroundColor: '#F8FAFC', paddingBottom: spacing.lg },
  govTopNav: { alignItems: 'center', backgroundColor: '#ffffff', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  govNavIcons: { flexDirection: 'row', gap: spacing.md },
  govCardInternal: { gap: spacing.md, padding: spacing.lg },
  govSectionRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  govFieldBlock: { gap: spacing.xs, marginTop: spacing.xs },
  govInputMock: { backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, height: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  govPrimaryBtn: { alignItems: 'center', backgroundColor: '#1351B4', borderRadius: radius.round, height: 50, justifyContent: 'center', marginTop: spacing.sm },
  govOutlineBtn: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#1351B4', borderRadius: radius.round, borderWidth: 1.5, height: 48, justifyContent: 'center', marginTop: spacing.sm },
  govDividerLine: { backgroundColor: '#E2E8F0', height: 1, marginVertical: spacing.xs },
  govOptionList: { gap: spacing.sm },
  govOptionRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  govCheckRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.xs },
  govCaptchaBox: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  govBankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  govBankTile: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: '48%' },
  govPillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  govPillItem: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.round, borderWidth: 1.5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  govPillItemActive: { backgroundColor: '#E8F0FE', borderColor: '#1351B4' },
  govMaskedBox: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  govStepperRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginVertical: spacing.sm },
  govStepCircle: { backgroundColor: '#CBD5E1', borderRadius: radius.round, height: 12, width: 12 },
  govStepCircleActive: { backgroundColor: '#1351B4', height: 16, width: 16 },
  govStepLine: { backgroundColor: '#CBD5E1', height: 2, width: 24 },
  govRadioRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  govInputMockGreen: { backgroundColor: '#ECFDF3', borderColor: colors.success, borderRadius: radius.md, borderWidth: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
  govModalAlert: { backgroundColor: '#FFF8E1', borderColor: colors.warning, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  govModalBadge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: radius.round, height: 36, justifyContent: 'center', width: 36 },
  govInputMockRow: { alignItems: 'center', backgroundColor: '#ffffff', borderColor: '#CBD5E1', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: spacing.md },
  govChecklistBlock: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  govCheckItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  centerText: { textAlign: 'center' },
  flex1: { flex: 1 },
});
