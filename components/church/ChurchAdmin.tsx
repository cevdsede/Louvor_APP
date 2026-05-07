import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { SupabaseEventoIgreja, SupabaseMembro, SupabasePermissaoIgreja } from '../../types-supabase';
import { compressImageFile } from '../../utils/imageCompression';
import { getDisplayName } from '../../utils/displayName';
import { showError, showSuccess } from '../../utils/toast';

type EventForm = {
  titulo: string;
  descricao: string;
  local: string;
  data: string;
  horario: string;
  categoria: string;
  recorrente: boolean;
  recorrencia_tipo: string;
  recorrencia_dias_semana: number[];
  recorrencia_ordem_semana: number;
  prioridade: number;
  substitui_eventos_menor_prioridade: boolean;
  visivel_dashboard: boolean;
  visivel_agenda: boolean;
  imagem: File | null;
};

const INITIAL_FORM: EventForm = {
  titulo: '',
  descricao: '',
  local: '',
  data: '',
  horario: '19:30',
  categoria: 'Culto',
  recorrente: false,
  recorrencia_tipo: 'semanal',
  recorrencia_dias_semana: [0],
  recorrencia_ordem_semana: 1,
  prioridade: 0,
  substitui_eventos_menor_prioridade: false,
  visivel_dashboard: true,
  visivel_agenda: true,
  imagem: null
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const ChurchAdmin: React.FC<{ currentUserId?: string | null; isAdmin: boolean }> = ({ currentUserId, isAdmin }) => {
  const { data: eventsRaw } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const { data: permissionsRaw } = useLocalStorageFirst<SupabasePermissaoIgreja>({ table: 'permissoes_igreja' });
  const [form, setForm] = useState<EventForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');

  const managersByMemberId = useMemo(
    () => new Map((permissionsRaw || []).map((permission) => [permission.membro_id, permission])),
    [permissionsRaw]
  );
  const activeManagers = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.gerenciar_eventos_igreja)
        .map((permission) => ({
          permission,
          member: (membersRaw || []).find((member) => member.id === permission.membro_id)
        }))
        .filter((item): item is { permission: SupabasePermissaoIgreja; member: SupabaseMembro } => Boolean(item.member)),
    [membersRaw, permissionsRaw]
  );
  const availableManagers = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => member.ativo !== false)
        .filter((member) => !managersByMemberId.get(member.id)?.gerenciar_eventos_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(permissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, permissionSearch]
  );

  const uploadCardImage = async (eventId: string) => {
    if (!form.imagem) return null;

    const compressed = await compressImageFile(form.imagem, {
      maxWidth: 1400,
      maxHeight: 900,
      quality: 0.76
    });
    const filePath = `eventos-igreja/${eventId}.jpg`;
    const { error } = await supabase.storage.from('public-assets').upload(filePath, compressed, {
      cacheControl: '31536000',
      contentType: compressed.type,
      upsert: true
    });

    if (error) throw error;

    const {
      data: { publicUrl }
    } = supabase.storage.from('public-assets').getPublicUrl(filePath);
    return publicUrl;
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.titulo.trim() || !form.data) {
      showError('Informe titulo e data.');
      return;
    }

    setSaving(true);

    try {
      const startsAt = `${form.data}T${form.horario || '19:30'}:00`;
      const { data, error } = await supabase
        .from('eventos_igreja')
        .insert({
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim() || null,
          local: form.local.trim() || null,
          categoria: form.categoria.trim() || null,
          data_inicio: startsAt,
          horario_inicio: form.horario || null,
          recorrente: form.recorrente,
          recorrencia_tipo: form.recorrente ? form.recorrencia_tipo : null,
          recorrencia_intervalo: 1,
          recorrencia_dias_semana: form.recorrente ? form.recorrencia_dias_semana : null,
          recorrencia_ordem_semana:
            form.recorrente && form.recorrencia_tipo === 'mensal_ordem_semana'
              ? form.recorrencia_ordem_semana
              : null,
          prioridade: form.prioridade,
          substitui_eventos_menor_prioridade: form.substitui_eventos_menor_prioridade,
          visivel_dashboard: form.visivel_dashboard,
          visivel_agenda: form.visivel_agenda,
          created_by: currentUserId || null
        })
        .select('id')
        .single();

      if (error) throw error;

      const imageUrl = await uploadCardImage(data.id);
      if (imageUrl) {
        const { error: imageError } = await supabase
          .from('eventos_igreja')
          .update({ imagem_url: imageUrl })
          .eq('id', data.id);
        if (imageError) throw imageError;
      }

      await LocalStorageFirstService.forceSync('eventos_igreja');
      setForm(INITIAL_FORM);
      showSuccess('Evento salvo na agenda.');
    } catch (error) {
      console.error('Erro ao salvar evento da igreja:', error);
      showError('Erro ao salvar evento.');
    } finally {
      setSaving(false);
    }
  };

  const toggleManager = async (member: SupabaseMembro, allowed: boolean) => {
    if (!isAdmin) {
      showError('Somente admin define quem gerencia agenda e cards.');
      return;
    }

    const existing = managersByMemberId.get(member.id);
    const payload = { membro_id: member.id, gerenciar_eventos_igreja: allowed };
    const request = existing
      ? supabase.from('permissoes_igreja').update(payload).eq('id', existing.id)
      : supabase.from('permissoes_igreja').insert(payload);

    const { error } = await request;
    if (error) {
      showError('Erro ao atualizar permissao.');
      return;
    }

    await LocalStorageFirstService.forceSync('permissoes_igreja');
    if (allowed) {
      setIsPermissionModalOpen(false);
      setPermissionSearch('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Administracao</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Agenda e cards da igreja
        </h1>
      </div>

      <form onSubmit={saveEvent} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <input className={inputClass} placeholder="Titulo do evento/card" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <input className={inputClass} placeholder="Local" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
          <input type="date" className={inputClass} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          <input type="time" className={inputClass} value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          <textarea className={`${inputClass} md:col-span-2`} placeholder="Descricao" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <input type="file" accept="image/*" className={inputClass} onChange={(e) => setForm({ ...form, imagem: e.target.files?.[0] || null })} />
          <select className={inputClass} value={form.recorrencia_tipo} onChange={(e) => setForm({ ...form, recorrencia_tipo: e.target.value })}>
            <option value="semanal">Toda semana</option>
            <option value="mensal_ordem_semana">Todo primeiro/segundo domingo do mes</option>
          </select>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          <Toggle label="Recorrente" checked={form.recorrente} onChange={(value) => setForm({ ...form, recorrente: value })} />
          <Toggle label="Mostrar no inicio" checked={form.visivel_dashboard} onChange={(value) => setForm({ ...form, visivel_dashboard: value })} />
          <Toggle label="Mostrar na agenda" checked={form.visivel_agenda} onChange={(value) => setForm({ ...form, visivel_agenda: value })} />
          <Toggle label="Substituir menor prioridade" checked={form.substitui_eventos_menor_prioridade} onChange={(value) => setForm({ ...form, substitui_eventos_menor_prioridade: value })} />
        </div>

        <div className="mt-4">
          <button disabled={saving} className="w-full rounded-2xl bg-brand px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 disabled:opacity-60 sm:w-auto">
            {saving ? 'Salvando...' : 'Adicionar a agenda'}
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Quem pode alterar agenda/cards
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPermissionModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Adicionar pessoa
            </button>
          )}
        </div>

        <div className="space-y-2">
          {activeManagers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nenhuma pessoa liberada ainda.
            </div>
          ) : (
            activeManagers.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleManager(member, false)}
                    className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Eventos cadastrados</h2>
        <div className="space-y-2">
          {(eventsRaw || []).slice(0, 10).map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{event.titulo}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {event.visivel_dashboard ? 'Card' : 'Agenda'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">Permissao</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Adicionar pessoa</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPermissionModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Buscar membro"
              className={inputClass}
            />

            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {availableManagers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhum membro disponivel.
                </div>
              ) : (
                availableManagers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleManager(member, true)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                  >
                    <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                    <i className="fas fa-plus text-brand" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-brand focus:ring-brand" />
  </label>
);

export default ChurchAdmin;
