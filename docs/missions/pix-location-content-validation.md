# Validação de conteúdo — Pix e localização

As versões publicadas executam no mesmo motor seguro das demais missões e não
possuem integração com banco, Pix, GPS, mapas, contatos ou mensageria.

## Roteiro de homologação humana

Antes de distribuir o beta externamente, conduzir uma sessão com ao menos um
monitor e participantes idosos. Para cada missão, verificar:

- se instruções, opções, dicas e áudio são compreendidos sem explicação externa;
- se a pessoa reconhece a opção insegura e entende por que deve evitá-la;
- se botões e textos são legíveis e fáceis de tocar;
- se a mensagem de que nada acontece de verdade permanece clara;
- se pedir ajuda e tentar novamente não causa constrangimento ou confusão.

Registrar data, versão, perfis dos avaliadores sem identificação pessoal,
dificuldades observadas e alterações aprovadas. Qualquer ajuste de conteúdo deve
gerar uma nova `mission_version`, preservando tentativas vinculadas à versão 1.

Status atual: implementação e validação automatizada concluídas; homologação com
monitor e participantes deve ocorrer antes da distribuição externa do beta.
