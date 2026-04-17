# Google Sheets -> Supabase

Arquivos desta pasta:

- `import-escala.gs`: script modelo para o Louvor
- `import-escala-midia.gs`: script modelo para a Midia

## O que essa integração faz

1. Lê a aba configurada da planilha
2. Converte cada linha em um evento de escala
3. Envia tudo para a Edge Function `import-scales`
4. A function compara o culto por `data_culto + horario`
5. Se o nome do culto mudou no mesmo horário, ela atualiza o nome do culto existente
6. Substitui as escalas daquele `culto + ministério`

## Observação importante

Hoje o banco já possui alguns `cultos` com a mesma data e o mesmo horário. Por isso, a Edge Function faz uma resolução segura:

- primeiro tenta achar o culto pelo mesmo `data + horário`
- se houver duplicidade, ela prioriza o culto que já tem escalas do ministério importado
- se continuar ambíguo, ela bloqueia aquele evento e retorna erro em vez de sobrescrever o registro errado

## Como ativar

1. Defina a secret `GOOGLE_SHEETS_IMPORT_SECRET` na Edge Function do Supabase
2. Cole `import-escala.gs` no Apps Script da planilha
3. Rode `saveImportProperties()`
4. Troque `TROCAR_PELO_SEGREDO_REAL` pelo mesmo valor configurado no Supabase
5. Ajuste `sheetName`, colunas e aliases conforme sua planilha
6. Execute `testImportDryRun()`
7. Se o retorno estiver certo, execute `runImportNow()`

## Layout padrão usado neste script

- coluna 1: Data
- coluna 3: Horário do culto
- coluna 4: Nome do culto
- colunas 5 e 6: Ministro
- colunas 7, 8 e 9: Vocal
- coluna 10: Violão
- coluna 11: Teclado
- coluna 12: Guitarra
- coluna 13: Baixo
- coluna 14: Bateria
- coluna 15: Data do ensaio
- coluna 16: Horário do ensaio
