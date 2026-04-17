import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type ImportIssueCode =
  | "INVALID_PAYLOAD"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "MINISTRY_NOT_FOUND"
  | "MINISTRY_INACTIVE"
  | "FUNCTION_NOT_FOUND"
  | "FUNCTION_AMBIGUOUS"
  | "MEMBER_NOT_FOUND"
  | "MEMBER_AMBIGUOUS"
  | "MEMBER_NOT_ACTIVE_IN_MINISTRY"
  | "AMBIGUOUS_CULTO"
  | "CULT_NAME_CONFLICT";

interface ImportIssue {
  code: ImportIssueCode;
  message: string;
  event_ref?: string;
  context?: Record<string, unknown>;
}

interface ImportRequest {
  ministerio_id?: string;
  ministerio_slug?: string;
  dry_run?: boolean;
  replace_existing?: boolean;
  skip_empty_events?: boolean;
  member_aliases?: Record<string, string>;
  funcao_aliases?: Record<string, string>;
  eventos?: ImportEventInput[];
  source?: Record<string, unknown>;
}

interface ImportEventInput {
  referencia?: string;
  data_culto: string;
  horario: string;
  nome_culto: string;
  data_ensaio?: string | null;
  horario_ensaio?: string | null;
  escalados?: ImportAssignmentInput[];
}

interface ImportAssignmentInput {
  membro_nome: string;
  funcao_nome: string;
}

interface MinisterioRecord {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
}

interface FuncaoRecord {
  id: number;
  nome_funcao: string;
  ministerio_id: string;
}

interface MembroRecord {
  id: string;
  nome: string;
}

interface MembroMinisterioRecord {
  membro_id: string;
  ativo: boolean;
}

interface NomeCultoRecord {
  id: string;
  nome_culto: string;
  created_at?: string | null;
}

interface CultoRecord {
  id: string;
  data_culto: string;
  horario: string;
  id_nome_cultos: string | null;
}

interface EscalaRecord {
  id_culto: string;
}

interface PlannedAssignment {
  id_membros: string;
  id_funcao: number;
  membro_nome: string;
  funcao_nome: string;
}

interface PlannedCultoCreation {
  key: string;
  data_culto: string;
  horario: string;
  nome_culto_normalized: string;
  nome_culto_display: string;
}

interface PlannedCultoNameUpdate {
  culto_id: string;
  nome_culto_normalized: string;
  nome_culto_display: string;
}

interface PlannedEvent {
  ref: string;
  key: string;
  data_culto: string;
  horario: string;
  nome_culto_display: string;
  nome_culto_normalized: string;
  data_ensaio: string | null;
  horario_ensaio: string | null;
  assignments: PlannedAssignment[];
  existing_culto_id?: string;
}

interface EventResult {
  ref: string;
  data_culto: string;
  horario: string;
  nome_culto: string;
  culto_id?: string;
  action: "created" | "updated" | "reused" | "skipped";
  imported_scales: number;
}

interface SummaryResponse {
  success: boolean;
  dry_run: boolean;
  ministerio: {
    id: string;
    nome: string;
    slug: string;
  };
  source?: Record<string, unknown>;
  stats: {
    eventos_recebidos: number;
    eventos_processados: number;
    nomes_culto_criados: number;
    cultos_criados: number;
    cultos_atualizados: number;
    escalas_inseridas: number;
  };
  issues: ImportIssue[];
  events: EventResult[];
}

const SECRET_HEADER = "x-import-secret";

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const toCultoKey = (dataCulto: string, horario: string) =>
  `${dataCulto}__${horario}`;

function ensureString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const fullBrDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullBrDate) {
    const [, day, month, year] = fullBrDate;
    return `${year}-${month}-${day}`;
  }

  throw new Error(
    `Data inválida: "${value}". Use "yyyy-MM-dd" ou "dd/MM/yyyy".`,
  );
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return null;
  }

  return parseDateInput(value);
}

function parseTimeInput(value: string) {
  const trimmed = value.trim();

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error(
    `Horário inválido: "${value}". Use "HH:mm" ou "HH:mm:ss".`,
  );
}

function parseOptionalTime(value: string | null | undefined) {
  if (!value || !value.trim()) {
    return null;
  }

  return parseTimeInput(value);
}

function buildGroupedMap<T>(
  items: T[],
  getKey: (item: T) => string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  return grouped;
}

function resolveSingleRecord<T>(
  records: T[] | undefined,
  entityLabel: string,
  notFoundCode: ImportIssueCode,
  ambiguousCode: ImportIssueCode,
  displayValue: string,
  eventRef: string,
  issues: ImportIssue[],
) {
  if (!records || records.length === 0) {
    issues.push({
      code: notFoundCode,
      message: `${entityLabel} "${displayValue}" não encontrado.`,
      event_ref: eventRef,
      context: { value: displayValue },
    });
    return null;
  }

  if (records.length > 1) {
    issues.push({
      code: ambiguousCode,
      message: `${entityLabel} "${displayValue}" está ambíguo no banco.`,
      event_ref: eventRef,
      context: { value: displayValue, matches: records.length },
    });
    return null;
  }

  return records[0];
}

function dedupeAssignments(assignments: PlannedAssignment[]) {
  const seen = new Set<string>();
  const deduped: PlannedAssignment[] = [];

  for (const assignment of assignments) {
    const key = `${assignment.id_membros}__${assignment.id_funcao}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(assignment);
  }

  return deduped;
}

async function loadData(
  supabaseAdmin: SupabaseClient,
  ministerio: MinisterioRecord,
) {
  const [
    { data: funcoes, error: funcoesError },
    { data: membros, error: membrosError },
    { data: membrosMinisterios, error: membrosMinisteriosError },
    { data: nomeCultos, error: nomeCultosError },
    { data: cultos, error: cultosError },
    { data: escalas, error: escalasError },
  ] = await Promise.all([
    supabaseAdmin
      .from("funcao")
      .select("id, nome_funcao, ministerio_id")
      .eq("ministerio_id", ministerio.id),
    supabaseAdmin
      .from("membros")
      .select("id, nome"),
    supabaseAdmin
      .from("membros_ministerios")
      .select("membro_id, ativo")
      .eq("ministerio_id", ministerio.id),
    supabaseAdmin
      .from("nome_cultos")
      .select("id, nome_culto, created_at"),
    supabaseAdmin
      .from("cultos")
      .select("id, data_culto, horario, id_nome_cultos"),
    supabaseAdmin
      .from("escalas")
      .select("id_culto")
      .eq("ministerio_id", ministerio.id),
  ]);

  if (funcoesError) throw funcoesError;
  if (membrosError) throw membrosError;
  if (membrosMinisteriosError) throw membrosMinisteriosError;
  if (nomeCultosError) throw nomeCultosError;
  if (cultosError) throw cultosError;
  if (escalasError) throw escalasError;

  return {
    funcoes: (funcoes ?? []) as FuncaoRecord[],
    membros: (membros ?? []) as MembroRecord[],
    membrosMinisterios: (membrosMinisterios ?? []) as MembroMinisterioRecord[],
    nomeCultos: (nomeCultos ?? []) as NomeCultoRecord[],
    cultos: (cultos ?? []) as CultoRecord[],
    escalas: (escalas ?? []) as EscalaRecord[],
  };
}

async function resolveMinisterio(
  supabaseAdmin: SupabaseClient,
  request: ImportRequest,
) {
  const ministerioId = ensureString(request.ministerio_id);
  const ministerioSlug = ensureString(request.ministerio_slug);

  if (!ministerioId && !ministerioSlug) {
    throw new Error(
      'Informe "ministerio_id" ou "ministerio_slug" no payload da importação.',
    );
  }

  let query = supabaseAdmin
    .from("ministerios")
    .select("id, nome, slug, ativo");

  if (ministerioId) {
    query = query.eq("id", ministerioId);
  } else {
    query = query.ilike("slug", ministerioSlug);
  }

  const { data, error } = await query.limit(2);

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("Ministério não encontrado.");
  }

  if (data.length > 1) {
    throw new Error("Mais de um ministério encontrado para este filtro.");
  }

  const ministerio = data[0] as MinisterioRecord;

  if (ministerio.ativo === false) {
    throw new Error("O ministério informado está inativo.");
  }

  return ministerio;
}

function resolveCultoCandidate(
  candidates: CultoRecord[],
  ministryCultIds: Set<string>,
  nomeCultoMap: Map<string, NomeCultoRecord>,
  targetNameNormalized: string,
) {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 1. Prefer one that already has scales for this ministry
  const withMinistryScales = candidates.filter((candidate) =>
    ministryCultIds.has(candidate.id)
  );
  if (withMinistryScales.length === 1) return withMinistryScales[0];

  // 2. Then prefer one that matches the target name exactly (normalized)
  const sameNameCandidates = candidates.filter((candidate) => {
    const currentName = candidate.id_nome_cultos
      ? nomeCultoMap.get(candidate.id_nome_cultos)?.nome_culto ?? ""
      : "";
    return normalizeKey(currentName) === targetNameNormalized;
  });
  if (sameNameCandidates.length === 1) return sameNameCandidates[0];

  // 3. If still ambiguous, prefer ministry scales if any, or just the first one
  return withMinistryScales[0] || sameNameCandidates[0] || candidates[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, message: "Use POST para importar escalas." },
      405,
    );
  }

  const expectedSecret = Deno.env.get("GOOGLE_SHEETS_IMPORT_SECRET");
  if (!expectedSecret) {
    return jsonResponse(
      {
        success: false,
        message:
          'A secret "GOOGLE_SHEETS_IMPORT_SECRET" não está configurada na Edge Function.',
      },
      500,
    );
  }

  const receivedSecret = req.headers.get(SECRET_HEADER)?.trim();
  if (!receivedSecret || receivedSecret !== expectedSecret) {
    return jsonResponse(
      { success: false, message: "Acesso negado para importação." },
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { success: false, message: "Credenciais internas do Supabase ausentes." },
      500,
    );
  }

  let requestBody: ImportRequest;

  try {
    requestBody = await req.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        issues: [
          {
            code: "INVALID_PAYLOAD",
            message: "O corpo da requisição precisa ser um JSON válido.",
          },
        ],
      },
      400,
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const ministerio = await resolveMinisterio(supabaseAdmin, requestBody);
    const issues: ImportIssue[] = [];
    const dryRun = requestBody.dry_run === true;
    const replaceExisting = requestBody.replace_existing !== false;
    const skipEmptyEvents = requestBody.skip_empty_events === true;
    const inputEvents = Array.isArray(requestBody.eventos)
      ? requestBody.eventos
      : [];

    if (inputEvents.length === 0) {
      issues.push({
        code: "INVALID_PAYLOAD",
        message: "Nenhum evento foi enviado para importação.",
      });
      return jsonResponse(
        {
          success: false,
          dry_run: dryRun,
          ministerio,
          issues,
        },
        400,
      );
    }

    const loaded = await loadData(supabaseAdmin, ministerio);
    const memberAliases = Object.fromEntries(
      Object.entries(requestBody.member_aliases ?? {}).map(([key, value]) => [
        normalizeKey(key),
        value.trim(),
      ]),
    );
    const functionAliases = Object.fromEntries(
      Object.entries(requestBody.funcao_aliases ?? {}).map(([key, value]) => [
        normalizeKey(key),
        value.trim(),
      ]),
    );

    const memberMap = buildGroupedMap(
      loaded.membros,
      (item) => normalizeKey(item.nome),
    );
    const functionMap = buildGroupedMap(
      loaded.funcoes,
      (item) => normalizeKey(item.nome_funcao),
    );
    const nomeCultoGrouped = buildGroupedMap(
      loaded.nomeCultos,
      (item) => normalizeKey(item.nome_culto),
    );
    const nomeCultoById = new Map(
      loaded.nomeCultos.map((item) => [item.id, item]),
    );
    const cultoMap = buildGroupedMap(
      loaded.cultos,
      (item) => toCultoKey(item.data_culto, item.horario),
    );
    const ministryCultIds = new Set(loaded.escalas.map((item) => item.id_culto));
    const activeMemberships = new Set(
      loaded.membrosMinisterios
        .filter((item) => item.ativo !== false)
        .map((item) => item.membro_id),
    );

    const pendingCultNames = new Map<string, string>();
    const pendingCultos = new Map<string, PlannedCultoCreation>();
    const pendingCultoUpdates = new Map<string, PlannedCultoNameUpdate>();
    const plannedEvents: PlannedEvent[] = [];

    for (let index = 0; index < inputEvents.length; index += 1) {
      const inputEvent = inputEvents[index];
      const ref = ensureString(inputEvent.referencia, `Evento ${index + 1}`);
      const nomeCultoDisplay = ensureString(inputEvent.nome_culto);

      if (!nomeCultoDisplay) {
        // Silently skip rows without a cult name (common in placeholder rows)
        continue;
      }

      let dataCulto: string;
      let horarioCulto: string;
      let dataEnsaio: string | null = null;
      let horarioEnsaio: string | null = null;

      try {
        dataCulto = parseDateInput(ensureString(inputEvent.data_culto));
      } catch (error) {
        issues.push({
          code: "INVALID_DATE",
          message: error instanceof Error ? error.message : "Data inválida.",
          event_ref: ref,
        });
        continue;
      }

      try {
        horarioCulto = parseTimeInput(ensureString(inputEvent.horario));
      } catch (error) {
        issues.push({
          code: "INVALID_TIME",
          message: error instanceof Error
            ? error.message
            : "Horário do culto inválido.",
          event_ref: ref,
        });
        continue;
      }

      try {
        dataEnsaio = parseOptionalDate(inputEvent.data_ensaio);
      } catch (error) {
        issues.push({
          code: "INVALID_DATE",
          message: error instanceof Error
            ? `Data do ensaio inválida. ${error.message}`
            : "Data do ensaio inválida.",
          event_ref: ref,
        });
        continue;
      }

      try {
        horarioEnsaio = parseOptionalTime(inputEvent.horario_ensaio);
      } catch (error) {
        issues.push({
          code: "INVALID_TIME",
          message: error instanceof Error
            ? `Horário do ensaio inválido. ${error.message}`
            : "Horário do ensaio inválido.",
          event_ref: ref,
        });
        continue;
      }

      const assignmentsInput = Array.isArray(inputEvent.escalados)
        ? inputEvent.escalados
        : [];

      const assignments: PlannedAssignment[] = [];

      for (const assignment of assignmentsInput) {
        const rawMemberName = ensureString(assignment.membro_nome);
        const rawFunctionName = ensureString(assignment.funcao_nome);

        if (!rawMemberName || !rawFunctionName) continue;

        const resolvedMemberLookup = memberAliases[normalizeKey(rawMemberName)] ??
          rawMemberName;
        const resolvedFunctionLookup =
          functionAliases[normalizeKey(rawFunctionName)] ?? rawFunctionName;

        const member = resolveSingleRecord(
          memberMap.get(normalizeKey(resolvedMemberLookup)),
          "Membro",
          "MEMBER_NOT_FOUND",
          "MEMBER_AMBIGUOUS",
          resolvedMemberLookup,
          ref,
          issues,
        );

        if (!member) continue;

        if (!activeMemberships.has(member.id)) {
          issues.push({
            code: "MEMBER_NOT_ACTIVE_IN_MINISTRY",
            message:
              `Membro "${member.nome}" não está ativo no ministério ${ministerio.nome}.`,
            event_ref: ref,
            context: { member_id: member.id, ministerio_id: ministerio.id },
          });
          continue;
        }

        const funcao = resolveSingleRecord(
          functionMap.get(normalizeKey(resolvedFunctionLookup)),
          "Função",
          "FUNCTION_NOT_FOUND",
          "FUNCTION_AMBIGUOUS",
          resolvedFunctionLookup,
          ref,
          issues,
        );

        if (!funcao) continue;

        assignments.push({
          id_membros: member.id,
          id_funcao: funcao.id,
          membro_nome: member.nome,
          funcao_nome: funcao.nome_funcao,
        });
      }

      const dedupedAssignments = dedupeAssignments(assignments);

      if (skipEmptyEvents && dedupedAssignments.length === 0) {
        continue;
      }

      const nomeCultoNormalized = normalizeKey(nomeCultoDisplay);
      const cultoKey = toCultoKey(dataCulto, horarioCulto);
      const matchingCultos = cultoMap.get(cultoKey) ?? [];
      let existingCultoId: string | undefined;

      if (matchingCultos.length > 0) {
        const resolvedCulto = resolveCultoCandidate(
          matchingCultos,
          ministryCultIds,
          nomeCultoById,
          nomeCultoNormalized,
        );

        existingCultoId = resolvedCulto!.id;

        const currentCultName = resolvedCulto!.id_nome_cultos
          ? nomeCultoById.get(resolvedCulto!.id_nome_cultos)?.nome_culto ?? ""
          : "";

        if (normalizeKey(currentCultName) !== nomeCultoNormalized) {
          // Proactive update: planning to update the cult name if it changed
          pendingCultoUpdates.set(existingCultoId, {
            culto_id: existingCultoId,
            nome_culto_normalized: nomeCultoNormalized,
            nome_culto_display: nomeCultoDisplay,
          });
        }
      } else if (!pendingCultos.has(cultoKey)) {
        pendingCultos.set(cultoKey, {
          key: cultoKey,
          data_culto: dataCulto,
          horario: horarioCulto,
          nome_culto_normalized: nomeCultoNormalized,
          nome_culto_display: nomeCultoDisplay,
        });
      }

      if (
        !nomeCultoGrouped.has(nomeCultoNormalized) &&
        !pendingCultNames.has(nomeCultoNormalized)
      ) {
        pendingCultNames.set(nomeCultoNormalized, nomeCultoDisplay);
      }

      plannedEvents.push({
        ref,
        key: cultoKey,
        data_culto: dataCulto,
        horario: horarioCulto,
        nome_culto_display: nomeCultoDisplay,
        nome_culto_normalized: nomeCultoNormalized,
        data_ensaio: dataEnsaio,
        horario_ensaio: horarioEnsaio,
        assignments: dedupedAssignments,
        existing_culto_id: existingCultoId,
      });
    }

    if (issues.length > 0) {
      const hasCriticalIssue = issues.some((issue) =>
        issue.code === "INVALID_PAYLOAD" || 
        issue.code === "INVALID_DATE" || 
        issue.code === "INVALID_TIME"
      );
      
      if (hasCriticalIssue) {
        const response: SummaryResponse = {
          success: false,
          dry_run: dryRun,
          ministerio: {
            id: ministerio.id,
            nome: ministerio.nome,
            slug: ministerio.slug,
          },
          source: requestBody.source,
          stats: {
            eventos_recebidos: inputEvents.length,
            eventos_processados: 0,
            nomes_culto_criados: pendingCultNames.size,
            cultos_criados: pendingCultos.size,
            cultos_atualizados: pendingCultoUpdates.size,
            escalas_inseridas: 0,
          },
          issues,
          events: [],
        };

        return jsonResponse(response, 400);
      }
    }

    const eventResults: EventResult[] = [];
    let createdCultNamesCount = 0;
    let createdCultosCount = 0;
    let updatedCultosCount = 0;
    let insertedScalesCount = 0;

    const nomeCultoIdByNormalized = new Map<string, string>();
    for (const [normalized, records] of nomeCultoGrouped.entries()) {
      nomeCultoIdByNormalized.set(normalized, records[0].id);
    }

    const cultoIdByKey = new Map<string, string>();

    if (!dryRun) {
      for (const [normalized, displayName] of pendingCultNames.entries()) {
        const { data, error } = await supabaseAdmin
          .from("nome_cultos")
          .insert({ nome_culto: displayName })
          .select("id, nome_culto, created_at")
          .single();

        if (error) throw error;

        const inserted = data as NomeCultoRecord;
        nomeCultoIdByNormalized.set(normalized, inserted.id);
        nomeCultoById.set(inserted.id, inserted);
        createdCultNamesCount += 1;
      }

      for (const plannedCulto of pendingCultos.values()) {
        const nomeCultoId = nomeCultoIdByNormalized.get(
          plannedCulto.nome_culto_normalized,
        );

        if (!nomeCultoId) {
          throw new Error(
            `Nome do culto "${plannedCulto.nome_culto_display}" não pôde ser resolvido.`,
          );
        }

        const { data, error } = await supabaseAdmin
          .from("cultos")
          .insert({
            data_culto: plannedCulto.data_culto,
            horario: plannedCulto.horario,
            id_nome_cultos: nomeCultoId,
          })
          .select("id, data_culto, horario, id_nome_cultos")
          .single();

        if (error) throw error;

        const inserted = data as CultoRecord;
        cultoIdByKey.set(plannedCulto.key, inserted.id);
        createdCultosCount += 1;
      }

      for (const update of pendingCultoUpdates.values()) {
        const nomeCultoId = nomeCultoIdByNormalized.get(
          update.nome_culto_normalized,
        );

        if (!nomeCultoId) {
          throw new Error(
            `Nome do culto "${update.nome_culto_display}" não pôde ser resolvido.`,
          );
        }

        const { error } = await supabaseAdmin
          .from("cultos")
          .update({ id_nome_cultos: nomeCultoId })
          .eq("id", update.culto_id);

        if (error) throw error;
        updatedCultosCount += 1;
      }
    }

    for (const plannedEvent of plannedEvents) {
      let cultoId = plannedEvent.existing_culto_id ??
        cultoIdByKey.get(plannedEvent.key);

      if (!cultoId && dryRun && !plannedEvent.existing_culto_id) {
        cultoId = `dry-run:${plannedEvent.key}`;
      }

      if (!cultoId) {
        throw new Error(
          `Culto não resolvido para ${plannedEvent.ref} em ${plannedEvent.data_culto} ${plannedEvent.horario}.`,
        );
      }

      let action: EventResult["action"] = "reused";

      if (!plannedEvent.existing_culto_id) {
        action = "created";
      } else if (pendingCultoUpdates.has(plannedEvent.existing_culto_id)) {
        action = "updated";
      }

      if (!dryRun && replaceExisting) {
        const { error } = await supabaseAdmin
          .from("escalas")
          .delete()
          .eq("id_culto", cultoId)
          .eq("ministerio_id", ministerio.id);

        if (error) throw error;
      }

      if (!dryRun && plannedEvent.assignments.length > 0) {
        const rows = plannedEvent.assignments.map((assignment) => ({
          id_culto: cultoId,
          id_membros: assignment.id_membros,
          id_funcao: assignment.id_funcao,
          ministerio_id: ministerio.id,
          data_ensaio: plannedEvent.data_ensaio,
          horario_ensaio: plannedEvent.horario_ensaio,
        }));

        const { error } = await supabaseAdmin
          .from("escalas")
          .insert(rows);

        if (error) throw error;
        insertedScalesCount += rows.length;
      } else if (dryRun) {
        insertedScalesCount += plannedEvent.assignments.length;
      }

      eventResults.push({
        ref: plannedEvent.ref,
        data_culto: plannedEvent.data_culto,
        horario: plannedEvent.horario,
        nome_culto: plannedEvent.nome_culto_display,
        culto_id: cultoId,
        action,
        imported_scales: plannedEvent.assignments.length,
      });
    }

    const response: SummaryResponse = {
      success: true,
      dry_run: dryRun,
      ministerio: {
        id: ministerio.id,
        nome: ministerio.nome,
        slug: ministerio.slug,
      },
      source: requestBody.source,
      stats: {
        eventos_recebidos: inputEvents.length,
        eventos_processados: plannedEvents.length,
        nomes_culto_criados: dryRun ? pendingCultNames.size : createdCultNamesCount,
        cultos_criados: dryRun ? pendingCultos.size : createdCultosCount,
        cultos_atualizados: dryRun
          ? pendingCultoUpdates.size
          : updatedCultosCount,
        escalas_inseridas: insertedScalesCount,
      },
      issues,
      events: eventResults,
    };

    return jsonResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return jsonResponse(
      {
        success: false,
        message,
      },
      500,
    );
  }
});
