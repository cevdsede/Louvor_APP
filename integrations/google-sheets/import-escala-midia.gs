const IMPORT_CONFIG = {
  sheetName: 'Escala Planilha',
  ministerioSlug: 'midia',
  defaultYear: '2026',
  dataStartRow: 2,
  columns: {
    dataCulto: 1,
    horarioCulto: 3,
    nomeCulto: 4,
  },
  roleColumns: [
    { column: 5, funcao: 'Data Show' },
    { column: 6, funcao: 'Apoio' },
    { column: 7, funcao: 'Celular' },
    { column: 8, funcao: 'Camera' },
    { column: 9, funcao: 'Social Midias' },
  ],
  memberAliases: {
    'Anne': 'Anne Gabrielly',
  },
  ignoredCellValues: ['', '-', '--', 'x', 'X', 'folga', 'Folga'],
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase Midia')
    .addItem('Testar importacao (dry-run)', 'testImportDryRun')
    .addItem('Importar escalas agora', 'runImportNow')
    .addSeparator()
    .addItem('Salvar URL e segredo', 'saveImportProperties')
    .addItem('Criar gatilho diario (06h)', 'createDailyImportTrigger')
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
    'Configuracoes salvas. Agora troque o segredo real.',
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
    'Gatilho diario configurado.',
    'Supabase',
    5,
  );
}

function syncScaleSheet_(dryRun) {
  const properties = PropertiesService.getScriptProperties();
  const functionUrl = properties.getProperty('SUPABASE_FUNCTION_URL');
  const importSecret = properties.getProperty('GOOGLE_SHEETS_IMPORT_SECRET');

  if (!functionUrl || !importSecret) {
    throw new Error('Configure a URL e o segredo antes de importar.');
  }

  if (importSecret === 'TROCAR_PELO_SEGREDO_REAL') {
    throw new Error('Troque GOOGLE_SHEETS_IMPORT_SECRET pelo segredo real antes de importar.');
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
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        `A Edge Function retornou uma resposta invalida (${statusCode}).\n` +
        responseText.slice(0, 500),
      );
    }
  }

  Logger.log(JSON.stringify(data, null, 2));

  const title = dryRun ? 'Dry-run Supabase' : 'Importacao Supabase';

  if (statusCode >= 200 && statusCode < 300 && data.success) {
    SpreadsheetApp.getActive().toast(
      `${title}: ${data.stats.eventos_processados} eventos e ${data.stats.escalas_inseridas} escalas.`,
      'Sucesso',
      8,
    );
    return;
  }

  const issueLines = (data.issues || [])
    .slice(0, 8)
    .map((issue) => `${issue.event_ref || 'Geral'}: ${issue.message}`);

  throw new Error(
    [
      `${title} falhou (${statusCode}).`,
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
    throw new Error(`A aba "${IMPORT_CONFIG.sheetName}" nao foi encontrada.`);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < IMPORT_CONFIG.dataStartRow) {
    throw new Error('A planilha nao possui linhas para importar.');
  }

  const lastConfiguredColumn = getLastConfiguredColumn_();
  const range = sheet.getRange(
    IMPORT_CONFIG.dataStartRow,
    1,
    lastRow - IMPORT_CONFIG.dataStartRow + 1,
    lastConfiguredColumn,
  );
  const values = range.getValues();
  const displayValues = range.getDisplayValues();

  const eventos = [];

  values.forEach((row, index) => {
    const displayRow = displayValues[index] || [];
    const rowNumber = IMPORT_CONFIG.dataStartRow + index;
    const rawDataCulto = displayRow[IMPORT_CONFIG.columns.dataCulto - 1] ||
      row[IMPORT_CONFIG.columns.dataCulto - 1];
    const rawHorarioCulto = displayRow[IMPORT_CONFIG.columns.horarioCulto - 1] ||
      row[IMPORT_CONFIG.columns.horarioCulto - 1];
    const rawNomeCulto = displayRow[IMPORT_CONFIG.columns.nomeCulto - 1] ||
      row[IMPORT_CONFIG.columns.nomeCulto - 1];
    const dataCulto = formatDateCell_(rawDataCulto);
    const horarioCulto = formatTimeCell_(rawHorarioCulto);
    const nomeCulto = normalizeText_(rawNomeCulto);

    const escalados = [];

    IMPORT_CONFIG.roleColumns.forEach(({ column, funcao }) => {
      const rawValue = displayRow[column - 1] || row[column - 1];
      const memberNames = splitMemberCell_(rawValue);

      memberNames.forEach((memberName) => {
        escalados.push({
          membro_nome: resolveMemberAlias_(memberName),
          funcao_nome: funcao,
        });
      });
    });

    const isCompletelyEmpty = !dataCulto && !horarioCulto && !nomeCulto &&
      escalados.length === 0;

    if (isCompletelyEmpty) {
      return;
    }

    if (isHeaderLikeRow_(rawDataCulto, rawHorarioCulto, rawNomeCulto)) {
      return;
    }

    const isPlaceholderWithoutCulto = !nomeCulto && escalados.length === 0;
    if (isPlaceholderWithoutCulto) {
      return;
    }

    if (!dataCulto) {
      throw new Error(`Linha ${rowNumber}: data do culto vazia ou invalida.`);
    }

    if (!horarioCulto) {
      throw new Error(`Linha ${rowNumber}: horario do culto vazio ou invalido.`);
    }

    if (!nomeCulto) {
      throw new Error(`Linha ${rowNumber}: nome do culto vazio.`);
    }

    if (escalados.length === 0) {
      return;
    }

    eventos.push({
      referencia: `Linha ${rowNumber}`,
      data_culto: dataCulto,
      horario: horarioCulto,
      nome_culto: nomeCulto,
      escalados,
    });
  });

  if (eventos.length === 0) {
    throw new Error('Nenhum evento valido foi encontrado para importacao.');
  }

  return {
    ministerio_slug: IMPORT_CONFIG.ministerioSlug,
    replace_existing: true,
    skip_empty_events: true,
    member_aliases: IMPORT_CONFIG.memberAliases,
    source: {
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetName: sheet.getName(),
    },
    eventos,
  };
}

function getLastConfiguredColumn_() {
  const configuredColumns = [
    IMPORT_CONFIG.columns.dataCulto,
    IMPORT_CONFIG.columns.horarioCulto,
    IMPORT_CONFIG.columns.nomeCulto,
  ].concat(IMPORT_CONFIG.roleColumns.map((item) => item.column));

  return Math.max.apply(null, configuredColumns);
}

function normalizeText_(value) {
  return String(value || '').trim();
}

function normalizeLookupKey_(value) {
  return normalizeText_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolveMemberAlias_(value) {
  const normalized = normalizeLookupKey_(value);
  const aliasEntries = Object.keys(IMPORT_CONFIG.memberAliases || {});

  for (let i = 0; i < aliasEntries.length; i += 1) {
    const alias = aliasEntries[i];
    if (normalizeLookupKey_(alias) === normalized) {
      return IMPORT_CONFIG.memberAliases[alias];
    }
  }

  return normalizeText_(value);
}

function splitMemberCell_(value) {
  const text = normalizeText_(value);

  if (!text) return [];
  if (IMPORT_CONFIG.ignoredCellValues.indexOf(text) >= 0) return [];

  return text
    .split(/[\n\r,;/]+/)
    .map((item) => normalizeText_(item))
    .filter((item) => item && IMPORT_CONFIG.ignoredCellValues.indexOf(item) === -1);
}

function isHeaderLikeRow_(dataValue, horarioValue, nomeValue) {
  const headerWords = [
    'data',
    'dia',
    'horario',
    'hora',
    'culto',
    'evento',
    'escala',
    'nome',
  ];

  const values = [dataValue, horarioValue, nomeValue]
    .map((item) => normalizeLookupKey_(item))
    .filter(Boolean);

  const matches = values.filter((item) => headerWords.indexOf(item) >= 0);
  return matches.length >= 2;
}

function formatDateCell_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
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

function formatTimeCell_(value) {
  if (!value && value !== 0) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm:00');
  }

  const text = normalizeText_(value);
  const hhmm = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!hhmm) return '';

  return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}:00`;
}
