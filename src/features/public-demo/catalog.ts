import type { ParticipantMissionDetails, ParticipantMissionStep } from '@/lib/backend';

export type PublicDemoMission = {
  key: 'photo' | 'pix' | 'location' | 'mobility' | 'download-app' | 'shopping' | 'scam-message' | 'fake-family' | 'fake-bank' | 'gov-br';
  details: ParticipantMissionDetails;
  steps: ParticipantMissionStep[];
  learningGoals: string[];
  icon: 'camera-outline' | 'shield-checkmark-outline' | 'location-outline' | 'car-outline' | 'download-outline' | 'cart-outline' | 'chatbubble-ellipses-outline' | 'people-outline' | 'call-outline' | 'document-text-outline';
};

function details(
  key: PublicDemoMission['key'],
  missionId: string,
  title: string,
  summary: string,
  category: string,
  estimatedMinutes: number,
  stepCount: number,
): ParticipantMissionDetails {
  return {
    assignmentId: `public-demo-${key}`,
    classId: 'public-demo',
    missionId,
    missionVersionId: `public-demo-version-${key}`,
    version: 1,
    title,
    summary,
    category,
    difficulty: key === 'pix' || key === 'fake-family' ? 'medium' : 'easy',
    estimatedMinutes,
    required: false,
    learningObjective: summary,
    safetyNote: 'Esta é uma simulação. Nenhum dado, mensagem, viagem ou dinheiro real será usado.',
    stepCount,
  };
}

function step(
  mission: PublicDemoMission['key'],
  position: number,
  title: string,
  instruction: string,
  expectedAction: ParticipantMissionStep['expectedAction'],
  options: ParticipantMissionStep['options'] = [],
): ParticipantMissionStep {
  return {
    id: `public-demo-${mission}-step-${position}`,
    position,
    type: options && Array.isArray(options) && options.length ? 'multiple_choice' : 'instruction',
    title,
    instruction,
    audioText: instruction,
    safetyNote: 'Use somente os dados fictícios mostrados no treinamento.',
    expectedAction,
    options,
    hints: ['Leia a instrução com calma e procure o controle destacado na tela.'],
    optional: false,
  };
}

const pixSteps: ParticipantMissionStep[] = [
  step('pix', 1, 'Faça um Pix no ambiente de treino', 'Abra a área Pix, informe a chave fictícia e digite o valor que deseja praticar.', { action: 'continue' }),
  step('pix', 2, 'Confira quem vai receber', 'Compare o nome apresentado no resumo antes de continuar.', { action: 'choose', option_id: 'ana-treino' }, [
    { id: 'ana-treino', label: 'Ana Treino' },
    { id: 'nome-diferente', label: 'Carlos Exemplo' },
  ]),
  step('pix', 3, 'Confira o valor', 'Compare o valor combinado com o valor que você digitou.', { action: 'choose', option_id: 'same-value' }, [
    { id: 'same-value', label: 'Os valores são iguais' },
    { id: 'different-value', label: 'Os valores estão diferentes' },
  ]),
  step('pix', 4, 'Confirme somente depois de revisar', 'Confira nome, banco e valor antes de tomar a decisão final.', { action: 'choose', option_id: 'confirm' }, [
    { id: 'confirm', label: 'Confirmar o Pix simulado' },
    { id: 'cancel', label: 'Voltar e corrigir o valor' },
  ]),
];

const generatedTemplate = (key: PublicDemoMission['key']) => [
  step(key, 1, 'Comece o treinamento', 'Observe a situação e siga uma instrução por vez.', { action: 'continue' }),
];

const photoSteps = [
  step('photo', 1, 'Abra a conversa de treino', 'Observe a conversa simulada com Ana. Nada será enviado de verdade.', { action: 'continue' }),
  step('photo', 2, 'Encontre o clipe', 'Toque no desenho de clipe na parte de baixo da conversa.', { action: 'tap', target: 'attachment_button' }),
  step('photo', 3, 'Abra as fotos', 'No menu de anexos, toque em “Galeria” para ver as imagens de treinamento.', { action: 'tap', target: 'gallery_option' }),
  step('photo', 4, 'Escolha uma foto', 'Toque em qualquer uma das fotos fictícias. Aqui não existe foto certa ou errada.', { action: 'select' }),
  step('photo', 5, 'Confira antes de enviar', 'Confira se a conversa é com Ana e envie somente depois de revisar.', { action: 'choose', option_id: 'send-photo' }, [
    { id: 'send-photo', label: 'Enviar foto para Ana' }, { id: 'cancel-photo', label: 'Cancelar e escolher outra conversa' },
  ]),
];

const appStoreSteps = [
  step('download-app', 1, 'Abra a loja simulada', 'Observe a busca fictícia. Nenhum aplicativo será instalado.', { action: 'continue' }),
  step('download-app', 2, 'Escolha o aplicativo correto', 'Compare o nome e o desenvolvedor antes de escolher.', { action: 'choose', option_id: 'official' }, [
    { id: 'official', label: 'Conecta Fácil — Empresa Exemplo' }, { id: 'copy', label: 'Conecta Grátis — Desenvolvedor desconhecido' },
  ]),
  { ...step('download-app', 3, 'Avalie a permissão solicitada', 'Este aplicativo precisa mesmo dos seus contatos para funcionar? Leia a explicação e escolha com calma.', { action: 'choose', option_id: 'reject-permission' }, [
    { id: 'allow-permission', label: 'Permitir porque o aplicativo pediu' }, { id: 'reject-permission', label: 'Não permitir agora; primeiro quero entender a necessidade' },
  ]), audioText: 'Acesso aos contatos não é sempre perigoso. Pense se essa permissão combina com a função do aplicativo. Na dúvida, não permita agora. Você poderá autorizar depois nas configurações.' },
  step('download-app', 4, 'Instale somente após conferir', 'Acompanhe a instalação fictícia, abra o aplicativo de treino e conclua.', { action: 'choose', option_id: 'install-training' }, [{ id: 'install-training', label: 'Concluir treinamento' }]),
];

const shoppingSteps = [
  step('shopping', 1, 'Abra a loja de treino', 'Observe a página fictícia da loja e continue para pesquisar um produto.', { action: 'continue' }),
  step('shopping', 2, 'Escolha o anúncio mais seguro', 'Compare avaliações, descrição e forma de pagamento.', { action: 'choose', option_id: 'safe-listing' }, [
    { id: 'safe-listing', label: 'Loja bem avaliada, descrição completa e pagamento no app' }, { id: 'unsafe-listing', label: 'Preço muito baixo e pedido de pagamento por mensagem' },
  ]),
  step('shopping', 3, 'Revise o carrinho', 'O produto custa R$ 30 e o frete R$ 8. Selecione o total correto.', { action: 'choose', option_id: 'total-38' }, [
    { id: 'total-30', label: 'Total de R$ 30' }, { id: 'total-38', label: 'Total de R$ 38' }, { id: 'total-80', label: 'Total de R$ 80' },
  ]),
  step('shopping', 4, 'Faça a conferência final', 'Confira produto, preço, frete e endereço fictício. Finalize somente o treino.', { action: 'choose', option_id: 'finish-training' }, [
    { id: 'pay-now', label: 'Pagar agora' }, { id: 'finish-training', label: 'Finalizar simulação' },
  ]),
];

const fakeBankSteps = [
  step('fake-bank', 1, 'Analise a ligação', 'A pessoa diz ser do banco e pede sua senha. Isso é seguro?', { action: 'choose', option_id: 'unsafe' }, [
    { id: 'safe', label: 'Dou minha senha se a pessoa souber meu nome' }, { id: 'unsafe', label: 'Não dou minha senha; banco não pede senha completa' },
  ]),
  step('fake-bank', 2, 'Recuse o aplicativo', 'A pessoa pede para instalar um aplicativo de segurança. O que fazer?', { action: 'choose', option_id: 'refuse' }, [
    { id: 'install', label: 'Instalo enquanto ela orienta' }, { id: 'refuse', label: 'Recuso e encerro a ligação' },
  ]),
  step('fake-bank', 3, 'Procure o canal oficial', 'Como falar com o banco depois de desligar?', { action: 'choose', option_id: 'official' }, [
    { id: 'callback', label: 'Ligo para o número que apareceu na chamada' }, { id: 'official', label: 'Uso o aplicativo ou número oficial' },
  ]),
];

const govSteps = [
  step('gov-br', 1, 'Identifique-se com um CPF simulado', 'Use somente o CPF fictício exibido no treino e toque em Continuar.', { action: 'continue' }),
  step('gov-br', 2, 'Confira os termos e a validação', 'Marque os termos simulados, a opção Sou humano e continue.', { action: 'continue' }),
  step('gov-br', 3, 'Escolha outra forma de identificação', 'Escolha criar a conta sem conectar um banco real.', { action: 'continue' }),
  step('gov-br', 4, 'Confirme dados fictícios', 'Selecione o nome, o mês e o ano indicados na tela de treino.', { action: 'continue' }),
  step('gov-br', 5, 'Revise o resumo', 'Confira o resumo mascarado antes de continuar.', { action: 'continue' }),
  step('gov-br', 6, 'Escolha o contato simulado', 'Escolha telefone ou e-mail de treino e leia o aviso.', { action: 'continue' }),
  step('gov-br', 7, 'Valide o código fictício', 'Digite o código mostrado no SMS de treino.', { action: 'continue' }),
  step('gov-br', 8, 'Cadastre uma senha de treino', 'Confira os requisitos e use somente uma senha fictícia.', { action: 'continue' }),
  step('gov-br', 9, 'Conta Bronze simulada', 'Revise o que aprendeu e conclua o treinamento.', { action: 'choose', option_id: 'finish' }, [{ id: 'finish', label: 'Concluir' }]),
];

export const publicDemoMissions: PublicDemoMission[] = [
  {
    key: 'photo',
    icon: 'camera-outline',
    details: details('photo', '10000000-0000-4000-8000-000000000001', 'Enviar uma foto pelo WhatsApp', 'Pratique como anexar uma foto e conferir o contato antes de enviar.', 'Mensagens', 5, 5),
    steps: photoSteps,
    learningGoals: ['Abrir uma conversa', 'Encontrar o botão de anexo', 'Escolher uma foto fictícia', 'Conferir o contato antes de enviar'],
  },
  {
    key: 'pix',
    icon: 'shield-checkmark-outline',
    details: details('pix', '10000000-0000-4000-8000-000000000002', 'Fazer um Pix seguro', 'Pratique como informar uma chave e conferir nome, banco e valor antes de enviar.', 'Segurança digital', 8, 4),
    steps: pixSteps,
    learningGoals: ['Encontrar a opção Pix', 'Informar uma chave fictícia', 'Digitar um valor', 'Conferir nome, banco e valor', 'Corrigir qualquer informação diferente'],
  },
  {
    key: 'location',
    icon: 'location-outline',
    details: details('location', '10000000-0000-4000-8000-000000000003', 'Compartilhar localização', 'Pratique como escolher o destinatário e limitar o tempo de compartilhamento.', 'Mensagens', 7, 7),
    steps: generatedTemplate('location'),
    learningGoals: ['Encontrar a opção Localização', 'Diferenciar localização atual e em tempo real', 'Conferir quem receberá', 'Escolher o menor tempo necessário', 'Parar o compartilhamento'],
  },
  {
    key: 'fake-family',
    icon: 'people-outline',
    details: details('fake-family', '10000000-0000-4000-8000-000000000008', 'Golpe do falso familiar', 'Aprenda a desconfiar de um número novo e confirmar a identidade pelo contato antigo.', 'Segurança digital', 7, 6),
    steps: generatedTemplate('fake-family'),
    learningGoals: ['Reconhecer um número novo', 'Não fornecer nomes ao desconhecido', 'Ligar para o contato antigo', 'Recusar Pix urgente', 'Bloquear e denunciar'],
  },
  {
    key: 'scam-message',
    icon: 'chatbubble-ellipses-outline',
    details: details('scam-message', '10000000-0000-4000-8000-000000000007', 'Identificar mensagem de golpe', 'Aprenda a reconhecer pressa, links desconhecidos e pedidos de senha ou código.', 'Segurança digital', 6, 7),
    steps: generatedTemplate('scam-message'),
    learningGoals: ['Reconhecer pressa e prêmio inesperado', 'Conferir remetente e link', 'Proteger senhas e códigos', 'Usar o canal verdadeiro', 'Bloquear e denunciar'],
  },
  {
    key: 'mobility',
    icon: 'car-outline',
    details: details('mobility', '10000000-0000-4000-8000-000000000004', 'Pedir um transporte por aplicativo', 'Pratique como escolher destino, categoria, pagamento e conferir o carro antes de entrar.', 'Mobilidade', 8, 8),
    steps: generatedTemplate('mobility'),
    learningGoals: ['Informar o destino', 'Conferir o ponto de partida', 'Comparar preço e categoria', 'Escolher o pagamento', 'Conferir placa, modelo, cor e foto'],
  },
  {
    key: 'download-app',
    icon: 'download-outline',
    details: details('download-app', '10000000-0000-4000-8000-000000000005', 'Baixar um aplicativo', 'Aprenda a conferir nome, desenvolvedor e permissões antes de instalar.', 'Aplicativos', 6, 4),
    steps: appStoreSteps,
    learningGoals: ['Usar a loja oficial', 'Conferir nome e desenvolvedor', 'Identificar cópias suspeitas', 'Revisar permissões antes de instalar'],
  },
  {
    key: 'shopping',
    icon: 'cart-outline',
    details: details('shopping', '10000000-0000-4000-8000-000000000006', 'Simular uma compra na Shopee', 'Pratique pesquisa, conferência do anúncio, carrinho e revisão final sem comprar de verdade.', 'Compras online', 8, 4),
    steps: shoppingSteps,
    learningGoals: ['Pesquisar um produto', 'Reconhecer um anúncio mais seguro', 'Não pagar fora da plataforma', 'Somar produto e frete', 'Revisar o pedido antes de pagar'],
  },
  {
    key: 'fake-bank',
    icon: 'call-outline',
    details: details('fake-bank', '10000000-0000-4000-8000-000000000009', 'Falsa central bancária', 'Reconheça ligações que pedem senha, código ou instalação de aplicativo.', 'Segurança digital', 7, 3),
    steps: fakeBankSteps,
    learningGoals: ['Nunca informar a senha completa', 'Não instalar aplicativos durante uma ligação', 'Encerrar a chamada suspeita', 'Procurar o banco pelo canal oficial'],
  },
  {
    key: 'gov-br',
    icon: 'document-text-outline',
    details: details('gov-br', '10000000-0000-4000-8000-00000000000a', 'Criar conta no Gov.br', 'Pratique identificação, validação, contato, código e senha sem usar dados reais.', 'Serviços Públicos', 6, 9),
    steps: govSteps,
    learningGoals: ['Iniciar com CPF', 'Confirmar termos e identidade', 'Cadastrar um contato', 'Validar o código recebido', 'Criar uma senha segura'],
  },
];

export function getPublicDemoMission(key?: string) {
  return publicDemoMissions.find((mission) => mission.key === key) ?? publicDemoMissions[0]!;
}
