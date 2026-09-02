# Autonomia, impacto e aprendizagem personalizada

## Avaliação de confiança

Antes da missão, o aluno informa confiança de 1 a 5. Depois de concluir a tentativa, responde novamente. O backend valida a autoria e que a tentativa concluída pertence à mesma atribuição. A evolução é `confiança depois - confiança antes`; respostas incompletas não entram na média.

Autonomia continua sendo calculada por conclusão sem eventos de dica ou ajuda. O painel administrativo apresenta somente agregados: alunos alcançados, conclusões, conclusões autônomas, ganho médio de confiança e pedidos de ajuda.

## Recomendação baseada em regras

O ranking favorece conteúdo obrigatório e ainda não concluído. A busca combina título, resumo e categoria usando correspondência textual tolerante. Nenhuma decisão sensível é delegada a IA e nenhum perfil é enviado a terceiros. Quando não existe resultado, o aluno pode registrar uma demanda curta; o texto é normalizado, limitado e visível somente ao próprio aluno e aos administradores.

## Modo oficina

Administradores escolhem uma turma e acompanham tentativa recente, passo atual e pedidos abertos. Atualizações de tentativas e ajuda usam Realtime com RLS. Esse painel serve para apoio presencial e não substitui consentimento ou avaliação humana.

## Simulações contra golpes

As missões publicadas cobrem mensagem com link, falso familiar e falsa central bancária. Todos os passos usam escolhas fictícias e são executados pelo motor seguro: não abrem links, não enviam mensagens, não instalam aplicativos e não movimentam dinheiro.

## Demonstração offline

O modo local aparece somente quando `EXPO_PUBLIC_APP_ENV=development` e `EXPO_PUBLIC_ENABLE_DEVELOPMENT_MOCKS=true`. Ele não autentica, não consulta o backend e usa conteúdo estático sem dados pessoais. Não é um modo offline da conta real.

## Acessibilidade

As preferências sincronizadas incluem texto ampliado, alto contraste, áudio automático, velocidade, repetição única, redução de movimento e vibração opcional. A homologação final deve ocorrer com VoiceOver, TalkBack e pessoas idosas em aparelhos reais.
