# Operacao Do Sistema

Este documento concentra a rotina minima para validar, publicar e revisar a saude do sistema.

## Validacao Antes De Publicar

Execute sempre:

```bash
npm run verify
npm run typecheck
npm run build
```

Se qualquer comando falhar, a publicacao deve parar ate o erro ser corrigido.

## Supabase

Antes de publicar alteracoes de banco:

1. Confira se a migration local existe em `supabase/migrations`.
2. Confirme se a migration foi aplicada no projeto Supabase correto.
3. Rode os advisors de seguranca e performance no Supabase.
4. Registre qualquer aviso mantido de forma intencional.

## Avisos Mantidos Intencionalmente

Os advisors podem continuar exibindo estes avisos:

- `aprovar_membro` como `SECURITY DEFINER` executavel por `authenticated`: usado pelo fluxo de aprovacao de membros.
- `get_auth_display_names` como `SECURITY DEFINER` executavel por `authenticated`: usado para resolver nomes de usuarios autenticados.
- Indices novos como `unused_index`: normal logo apos a criacao; revisar novamente depois de uso real.
- Tabelas em `ops_backup` sem primary key: schema historico de backup, nao caminho principal da aplicacao.

## Configuracao Manual Recomendada

No painel do Supabase Auth, ativar protecao contra senhas vazadas:

- Authentication
- Providers ou Password Security
- Enable leaked password protection

## Rollback Basico

Para rollback de frontend, volte para o ultimo commit estavel e publique novamente.

Para rollback de banco, crie uma nova migration reversa. Nao apague migrations ja aplicadas em producao.

## Checklist Rapido

- Git limpo antes de iniciar.
- Migration aplicada e versionada.
- `npm run verify` passou.
- `npm run typecheck` passou.
- `npm run build` passou.
- Advisors revisados.
- Commit criado com descricao clara.
