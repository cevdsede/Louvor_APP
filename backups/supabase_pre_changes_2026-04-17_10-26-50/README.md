# Backup pre-change

Backup criado em `2026-04-17 10:26:50` antes de iniciar a automacao da escala da planilha para o Supabase.

## O que foi salvo

- `schema.sql`
- `roles.sql`
- `data.sql`
- `supabase_dump_2026-04-13.zip`
- `backup_manifest.json`

## Estado do banco no momento

- Projeto: `PWA_Louvor_db`
- Ref: `ipdrbhkzluuwjulkhjkd`
- Dump remoto completo: pendente por falta de autenticacao local da Supabase CLI

## Regra confirmada para a importacao

O culto deve ser comparado por `data_culto + horario`.

Se existir um culto no mesmo dia e no mesmo horario:

- nao cria outro culto
- atualiza o culto existente
- se o nome mudou, troca `id_nome_cultos` para o novo nome

## Como concluir o dump remoto depois

Uma destas opcoes resolve:

1. Fazer `supabase login` nesta maquina
2. Definir `SUPABASE_ACCESS_TOKEN` no ambiente
3. Me passar a credencial para eu gerar um dump remoto novo com a CLI
