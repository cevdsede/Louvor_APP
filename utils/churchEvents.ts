import { SupabaseEventoIgreja } from '../types-supabase';

export interface ChurchEventOccurrence {
  id: string;
  eventId: string;
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  imagem_url?: string | null;
  categoria?: string | null;
  cor?: string | null;
  startsAt: string;
  endsAt?: string | null;
  prioridade: number;
  substitui_eventos_menor_prioridade: boolean;
  source: SupabaseEventoIgreja;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const combineDateAndTime = (date: Date, source: Date) => {
  const next = new Date(date);
  // Preservar o horário exato do source sem conversões de timezone
  const hours = source.getHours();
  const minutes = source.getMinutes();
  const seconds = source.getSeconds();
  const milliseconds = source.getMilliseconds();
  next.setHours(hours, minutes, seconds, milliseconds);
  return next;
};

const getDurationMs = (event: SupabaseEventoIgreja) => {
  if (!event.data_fim) return 0;
  return Math.max(0, new Date(event.data_fim).getTime() - new Date(event.data_inicio).getTime());
};

const buildOccurrence = (event: SupabaseEventoIgreja, startsAt: Date): ChurchEventOccurrence => {
  const durationMs = getDurationMs(event);
  const endsAt = durationMs > 0 ? new Date(startsAt.getTime() + durationMs) : null;
  
  // Preservar o horário exato do campo horario_inicio ou data_inicio
  const finalDate = new Date(startsAt);
  
  // Usar o horário do horario_inicio se disponível, senão do data_inicio
  let hours = 19, minutes = 0;
  if (event.horario_inicio) {
    const timeParts = event.horario_inicio.split(':');
    hours = parseInt(timeParts[0], 10);
    minutes = parseInt(timeParts[1], 10);
  } else {
    const eventDate = new Date(event.data_inicio);
    hours = eventDate.getHours();
    minutes = eventDate.getMinutes();
  }
  
  finalDate.setHours(hours, minutes, 0, 0);

  return {
    id: `${event.id}:${finalDate.toISOString()}`,
    eventId: event.id,
    titulo: event.titulo,
    descricao: event.descricao,
    local: event.local,
    imagem_url: event.imagem_url,
    categoria: event.categoria,
    cor: event.cor,
    startsAt: finalDate.toISOString(),
    endsAt: endsAt?.toISOString() || null,
    prioridade: event.prioridade || 0,
    substitui_eventos_menor_prioridade: Boolean(event.substitui_eventos_menor_prioridade),
    source: event
  };
};

const isWithinRange = (date: Date, rangeStart: Date, rangeEnd: Date) =>
  date.getTime() >= rangeStart.getTime() && date.getTime() <= rangeEnd.getTime();

const getMonthlyOrdinalDate = (year: number, month: number, weekday: number, ordinal: number) => {
  const firstDay = new Date(year, month, 1);
  const offset = (weekday - firstDay.getDay() + 7) % 7;
  const target = new Date(year, month, 1 + offset + (ordinal - 1) * 7);
  return target.getMonth() === month ? target : null;
};

const generateRecurringOccurrences = (
  event: SupabaseEventoIgreja,
  rangeStart: Date,
  rangeEnd: Date
): ChurchEventOccurrence[] => {
  if (!event.recorrente || !event.recorrencia_tipo) return [];

  const eventStart = new Date(event.data_inicio);
  const recurrenceEnd = event.recorrencia_data_fim
    ? new Date(`${event.recorrencia_data_fim}T23:59:59`)
    : rangeEnd;
  const effectiveEnd = new Date(Math.min(rangeEnd.getTime(), recurrenceEnd.getTime()));
  const interval = Math.max(1, event.recorrencia_intervalo || 1);
  const occurrences: ChurchEventOccurrence[] = [];

  if (event.recorrencia_tipo === 'diaria') {
    const daysFromStart = Math.max(0, Math.floor((startOfDay(rangeStart).getTime() - startOfDay(eventStart).getTime()) / MS_PER_DAY));
    const firstOffset = daysFromStart % interval === 0 ? daysFromStart : daysFromStart + (interval - (daysFromStart % interval));

    for (let dayOffset = firstOffset; ; dayOffset += interval) {
      const date = combineDateAndTime(addDays(startOfDay(eventStart), dayOffset), eventStart);
      if (date > effectiveEnd) break;
      if (date >= eventStart && isWithinRange(date, rangeStart, effectiveEnd)) {
        occurrences.push(buildOccurrence(event, date));
      }
    }
  }

  if (event.recorrencia_tipo === 'semanal') {
    const weekdays = event.recorrencia_dias_semana?.length ? event.recorrencia_dias_semana : [eventStart.getDay()];
    const cursor = startOfDay(rangeStart);

    while (cursor <= effectiveEnd) {
      const weeksFromStart = Math.floor((cursor.getTime() - startOfDay(eventStart).getTime()) / (MS_PER_DAY * 7));
      if (weeksFromStart >= 0 && weeksFromStart % interval === 0 && weekdays.includes(cursor.getDay())) {
        const occurrenceStart = combineDateAndTime(cursor, eventStart);
        if (occurrenceStart >= eventStart && isWithinRange(occurrenceStart, rangeStart, effectiveEnd)) {
          occurrences.push(buildOccurrence(event, occurrenceStart));
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  }

  if (event.recorrencia_tipo === 'mensal_dia_mes') {
    const dayOfMonth = event.recorrencia_dia_mes || eventStart.getDate();
    let cursor = new Date(eventStart.getFullYear(), eventStart.getMonth(), 1);

    while (cursor <= effectiveEnd) {
      const monthsFromStart = (cursor.getFullYear() - eventStart.getFullYear()) * 12 + cursor.getMonth() - eventStart.getMonth();
      if (monthsFromStart >= 0 && monthsFromStart % interval === 0) {
        const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
        if (candidate.getMonth() === cursor.getMonth()) {
          const occurrenceStart = combineDateAndTime(candidate, eventStart);
          if (occurrenceStart >= eventStart && isWithinRange(occurrenceStart, rangeStart, effectiveEnd)) {
            occurrences.push(buildOccurrence(event, occurrenceStart));
          }
        }
      }

      cursor = addMonths(cursor, 1);
    }
  }

  if (event.recorrencia_tipo === 'mensal_ordem_semana') {
    const weekday = event.recorrencia_dias_semana?.[0] ?? eventStart.getDay();
    const ordinal = event.recorrencia_ordem_semana || 1;
    let cursor = new Date(eventStart.getFullYear(), eventStart.getMonth(), 1);

    while (cursor <= effectiveEnd) {
      const monthsFromStart = (cursor.getFullYear() - eventStart.getFullYear()) * 12 + cursor.getMonth() - eventStart.getMonth();
      if (monthsFromStart >= 0 && monthsFromStart % interval === 0) {
        const candidate = getMonthlyOrdinalDate(cursor.getFullYear(), cursor.getMonth(), weekday, ordinal);
        if (candidate) {
          const occurrenceStart = combineDateAndTime(candidate, eventStart);
          if (occurrenceStart >= eventStart && isWithinRange(occurrenceStart, rangeStart, effectiveEnd)) {
            occurrences.push(buildOccurrence(event, occurrenceStart));
          }
        }
      }

      cursor = addMonths(cursor, 1);
    }
  }

  return occurrences;
};

const applyPrioritySubstitution = (occurrences: ChurchEventOccurrence[]) => {
  const byDay = new Map<string, ChurchEventOccurrence[]>();

  occurrences.forEach((occurrence) => {
    const dayKey = occurrence.startsAt.slice(0, 10);
    byDay.set(dayKey, [...(byDay.get(dayKey) || []), occurrence]);
  });

  return [...byDay.values()]
    .flatMap((items) => {
      const replacers = items.filter((item) => item.substitui_eventos_menor_prioridade);
      if (replacers.length === 0) return items;

      const maxReplacementPriority = Math.max(...replacers.map((item) => item.prioridade));
      return items.filter(
        (item) => item.prioridade >= maxReplacementPriority || item.substitui_eventos_menor_prioridade
      );
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime() || b.prioridade - a.prioridade);
};

export const generateChurchEventOccurrences = (
  events: SupabaseEventoIgreja[],
  rangeStart: Date,
  rangeEnd: Date,
  options?: { dashboardOnly?: boolean; agendaOnly?: boolean }
): ChurchEventOccurrence[] => {
  const occurrences = events
    .filter((event) => event.ativo)
    .filter((event) => (options?.dashboardOnly ? event.visivel_dashboard : true))
    .filter((event) => (options?.agendaOnly ? event.visivel_agenda : true))
    .flatMap((event) => {
      if (!event.recorrente) {
        const startsAt = new Date(event.data_inicio);
        return isWithinRange(startsAt, rangeStart, rangeEnd) ? [buildOccurrence(event, startsAt)] : [];
      }

      return generateRecurringOccurrences(event, rangeStart, rangeEnd);
    });

  return applyPrioritySubstitution(occurrences);
};
