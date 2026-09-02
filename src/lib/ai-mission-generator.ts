import type { ParticipantMissionDetails, ParticipantMissionStep } from '@/lib/backend';
import { setAiMissionSession } from '@/lib/ai-mission-cache';
import { getSupabase } from '@/lib/supabase';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function generateAiMission(userQuery: string): Promise<string> {
  const query = userQuery.trim();
  const sessionId = generateUuid();
  const missionId = generateUuid();
  const versionId = generateUuid();

  const isGov = query.toLowerCase().includes('gov');

  if (isGov) {
    const govSteps: ParticipantMissionStep[] = [
      {
        id: generateUuid(),
        position: 1,
        type: 'instruction',
        title: 'Identifique-se com seu CPF',
        instruction: 'Digite seu CPF simulado na tela do Gov.br e toque no botão azul Continuar.',
        audioText: 'Esta é a primeira tela do Gov.br. Observe a marca gov.br, o campo de CPF simulado e toque em Continuar.',
        safetyNote: 'Simulação segura de CPF. Nenhum dado real é enviado.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Toque no botão azul Continuar abaixo do CPF.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 2,
        type: 'instruction',
        title: 'Aceite os Termos e Validação',
        instruction: 'Confira os Termos de Privacidade, marque o captcha "Sou humano" e toque em Continuar.',
        audioText: 'Nesta segunda tela do Gov.br, confirme que aceita os termos de privacidade e toque em Continuar.',
        safetyNote: 'Termos fictícios do treino seguro.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Marque os termos e toque no botão azul Continuar.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 3,
        type: 'instruction',
        title: 'Escolha a Forma de Identificação',
        instruction: 'Você pode entrar pelo seu banco de internet ou tocar no botão "Tentar de outra forma".',
        audioText: 'Você pode usar a senha do seu banco para a conta ser prata ou tocar em tentar de outra forma.',
        safetyNote: 'Nenhum banco real será conectado.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Toque em Tentar de outra forma para continuar com dados pessoais.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 4,
        type: 'instruction',
        title: 'Confirme seus Dados Pessoais',
        instruction: 'Selecione o primeiro nome da sua mãe, seu mês e seu ano de nascimento fictícios.',
        audioText: 'Selecione as opções de nome da mãe, mês e ano de nascimento e toque no botão Continuar.',
        safetyNote: 'Dados fictícios de treino.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Selecione cada opção e toque em Continuar.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 5,
        type: 'instruction',
        title: 'Confirme o Resumo dos Dados',
        instruction: 'Confira os dados apresentados no resumo e toque em Continuar para ir ao contato.',
        audioText: 'Revise os dados apresentados na tela e toque em Continuar.',
        safetyNote: 'Nenhuma informação será salva em servidores do governo.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Toque no botão azul Continuar.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 6,
        type: 'instruction',
        title: 'Informe o Contato para Ativação',
        instruction: 'Escolha receber por e-mail ou celular. Confira o aviso de atenção e toque em OK.',
        audioText: 'Escolha o telefone celular para receber o código e toque em OK no aviso de atenção.',
        safetyNote: 'Nenhum SMS de verdade será enviado.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Escolha telefone celular e toque no botão OK.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 7,
        type: 'instruction',
        title: 'Validação do Código de Ativação',
        instruction: 'Digite o código de confirmação fictício e toque em Continuar.',
        audioText: 'Digite o código recebido na simulação e toque no botão azul Continuar.',
        safetyNote: 'Código simulado de validação.',
        expectedAction: { action: 'continue' },
        options: [],
        hints: ['Toque no botão Continuar.'],
        optional: false,
      },
      {
        id: generateUuid(),
        position: 8,
        type: 'confirmation',
        title: 'Cadastre sua Senha Gov.br',
        instruction: 'Crie uma senha que atenda aos 5 requisitos (8 letras/números/símbolos) e conclua a conta!',
        audioText: 'Cadastre sua senha atendendo aos requisitos e toque em Continuar para concluir o treino com sucesso.',
        safetyNote: 'Senha de treino. Nunca use sua senha real de banco.',
        expectedAction: { action: 'choose', option_id: 'finish' },
        options: [
          { id: 'finish', label: 'Concluir criação da conta' },
        ],
        hints: ['Toque em Concluir criação da conta para ver seu resultado.'],
        optional: false,
      },
    ];

    const govDetails: ParticipantMissionDetails = {
      assignmentId: sessionId,
      missionId,
      classId: sessionId,
      missionVersionId: versionId,
      version: 1,
      title: 'Criar conta no Gov.br',
      summary: 'Simulação completa em 8 telas oficiais do processo de criação de conta no Gov.br.',
      category: 'Serviços Públicos',
      difficulty: 'medium',
      estimatedMinutes: 6,
      required: false,
      safetyNote: 'Treino 100% seguro sem dados pessoais ou conexão real com o portal do governo.',
      learningObjective: 'Aprender o processo completo de criação de conta no Gov.br em ambiente seguro.',
      stepCount: govSteps.length,
    };

    setAiMissionSession({
      id: sessionId,
      details: govDetails,
      steps: govSteps,
      topic: query,
      createdAt: Date.now(),
    });

    return sessionId;
  }

  // A chave do provedor nunca entra no bundle. A Edge Function autentica,
  // limita e valida a geração antes de devolver conteúdo ao aplicativo.
  if (process.env.EXPO_PUBLIC_ENABLE_AI_MISSIONS === 'true') {
    try {
      const { data, error } = await getSupabase().functions.invoke('generate-mission', { body: { query } });
      if (!error && isGeneratedMission(data)) {
          const steps: ParticipantMissionStep[] = data.steps.map((s, idx) => ({
            id: generateUuid(),
            position: idx + 1,
            type: s.type,
            title: s.title,
            instruction: s.instruction,
            audioText: s.audioText,
            safetyNote: s.safetyNote,
            expectedAction: s.expectedAction,
            options: s.options,
            hints: s.hints,
            optional: false,
          }));

          const details: ParticipantMissionDetails = {
            assignmentId: sessionId,
            missionId,
            classId: sessionId,
            missionVersionId: versionId,
            version: 1,
            title: data.title,
            summary: data.summary,
            category: 'Aprendizagem IA',
            difficulty: data.difficulty,
            estimatedMinutes: data.estimatedMinutes,
            required: false,
            safetyNote: 'Ambiente de simulação segura por IA. Nenhuma ação real.',
            learningObjective: `Praticar com segurança como ${query} sem executar ações reais no celular.`,
            stepCount: steps.length,
          };

          setAiMissionSession({
            id: sessionId,
            details,
            steps,
            topic: query,
            createdAt: Date.now(),
          });

          return sessionId;
      }
    } catch {
      // continua para o gerador de contingência
    }
  }

  // Gerador de contingência genérico
  const cleanTitle = query.length > 25 ? `${query.slice(0, 25)}…` : query;
  const capitalized = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  const steps: ParticipantMissionStep[] = [
    {
      id: generateUuid(),
      position: 1,
      type: 'instruction',
      title: `Iniciar treino de ${capitalized}`,
      instruction: `Esta é uma simulação gerada por IA para você praticar "${query}". Nenhuma alteração ou cobrança será feita no seu celular.`,
      audioText: `Esta é uma simulação guiada por inteligência artificial para praticar ${query}. Observe as informações e continue.`,
      safetyNote: 'Selo de proteção Celular Sem Medo ativado. Sem acesso a dados reais.',
      expectedAction: { action: 'continue' },
      options: [],
      hints: ['Toque no botão Continuar na parte inferior da tela.'],
      optional: false,
    },
    {
      id: generateUuid(),
      position: 2,
      type: 'multiple_choice',
      title: 'Confira os dados com atenção',
      instruction: `Ao simular "${query}", qual é a atitude mais segura a ser tomada antes de confirmar?`,
      audioText: 'Ao realizar esta tarefa, revise com calma o nome, valor ou permissão antes de confirmar.',
      safetyNote: 'Nenhum dado pessoal será transmitido.',
      expectedAction: { action: 'choose', option_id: 'opt_safe' },
      options: [
        { id: 'opt_safe', label: 'Revisar todas as informações com calma' },
        { id: 'opt_unsafe', label: 'Confirmar rapidamente sem ler a tela' },
      ],
      hints: ['Sempre confira os dados na tela antes de tomar uma decisão no celular.'],
      optional: false,
    },
    {
      id: generateUuid(),
      position: 3,
      type: 'confirmation',
      title: 'Conclusão do treino por IA',
      instruction: `Você concluiu a simulação de "${query}" no ambiente seguro. Escolha finalizar para registrar seu aprendizado.`,
      audioText: 'Parabéns! Você concluiu este treino gerado por inteligência artificial com sucesso.',
      safetyNote: 'Nenhuma ação externa foi disparada.',
      expectedAction: { action: 'choose', option_id: 'finish' },
      options: [
        { id: 'finish', label: 'Finalizar simulação por IA' },
        { id: 'cancel', label: 'Refazer simulação' },
      ],
      hints: ['Toque em Finalizar simulação por IA para ver seu resultado.'],
      optional: false,
    },
  ];

  const details: ParticipantMissionDetails = {
    assignmentId: sessionId,
    missionId,
    classId: sessionId,
    missionVersionId: versionId,
    version: 1,
    title: `Simulação: ${capitalized}`,
    summary: `Aprenda passo a passo como ${query.toLowerCase()} em um ambiente totalmente seguro.`,
    category: 'Aprendizagem IA',
    difficulty: 'easy',
    estimatedMinutes: 5,
    required: false,
    safetyNote: 'Treino interativo gerado por IA sem riscos ou envio de dados reais.',
    learningObjective: `Compreender o processo seguro de ${query.toLowerCase()} sem compartilhar dados sensíveis.`,
    stepCount: steps.length,
  };

  setAiMissionSession({
    id: sessionId,
    details,
    steps,
    topic: query,
    createdAt: Date.now(),
  });

  return sessionId;
}

type GeneratedStep = Omit<ParticipantMissionStep, 'id' | 'position' | 'optional'>;
type GeneratedMission = { title: string; summary: string; difficulty: 'easy' | 'medium' | 'hard'; estimatedMinutes: number; steps: GeneratedStep[] };

function isGeneratedMission(value: unknown): value is GeneratedMission {
  if (!value || typeof value !== 'object') return false;
  const mission = value as Partial<GeneratedMission>;
  if (!isShortText(mission.title, 80) || !isShortText(mission.summary, 240)) return false;
  if (!['easy', 'medium', 'hard'].includes(String(mission.difficulty))) return false;
  if (!Number.isInteger(mission.estimatedMinutes) || Number(mission.estimatedMinutes) < 1 || Number(mission.estimatedMinutes) > 20) return false;
  return Array.isArray(mission.steps) && mission.steps.length >= 2 && mission.steps.length <= 8 && mission.steps.every((step) => (
    isShortText(step.title, 100)
    && isShortText(step.instruction, 400)
    && isShortText(step.audioText, 500)
    && isShortText(step.safetyNote, 300)
    && Boolean(step.expectedAction && typeof step.expectedAction === 'object')
    && Array.isArray(step.options) && step.options.length <= 6
    && step.options.every(isGeneratedOption)
    && Array.isArray(step.hints) && step.hints.length <= 4 && step.hints.every((hint) => isShortText(hint, 240))
  ));
}

function isShortText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

function isGeneratedOption(value: unknown): value is { id: string; label: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const option = value as { id?: unknown; label?: unknown };
  return isShortText(option.id, 60) && isShortText(option.label, 160);
}
