export interface WeeklyScaleItem {
  ministerioId: string | null;
  idCulto: string;
  culto: string;
  data: string;
  horario: string;
  funcoes: string[];
}

export interface WeekBounds {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
}

interface BuildWeeklyScaleItemsParams {
  userId: string;
  escalas: any[];
  cultos: any[];
  nomeCultos: any[];
  funcoes: any[];
  ministerioId?: string | null;
}

const pad = (value: number) => value.toString().padStart(2, '0');

export const formatDateOnly = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseDateOnly = (dateString?: string | null) => {
  if (!dateString) {
    return null;
  }

  const normalizedDate = dateString.split('T')[0];
  const parsedDate = new Date(`${normalizedDate}T12:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const getWeekBoundsMondayToSunday = (referenceDate = new Date()): WeekBounds => {
  const safeReference = new Date(referenceDate);
  safeReference.setHours(12, 0, 0, 0);

  const dayOfWeek = safeReference.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(safeReference);
  start.setDate(safeReference.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end)
  };
};

export const buildWeeklyScaleItems = ({
  userId,
  escalas,
  cultos,
  nomeCultos,
  funcoes,
  ministerioId
}: BuildWeeklyScaleItemsParams): WeeklyScaleItem[] => {
  if (!userId) {
    return [];
  }

  const weekBounds = getWeekBoundsMondayToSunday();
  const cultosById = new Map((cultos || []).map((culto: any) => [culto.id, culto]));
  const nomeCultosById = new Map((nomeCultos || []).map((item: any) => [item.id, item]));
  const funcoesById = new Map((funcoes || []).map((funcao: any) => [String(funcao.id), funcao]));
  const groupedByCulto = new Map<string, WeeklyScaleItem>();

  (escalas || []).forEach((escala: any) => {
    if (escala.id_membros !== userId) {
      return;
    }

    if (ministerioId && escala.ministerio_id !== ministerioId) {
      return;
    }

    const culto = cultosById.get(escala.id_culto);
    const cultoDate = parseDateOnly(culto?.data_culto);

    if (!culto || !cultoDate || cultoDate < weekBounds.start || cultoDate > weekBounds.end) {
      return;
    }

    const funcao = funcoesById.get(String(escala.id_funcao));
    const nomeCulto = nomeCultosById.get(culto.id_nome_cultos);
    const resolvedMinisterioId = escala.ministerio_id || funcao?.ministerio_id || null;
    const groupKey = `${resolvedMinisterioId || 'sem-ministerio'}:${escala.id_culto}`;

    if (!groupedByCulto.has(groupKey)) {
      groupedByCulto.set(groupKey, {
        ministerioId: resolvedMinisterioId,
        idCulto: escala.id_culto,
        culto: nomeCulto?.nome_culto || 'Culto',
        data: culto.data_culto?.split('T')[0] || '',
        horario: culto.horario || '',
        funcoes: []
      });
    }

    const targetGroup = groupedByCulto.get(groupKey);
    const funcaoNome = funcao?.nome_funcao;

    if (targetGroup && funcaoNome && !targetGroup.funcoes.includes(funcaoNome)) {
      targetGroup.funcoes.push(funcaoNome);
    }
  });

  return Array.from(groupedByCulto.values())
    .map((item) => ({
      ...item,
      funcoes: [...item.funcoes].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    }))
    .sort((a, b) => {
      const dateCompare = a.data.localeCompare(b.data);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return (a.horario || '').localeCompare(b.horario || '');
    });
};

export const getWeeklyScaleCountsByMinisterio = (items: WeeklyScaleItem[]) =>
  items.reduce<Record<string, number>>((accumulator, item) => {
    if (!item.ministerioId) {
      return accumulator;
    }

    accumulator[item.ministerioId] = (accumulator[item.ministerioId] || 0) + 1;
    return accumulator;
  }, {});
