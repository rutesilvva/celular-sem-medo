# Evidências para competição e beta

O código prepara os cenários abaixo, mas a equipe deve registrar resultados reais
em aparelhos. Não marque um item com base apenas em simulador ou teste unitário.

| Evidência | Android | iOS | Responsável | Resultado/anexo |
| --- | --- | --- | --- | --- |
| Instalação limpa do preview | [ ] | [ ] |  |  |
| Google: aberto, background e app encerrado | [ ] | [ ] |  |  |
| Sessão restaurada e logout | [ ] | [ ] |  |  |
| Missão, confiança e progresso | [ ] | [ ] |  |  |
| Ajuda, push e deep link | [ ] | [ ] |  |  |
| Offline e sincronização | [ ] | [ ] |  |  |
| TTS, pausa, repetição e falha de idioma | [ ] | [ ] |  |  |
| PDF/CSV e compartilhamento | [ ] | [ ] |  |  |
| TalkBack/VoiceOver e fonte em 200% | [ ] | [ ] |  |  |
| Atualização OTA e rollback ensaiado | [ ] | [ ] |  |  |

## Demonstração recomendada

1. Apresente o problema e deixe claro que nenhuma ação real é executada.
2. Mostre confiança inicial, uma dificuldade, apoio e nova tentativa.
3. Registre a confiança final e mostre a justificativa da próxima recomendação.
4. Abra o pedido no painel administrativo e o modo oficina.
5. Termine no painel de impacto, separando dados sintéticos de evidência real.

Antes do evento, rode `npm run release:check`, `npm run test:ci`, os testes do
banco e `npm run e2e:regression` no preview assinado. Guarde vídeo curto de
reserva e um build com modo demonstração deliberadamente habilitado fora de
production para contingência de rede.
