# Ciclo de vida seguro da sessão

O `AuthProvider` é a única fonte de verdade da autenticação no aplicativo. O
estado demonstrativo de missões e interface não pode criar, recuperar ou trocar
papéis.

## Estados

```text
bootstrapping ── sem sessão ───────────────→ anonymous
      │
      └── sessão válida ───────────────────→ authenticated
                │
                └── próxima da expiração ─→ refreshing
                                                │
                          refresh válido ───────┤→ authenticated
                          inválido/revogado ────┘→ anonymous
```

- `bootstrapping`: lê o armazenamento e valida a sessão; nenhuma rota protegida
  é montada.
- `anonymous`: exibe login e erros recuperáveis de restauração.
- `authenticated`: possui conta validada, papéis retornados pelo backend e,
  quando necessário, um papel de sessão escolhido dentro dessa lista.
- `refreshing`: bloqueia temporariamente as rotas. Uma promise compartilhada
  impede refresh concorrente.

Uma sessão armazenada só libera conteúdo depois de consultar
`get_my_auth_context()`. Conta bloqueada, sem vínculo, refresh inválido e sessão
revogada voltam para `anonymous`.

## Armazenamento

No Android e iOS, o adapter guarda a sessão Supabase em `expo-secure-store` com
`WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Como o payload pode exceder o limite do
Keychain/Keystore, ele é dividido em blocos com manifesto e troca de geração
atômica.

Na web, a sessão usa uma chave isolada por ambiente em `localStorage`, a
estratégia persistente compatível com Supabase. O aplicativo não armazena senha,
token Google, client secret, papel escolhido, perfil completo ou resposta OAuth
bruta em chaves próprias. A segurança web também depende de CSP, ausência de
scripts não confiáveis e prevenção de XSS antes de production.

## Renovação e rede

O cliente Supabase mantém rotação automática enquanto o app está ativo. Na
restauração, uma sessão a menos de 60 segundos da expiração passa por uma única
promise de refresh. Em background, a renovação é pausada.

Se não houver rede, a sessão persistida não é apagada, mas também não libera
rotas protegidas. A tela de login oferece **Tentar novamente** para restaurar a
mesma sessão quando a conexão voltar. Erro definitivo remove credenciais locais.

## Logout

1. Solicitar `signOut(scope: global)` para revogar refresh tokens no Supabase.
2. Aguardar no máximo cinco segundos.
3. Em `finally`, parar auto-refresh e apagar sessão, usuário auxiliar e verificador
   PKCE do armazenamento local.
4. Fechar eventual navegador de autenticação no mobile.
5. Limpar conta, papéis e onboarding em memória e zerar a navegação para login.

A limpeza local ocorre mesmo se a chamada remota falhar ou ficar sem resposta.
O OAuth usa `prompt=select_account`, portanto uma nova entrada exige escolha
explícita da Conta Google em vez de reutilização silenciosa.

## Rotas e deep links

As árvores de participante, monitor e administrador ficam dentro de
`Stack.Protected`. O guard exige simultaneamente estado `authenticated` e o papel
de sessão correspondente. Durante bootstrap/refresh só existe a tela neutra de
verificação; um deep link de outro papel não monta nem revela o componente alvo.

## Evidências

- `npm run typecheck`
- `npm run lint`
- `npm run export`
- `npm run backend:test:auth`

O último teste cria credencial sintética apenas no Supabase local, comprova
rotação do refresh token, executa revogação global e prova que o token revogado
não produz outra sessão.
