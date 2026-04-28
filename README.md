# Sistema de Gestao de Louvor

Aplicacao web para gestao de ministerios, equipes, escalas, repertorio musical, presenca e notificacoes. O projeto usa React, TypeScript, Vite, Tailwind CSS e Supabase.

## Principais Recursos

- Gestao de membros, funcoes e ministerios.
- Escalas por culto, calendario e lista.
- Repertorio musical e historico de uso.
- Controle de presenca e limpeza.
- Notificacoes internas.
- Suporte offline-first com cache local e sincronizacao.
- PWA para instalacao em dispositivos compativeis.

## Stack

- React 19
- TypeScript 5
- Vite 6
- Supabase JS 2
- Tailwind CSS 4
- vite-plugin-pwa

## Requisitos

- Node.js 22 recomendado para desenvolvimento e CI.
- npm.
- Projeto Supabase configurado.

## Configuracao

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Estrutura

- `components/`: componentes de interface por area do sistema.
- `contexts/`: contextos globais, incluindo ministerio ativo.
- `hooks/`: hooks compartilhados.
- `services/`: acesso a dados, cache, sincronizacao e regras de aplicacao.
- `utils/`: utilitarios compartilhados.
- `supabase/migrations/`: migrations do banco.
- `supabase/functions/`: Edge Functions executadas no runtime Deno do Supabase.
- `integrations/`: scripts auxiliares de integracao.

## Qualidade

O projeto possui verificacao de tipos e build automatizados:

```bash
npm run typecheck
npm run build
```

O workflow `.github/workflows/quality.yml` roda essas verificacoes em pull requests, pushes para `main`/`dev` e execucao manual.

## Observacoes De Manutencao

- Arquivos gerados como `dist`, `.vite`, backups, dumps zip e temporarios do Supabase nao devem ser versionados.
- A Edge Function em `supabase/functions` usa Deno e fica fora do `tsconfig` do frontend.
- A camada offline/sync ainda deve ser consolidada para reduzir duplicidade entre servicos.
