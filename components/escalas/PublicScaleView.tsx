import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import PublicScaleService, { PUBLIC_SCALE_MEMBER_FIELDS, PublicScaleRow } from '../../services/PublicScaleService';
import { getDisplayName } from '../../utils/displayName';
import { showError, showSuccess } from '../../utils/toast';
import { showConfirmModal } from '../../utils/confirmModal';

interface PublicScaleViewProps {
  publicMode?: boolean;
}

const memberFieldLabels: Record<string, string> = {
  ministro_1: 'Ministro',
  ministro_2: 'Ministro',
  back_1: 'Back',
  back_2: 'Back',
  back_3: 'Back',
  violao: 'Violao',
  teclado: 'Teclado',
  guitarra: 'Guitarra',
  baixo: 'Baixo',
  bateria: 'Bateria'
};

const cultoOptions = ['Passos de Fe', 'Rede de Jovens', 'Culto Melhor Idade', 'Celebracao', 'Mulheres', 'Homens', 'Vigilia'];

const formatDate = (value?: string | null) => {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const normalizeRow = (row: PublicScaleRow): PublicScaleRow => ({
  ...row,
  horario: row.horario ? String(row.horario).slice(0, 5) : '',
  horario_ensaio: row.horario_ensaio ? String(row.horario_ensaio).slice(0, 5) : '',
  data: row.data ? String(row.data).slice(0, 10) : '',
  data_ensaio: row.data_ensaio ? String(row.data_ensaio).slice(0, 10) : ''
});

const rowsSignature = (rows: PublicScaleRow[]) =>
  rows.map((row) => `${row.id}:${row.updated_at || ''}:${row.data}:${row.horario}`).join('|');

const PublicScaleView: React.FC<PublicScaleViewProps> = ({ publicMode = false }) => {
  const ministry = publicMode ? null : useMinistryContext();
  const activeMinisterioId = ministry?.activeMinisterioId || null;
  const canEdit = !publicMode && Boolean(ministry?.canManageCurrentMinisterio);
  const { data: rowsRaw, forceSync } = useLocalStorageFirst<PublicScaleRow>({ table: 'escala_publica' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: membrosMinisteriosRaw } = useLocalStorageFirst<any>({ table: 'membros_ministerios' });
  const [publicRows, setPublicRows] = useState<PublicScaleRow[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(publicMode);

  useEffect(() => {
    if (!publicMode) return;

    let isMounted = true;
    setLoadingPublic(true);
    PublicScaleService.getPublicRows()
      .then((rows) => {
        if (isMounted) setPublicRows(rows.map(normalizeRow));
      })
      .catch(() => {
        if (isMounted) setPublicRows([]);
      })
      .finally(() => {
        if (isMounted) setLoadingPublic(false);
      });

    return () => {
      isMounted = false;
    };
  }, [publicMode]);

  const memberOptions = useMemo(() => {
    const activeMemberIds = new Set(
      (membrosMinisteriosRaw || [])
        .filter((membership: any) => (!activeMinisterioId || membership.ministerio_id === activeMinisterioId) && membership.ativo !== false)
        .map((membership: any) => membership.membro_id)
    );

    return (membrosRaw || [])
      .filter((member: any) => member.ativo === true && (!activeMinisterioId || activeMemberIds.has(member.id)))
      .map((member: any) => getDisplayName(member))
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));
  }, [activeMinisterioId, membrosMinisteriosRaw, membrosRaw]);

  const rows = useMemo(() => {
    const source = publicMode
      ? publicRows
      : rowsRaw.filter((row) => !activeMinisterioId || !row.ministerio_id || row.ministerio_id === activeMinisterioId);
    return source.map(normalizeRow);
  }, [activeMinisterioId, publicMode, publicRows, rowsSignature(rowsRaw)]);

  const updateRow = async (row: PublicScaleRow, updates: Partial<PublicScaleRow>) => {
    if (!canEdit) return;

    try {
      PublicScaleService.saveRow({ ...row, ...updates });
      showSuccess('Linha salva.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel salvar a linha.');
    }
  };

  const addRow = async () => {
    if (!canEdit) return;

    try {
      PublicScaleService.addRow(PublicScaleService.createSuggestedRow(rows, activeMinisterioId));
      showSuccess('Linha adicionada.');
      await forceSync();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel adicionar a linha.');
    }
  };

  const deleteRow = async (row: PublicScaleRow) => {
    if (!canEdit) return;

    const confirmed = await showConfirmModal({
      title: 'Remover linha',
      message: 'Esta linha sera removida da escala publica.',
      confirmText: 'Remover',
      cancelText: 'Manter',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) return;
    PublicScaleService.deleteRow(row.id);
    await forceSync();
  };

  const renderInput = (row: PublicScaleRow, field: keyof PublicScaleRow, type = 'text') => (
    <input
      type={type}
      defaultValue={String(row[field] || '')}
      disabled={!canEdit}
      onBlur={(event) => updateRow(row, { [field]: event.target.value } as Partial<PublicScaleRow>)}
      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none disabled:border-transparent disabled:bg-transparent disabled:px-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-transparent"
    />
  );

  const renderSelect = (row: PublicScaleRow, field: keyof PublicScaleRow, options: string[], placeholder = '') => {
    if (!canEdit) {
      return <span className="block min-h-8 text-xs font-bold text-slate-700 dark:text-slate-100">{String(row[field] || '')}</span>;
    }

    return (
    <select
      value={String(row[field] || '')}
      onChange={(event) => updateRow(row, { [field]: event.target.value } as Partial<PublicScaleRow>)}
      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none disabled:border-transparent disabled:bg-transparent disabled:px-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-transparent"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    );
  };

  if (loadingPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
        Carregando escala...
      </div>
    );
  }

  return (
    <div className={publicMode ? 'min-h-screen bg-slate-50 p-4 dark:bg-slate-900' : ''}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">
              {publicMode ? 'Escala publica' : ministry?.activeMinisterio?.nome || 'Ministerio'}
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Planilha de escala
            </h1>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <a
                href="/escala-publica"
                target="_blank"
                className="rounded-xl bg-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <i className="fas fa-external-link-alt mr-2"></i>
                Link publico
              </a>
              <button
                onClick={addRow}
                className="rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
              >
                <i className="fas fa-plus mr-2"></i>
                Adicionar linha
              </button>
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:block">
          <table className="min-w-[1450px] w-full border-collapse text-left">
            <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                {['Data', 'Dia', 'Horario', 'Culto', ...PUBLIC_SCALE_MEMBER_FIELDS.map((field) => memberFieldLabels[field]), 'Ensaio', 'Horario ensaio', ''].map((label, index) => (
                  <th key={`${label}-${index}`} className="border-b border-slate-200 px-3 py-3 dark:border-slate-700">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-3 py-2">{canEdit ? renderInput(row, 'data', 'date') : <span className="text-xs font-bold">{formatDate(row.data)}</span>}</td>
                  <td className="px-3 py-2">{renderInput(row, 'dia_semana')}</td>
                  <td className="px-3 py-2">{renderInput(row, 'horario', 'time')}</td>
                  <td className="px-3 py-2">{renderSelect(row, 'culto', cultoOptions, 'Culto')}</td>
                  {PUBLIC_SCALE_MEMBER_FIELDS.map((field) => (
                    <td key={field} className="px-3 py-2">
                      {renderSelect(row, field, memberOptions, '')}
                    </td>
                  ))}
                  <td className="px-3 py-2">{canEdit ? renderInput(row, 'data_ensaio', 'date') : <span className="text-xs font-bold">{formatDate(row.data_ensaio)}</span>}</td>
                  <td className="px-3 py-2">{renderInput(row, 'horario_ensaio', 'time')}</td>
                  <td className="px-3 py-2">
                    {canEdit && (
                      <button onClick={() => deleteRow(row)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 dark:bg-red-950/30">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 lg:hidden">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand">{row.dia_semana} - {formatDate(row.data)}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{row.culto || 'Culto'}</h3>
                  <p className="text-xs font-bold text-slate-500">{row.horario}</p>
                </div>
                {canEdit && (
                  <button onClick={() => deleteRow(row)} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 dark:bg-red-950/30">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {canEdit && (
                  <>
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Data</p>
                      {renderInput(row, 'data', 'date')}
                    </div>
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Dia</p>
                      {renderInput(row, 'dia_semana')}
                    </div>
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Horario</p>
                      {renderInput(row, 'horario', 'time')}
                    </div>
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Culto</p>
                      {renderSelect(row, 'culto', cultoOptions, 'Culto')}
                    </div>
                  </>
                )}
                {PUBLIC_SCALE_MEMBER_FIELDS.map((field) => (
                  <div key={field}>
                    <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{memberFieldLabels[field]}</p>
                    {renderSelect(row, field, memberOptions, '')}
                  </div>
                ))}
                <div>
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Ensaio</p>
                  {canEdit ? renderInput(row, 'data_ensaio', 'date') : <p className="text-xs font-bold">{formatDate(row.data_ensaio)}</p>}
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Horario</p>
                  {renderInput(row, 'horario_ensaio', 'time')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            Nenhuma linha cadastrada.
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicScaleView;
