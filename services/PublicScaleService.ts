import { supabase } from '../supabaseClient';
import LocalStorageFirstService from './LocalStorageFirstService';

export interface PublicScaleRow {
  id: string;
  ministerio_id?: string | null;
  data: string;
  dia_semana: string;
  horario: string;
  culto: string;
  ministro_1?: string | null;
  ministro_2?: string | null;
  back_1?: string | null;
  back_2?: string | null;
  back_3?: string | null;
  violao?: string | null;
  teclado?: string | null;
  guitarra?: string | null;
  baixo?: string | null;
  bateria?: string | null;
  data_ensaio?: string | null;
  horario_ensaio?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const PUBLIC_SCALE_MEMBER_FIELDS: Array<keyof PublicScaleRow> = [
  'ministro_1',
  'ministro_2',
  'back_1',
  'back_2',
  'back_3',
  'violao',
  'teclado',
  'guitarra',
  'baixo',
  'bateria'
];

const dayLabels = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sab.'];

const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const getLocalDate = (dateString: string) => new Date(`${dateString}T12:00:00`);

const getNextWeekday = (from: Date, weekday: number) => {
  const next = new Date(from);
  const diff = (weekday - next.getDay() + 7) % 7 || 7;
  next.setDate(next.getDate() + diff);
  return next;
};

const setSuggestedFields = (date: Date) => {
  const weekday = date.getDay();

  if (weekday === 4) {
    return { dia_semana: 'qui.', horario: '19:00', culto: 'Passos de Fe' };
  }

  if (weekday === 5) {
    return { dia_semana: 'sex.', horario: '19:00', culto: '' };
  }

  if (weekday === 6) {
    return { dia_semana: 'sab.', horario: '19:00', culto: 'Rede de Jovens' };
  }

  return date.getHours() < 12
    ? { dia_semana: 'dom.', horario: '07:00', culto: 'Culto Melhor Idade' }
    : { dia_semana: 'dom.', horario: '17:30', culto: 'Celebracao' };
};

const nullableFields: Array<keyof PublicScaleRow> = [
  'ministro_1',
  'ministro_2',
  'back_1',
  'back_2',
  'back_3',
  'violao',
  'teclado',
  'guitarra',
  'baixo',
  'bateria',
  'data_ensaio',
  'horario_ensaio'
];

class PublicScaleService {
  static sanitizeRow(row: Partial<PublicScaleRow>): Partial<PublicScaleRow> {
    const sanitized = { ...row };

    nullableFields.forEach((field) => {
      if (sanitized[field] === '') {
        sanitized[field] = null as never;
      }
    });

    if (sanitized.horario) {
      sanitized.horario = String(sanitized.horario).slice(0, 5);
    }

    if (sanitized.horario_ensaio) {
      sanitized.horario_ensaio = String(sanitized.horario_ensaio).slice(0, 5);
    }

    return sanitized;
  }

  static getRows(ministerioId?: string | null): PublicScaleRow[] {
    return LocalStorageFirstService.get<PublicScaleRow>('escala_publica')
      .filter((row) => !ministerioId || !row.ministerio_id || row.ministerio_id === ministerioId)
      .sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`));
  }

  static async getPublicRows(): Promise<PublicScaleRow[]> {
    const { data, error } = await supabase
      .from('escala_publica')
      .select('*')
      .order('data', { ascending: true })
      .order('horario', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []) as PublicScaleRow[];
  }

  static createSuggestedRow(rows: PublicScaleRow[], ministerioId?: string | null): Omit<PublicScaleRow, 'id'> {
    const lastRow = [...rows].sort((a, b) => `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`)).at(-1);
    let nextDate: Date;
    let nextTimeHint = '';

    if (!lastRow?.data) {
      nextDate = getNextWeekday(new Date(), 4);
    } else {
      const lastDate = getLocalDate(lastRow.data);
      const lastDay = lastDate.getDay();
      const lastTime = lastRow.horario || '';

      if (lastDay === 4) {
        nextDate = getNextWeekday(lastDate, 5);
      } else if (lastDay === 5) {
        nextDate = getNextWeekday(lastDate, 6);
      } else if (lastDay === 6) {
        nextDate = getNextWeekday(lastDate, 0);
        nextTimeHint = '07:00';
      } else if (lastDay === 0 && lastTime < '12:00') {
        nextDate = new Date(lastDate);
        nextTimeHint = '17:30';
      } else {
        nextDate = getNextWeekday(lastDate, 4);
      }
    }

    if (nextTimeHint === '17:30') {
      nextDate.setHours(17, 30, 0, 0);
    } else if (nextTimeHint === '07:00') {
      nextDate.setHours(7, 0, 0, 0);
    }

    const suggested = setSuggestedFields(nextDate);

    return {
      ministerio_id: ministerioId || null,
      data: formatIsoDate(nextDate),
      ...suggested,
      data_ensaio: null,
      horario_ensaio: '19:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  static saveRow(row: PublicScaleRow): PublicScaleRow {
    const payload = this.prepareRowForSave(row);

    return LocalStorageFirstService.update<PublicScaleRow>('escala_publica', row.id, payload) || payload;
  }

  static prepareRowForSave(row: PublicScaleRow): PublicScaleRow {
    return this.sanitizeRow({
      ...row,
      dia_semana: row.dia_semana || dayLabels[getLocalDate(row.data).getDay()] || '',
      updated_at: new Date().toISOString()
    }) as PublicScaleRow;
  }

  static addRow(row: Omit<PublicScaleRow, 'id'>): PublicScaleRow {
    return LocalStorageFirstService.add<PublicScaleRow>('escala_publica', this.sanitizeRow(row) as PublicScaleRow);
  }

  static deleteRow(id: string): void {
    LocalStorageFirstService.remove('escala_publica', id);
  }
}

export default PublicScaleService;
