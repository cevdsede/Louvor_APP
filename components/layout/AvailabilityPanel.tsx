import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { showError, showSuccess } from '../../utils/toast';
import logger from '../../utils/logger';

interface AvailabilityItem {
  id: string;
  membro_id: string;
  data_inicio: string;
  data_fim: string;
  motivo: string | null;
  recorrencia: 'nenhuma' | 'semanal';
}

interface AvailabilityPanelProps {
  memberId: string | null;
}

const today = new Date().toISOString().split('T')[0];

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });

const AvailabilityPanel: React.FC<AvailabilityPanelProps> = ({ memberId }) => {
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data_inicio: today,
    data_fim: today,
    motivo: '',
    recorrencia: 'nenhuma' as 'nenhuma' | 'semanal'
  });

  const loadAvailability = async () => {
    if (!memberId || !navigator.onLine) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membros_indisponibilidades')
        .select('id, membro_id, data_inicio, data_fim, motivo, recorrencia')
        .eq('membro_id', memberId)
        .gte('data_fim', today)
        .order('data_inicio', { ascending: true });

      if (error) throw error;
      setItems((data || []) as AvailabilityItem[]);
    } catch (error) {
      logger.error('Erro ao carregar indisponibilidades', error, 'database');
      showError('Nao foi possivel carregar suas indisponibilidades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [memberId]);

  const handleSave = async () => {
    if (!memberId) {
      showError('Usuario nao encontrado.');
      return;
    }

    if (!navigator.onLine) {
      showError('Conecte-se a internet para salvar indisponibilidade.');
      return;
    }

    if (form.data_fim < form.data_inicio) {
      showError('A data final nao pode ser anterior a data inicial.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('membros_indisponibilidades')
        .insert({
          membro_id: memberId,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim,
          motivo: form.motivo.trim() || null,
          recorrencia: form.recorrencia
        });

      if (error) throw error;

      setForm({
        data_inicio: today,
        data_fim: today,
        motivo: '',
        recorrencia: 'nenhuma'
      });
      showSuccess('Indisponibilidade salva.');
      await loadAvailability();
    } catch (error) {
      logger.error('Erro ao salvar indisponibilidade', error, 'database');
      showError('Nao foi possivel salvar a indisponibilidade.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!navigator.onLine) {
      showError('Conecte-se a internet para remover indisponibilidade.');
      return;
    }

    try {
      const { error } = await supabase
        .from('membros_indisponibilidades')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems((current) => current.filter((item) => item.id !== id));
      showSuccess('Indisponibilidade removida.');
    } catch (error) {
      logger.error('Erro ao remover indisponibilidade', error, 'database');
      showError('Nao foi possivel remover a indisponibilidade.');
    }
  };

  return (
    <div className="bg-app-surface-muted border-app rounded-2xl border p-4">
      <div className="mb-4">
        <h4 className="text-app text-xs font-black uppercase tracking-widest">
          Minha disponibilidade
        </h4>
        <p className="text-app-muted mt-1 text-xs">
          Informe dias em que voce nao podera servir.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-app-muted mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest">Inicio</label>
          <input
            type="date"
            value={form.data_inicio}
            onChange={(event) => setForm((current) => ({ ...current, data_inicio: event.target.value }))}
            className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="text-app-muted mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest">Fim</label>
          <input
            type="date"
            value={form.data_fim}
            onChange={(event) => setForm((current) => ({ ...current, data_fim: event.target.value }))}
            className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-app-muted mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest">Motivo</label>
          <input
            type="text"
            value={form.motivo}
            onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
            placeholder="Ex.: viagem, trabalho, compromisso"
            className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={form.recorrencia}
            onChange={(event) => setForm((current) => ({ ...current, recorrencia: event.target.value as 'nenhuma' | 'semanal' }))}
            className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="nenhuma">Sem repeticao</option>
            <option value="semanal">Repete semanalmente</option>
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-brand px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="border-app text-app-muted rounded-xl border border-dashed px-4 py-3 text-xs">
            Carregando indisponibilidades...
          </p>
        ) : items.length === 0 ? (
          <p className="border-app text-app-muted rounded-xl border border-dashed px-4 py-3 text-xs">
            Nenhuma indisponibilidade futura cadastrada.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-app-surface border-app flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-app text-xs font-black">
                  {formatDate(item.data_inicio)} ate {formatDate(item.data_fim)}
                </p>
                <p className="text-app-muted mt-1 text-[11px]">
                  {item.motivo || 'Sem motivo informado'}
                  {item.recorrencia === 'semanal' ? ' - semanal' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="self-start rounded-lg bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 sm:self-center"
              >
                Remover
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AvailabilityPanel;
