# Missões assistidas por IA

O aplicativo nunca chama o provedor de IA diretamente. `generate-mission` exige uma sessão Supabase válida e lê `GEMINI_API_KEY` somente dos secrets da Edge Function. O app habilita a experiência explicitamente com `EXPO_PUBLIC_ENABLE_AI_MISSIONS=true`; quando indisponível, usa o gerador local controlado.

## Publicação

```sh
npx supabase secrets set GEMINI_API_KEY=valor --project-ref <project-ref>
npx supabase functions deploy generate-mission --project-ref <project-ref>
```

A entrada aceita de 3 a 160 caracteres. Temas de credenciais e transações são recusados. Entrada e saída possuem validação e a resposta nunca deve pedir CPF, senha, token, pagamento, foto, localização ou permissão real. Antes de produção, configure rate limiting no gateway e monitore apenas códigos técnicos agregados, sem armazenar a busca do aluno.
