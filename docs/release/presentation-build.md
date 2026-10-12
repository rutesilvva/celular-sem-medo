# Build de apresentação para a banca

O perfil `presentation` é um artefato interno de contingência. Ele mantém o
ambiente de staging, habilita explicitamente a demonstração offline e não ativa
mocks globais, IA externa ou observabilidade.

```bash
npm run release:check
npm run build:presentation:android
```

Na entrada, a equipe pode tentar **Continuar com Google** ou escolher **Ver
demonstração offline**. A segunda opção não cria sessão, não concede papéis e não
grava os dados fictícios no Supabase.

Antes da banca:

1. Instale o APK em um aparelho físico.
2. Abra a demonstração e confira o diagnóstico técnico.
3. Execute `npm run e2e:presentation` com o aparelho/emulador disponível.
4. Grave o roteiro completo como reserva.
5. Use **Reiniciar apresentação** antes de cada ensaio.

O perfil `production` continua sem `EXPO_PUBLIC_DEMO_MODE=true`. O script de
release rejeita demonstração ou mocks quando `RELEASE_ENV=production`.
