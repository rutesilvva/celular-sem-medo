# Endurecimento operacional

## Falhas e sincronização

`AppErrorBoundary` impede que uma exceção inesperada deixe uma tela em branco e registra somente um erro técnico sanitizado. `OfflineSyncManager` publica os estados `offline`, `syncing`, `saved` e `error`; o aviso global informa ao aluno quando dados continuam apenas no aparelho e quando serão reenviados.

## Saúde do ambiente

Administradores acessam **Saúde do sistema** na tela inicial. A verificação server-side confirma banco, RLS, configuração de certificados e catálogo publicado. A latência da consulta é medida no cliente. O diagnóstico não mostra chaves, tokens, e-mails ou detalhes internos da infraestrutura.

## Feature flags

As flags remotas são lidas por uma RPC pública que retorna somente chave e estado. Apenas administradores podem alterá-las. Nenhuma flag substitui autorização ou RLS: ela controla disponibilidade de produto, não permissões.

## Proteção contra abuso e escala

Triggers server-side limitam, por usuário e janela de uma hora, pedidos de ajuda, avaliações de missão e correções de certificado. O ledger é privado. A API paginada de certificados aceita no máximo 50 registros por chamada e rejeita offsets e filtros inválidos.

## Qualidade visual

O workflow `Android E2E` executa o roteiro previsível no emulador e arquiva capturas das etapas essenciais. Os testes autenticados continuam dependendo do ambiente de staging e de contas exclusivas de teste.

