const IMPORT_CONFIG = {
  sheetName: 'Escala',
  ministerioSlug: 'louvor',
  defaultYear: '2026',
  dataStartRow: 2,
  columns: {
    dataCulto: 1,
    horarioCulto: 3,
    nomeCulto: 4,
    dataEnsaio: 15,
    horarioEnsaio: 16,
  },
  roleColumns: [
    { column: 5, funcao: 'Ministro' },
    { column: 6, funcao: 'Ministro' },
    { column: 7, funcao: 'Vocal' },
    { column: 8, funcao: 'Vocal' },
    { column: 9, funcao: 'Vocal' },
    { column: 10, funcao: 'Violão' },
    { column: 11, funcao: 'Teclado' },
    { column: 12, funcao: 'Guitarra' },
    { column: 13, funcao: 'Baixo' },
    { column: 14, funcao: 'Bateria' },
  ],
  memberAliases: {
    'Convidado': 'Convidado',
    'V. Mesquita': 'V. Mesquita',
  },
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase')
    .addItem('Testar importação (dry-run)', 'testImportDryRun')
    .addItem('Importar escalas agora', 'runImportNow')
    .addSeparator()
    .addItem('Salvar config padrão', 'saveImportProperties')
    .addItem('Criar gatilho diário', 'createDailyImportTrigger')
    .addToUi();
}

function saveImportProperties() {
  const properties = PropertiesService.getScriptProperties();

  properties.setProperties({
    SUPABASE_FUNCTION_URL:
      'https://ipdrbhkzluuwjulkhjkd.supabase.co/functions/v1/import-scales',
    GOOGLE_SHEETS_IMPORT_SECRET: 'TROCAR_PELO_SEGREDO_REAL',
  });

  SpreadsheetApp.getActive().toast(
    'As propriedades básicas foram salvas. Agora troque o segredo real.',
    'Supabase',
    5,
  );
}

function testImportDryRun() {
  syncScaleSheet_(true);
}

function runImportNow() {
  syncScaleSheet_(false);
}

function createDailyImportTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some((trigger) =>
    trigger.getHandlerFunction() === 'runImportNow'
  );

  if (!exists) {
    ScriptApp.newTrigger('runImportNow')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();
  }

  SpreadsheetApp.getActive().toast(
    'Gatilho diário criado para executar a importação.',
    'Supabase',
    5,
  );
}

function syncScaleSheet_(dryRun) {
  const properties = PropertiesService.getScriptProperties();
  const functionUrl = properties.getProperty('SUPABASE_FUNCTION_URL');
  const importSecret = properties.getProperty('GOOGLE_SHEETS_IMPORT_SECRET');

  if (!functionUrl || !importSecret) {
    throw new Error(
      'Configure SUPABASE_FUNCTION_URL e GOOGLE_SHEETS_IMPORT_SECRET nas Script Properties.',
    );
  }

  const payload = buildImportPayload_();
  payload.dry_run = dryRun;

  const response = UrlFetchApp.fetch(functionUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-import-secret': importSecret,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();
  const data = responseText ? JSON.parse(responseText) : {};

  Logger.log(JSON.stringify(data, null, 2));

  const title = dryRun ? 'Dry-run Supabase' : 'Importação Supabase';

  if (statusCode >= 200 && statusCode < 300 && data.success) {
    SpreadsheetApp.getActive().toast(
      `${title}: ${data.stats.eventos_processados} eventos, ${data.stats.escalas_inseridas} escalas.`,
      'Supabase',
      8,
    );
    return;
  }

  const issueLines = (data.issues || [])
    .slice(0, 5)
    .map((issue) => `${issue.event_ref || 'Geral'}: ${issue.message}`);

  throw new Error(
    [
      `${title} falhou com status ${statusCode}.`,
      data.message || '',
      issueLines.join('\n'),
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

function buildImportPayload_() {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName(IMPORT_CONFIG.sheetName);

  if (!sheet) {
    throw new Error(`A aba "${IMPORT_CONFIG.sheetName}" não foi encontrada.`);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < IMPORT_CONFIG.dataStartRow) {
    throw new Error('A planilha não possui linhas para importar.');
  }

  const values = sheet
    .getRange(
      IMPORT_CONFIG.dataStartRow,
      1,
      lastRow - IMPORT_CONFIG.dataStartRow + 1,
      lastColumn,
    )
    .getValues();

  const eventos = [];

  values.forEach((row, index) => {
    const rowNumber = IMPORT_CONFIG.dataStartRow + index;
    const nomeCulto = normalizeText_(row[IMPORT_CONFIG.columns.nomeCulto - 1]);
    const dataCulto = formatDateCell_(row[IMPORT_CONFIG.columns.dataCulto - 1]);
    const horarioCulto = formatTimeCell_(
      row[IMPORT_CONFIG.columns.horarioCulto - 1],
    );
    const dataEnsaio = formatOptionalDateCell_(
      row[IMPORT_CONFIG.columns.dataEnsaio - 1],
    );
    const horarioEnsaio = formatOptionalTimeCell_(
      row[IMPORT_CONFIG.columns.horarioEnsaio - 1],
    );

    const escalados = IMPORT_CONFIG.roleColumns
      .map(({ column, funcao }) => {
        const originalName = normalizeText_(row[column - 1]);
        const resolvedName = IMPORT_CONFIG.memberAliases[originalName] || originalName;

        if (!resolvedName) return null;

        return {
          membro_nome: resolvedName,
          funcao_nome: funcao,
        };
      })
      .filter(Boolean);

    const isEmptyRow = !nomeCulto && !dataCulto && escalados.length === 0;
    if (isEmptyRow) return;

    if (!dataCulto) {
      throw new Error(`Linha ${rowNumber}: data do culto vazia ou inválida.`);
    }

    if (!horarioCulto) {
      throw new Error(`Linha ${rowNumber}: horário do culto vazio ou inválido.`);
    }

    if (!nomeCulto) {
      throw new Error(`Linha ${rowNumber}: nome do culto vazio.`);
    }

    eventos.push({
      referencia: `Linha ${rowNumber}`,
      data_culto: dataCulto,
      horario: horarioCulto,
      nome_culto: nomeCulto,
      data_ensaio: dataEnsaio,
      horario_ensaio: horarioEnsaio,
      escalados,
    });
  });

  return {
    ministerio_slug: IMPORT_CONFIG.ministerioSlug,
    replace_existing: true,
    member_aliases: IMPORT_CONFIG.memberAliases,
    source: {
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetName: sheet.getName(),
    },
    eventos,
  };
}

function normalizeText_(value) {
  return String(value || '').trim();
}

function formatDateCell_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd',
    );
  }

  const text = normalizeText_(value);
  const fullDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullDate) {
    return `${fullDate[3]}-${fullDate[2]}-${fullDate[1]}`;
  }

  const shortDate = text.match(/^(\d{2})\/(\d{2})$/);
  if (shortDate) {
    return `${IMPORT_CONFIG.defaultYear}-${shortDate[2]}-${shortDate[1]}`;
  }

  return '';
}

function formatOptionalDateCell_(value) {
  return formatDateCell_(value) || null;
}

function formatTimeCell_(value) {
  if (!value && value !== 0) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }

  const text = normalizeText_(value);
  const hhmm = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!hhmm) return '';

  const hour = hhmm[1].padStart(2, '0');
  const minute = hhmm[2];

  return `${hour}:${minute}`;
}

function formatOptionalTimeCell_(value) {
  return formatTimeCell_(value) || null;
}
