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
  horarioFim: string;
  categoria: string;
  recorrente: boolean;
  recorrencia_tipo: string;
  recorrencia_dias_semana: number[];
  recorrencia_dia_mes: number;
  recorrencia_ordem_semana: number;
  recorrencia_data_fim: string;
  prioridade: number;
  substitui_eventos_menor_prioridade: boolean;
  visivel_dashboard: boolean;
  visivel_agenda: boolean;
  imagemDesktop: File | null;
  imagemMobile: File | null;
};

const INITIAL_FORM: EventForm = {
  titulo: '',
  descricao: '',
  local: '',
  data: '',
  horario: '19:30',
  horarioFim: '',
  categoria: 'Culto',
  recorrente: false,
  recorrencia_tipo: 'semanal',
  recorrencia_dias_semana: [0],
  recorrencia_dia_mes: 1,
  recorrencia_ordem_semana: 1,
  recorrencia_data_fim: '',
  prioridade: 0,
  substitui_eventos_menor_prioridade: false,
  visivel_dashboard: true,
  visivel_agenda: true,
  imagemDesktop: null,
  imagemMobile: null
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const ChurchAdmin: React.FC<{ currentUserId?: string | null; isAdmin: boolean }> = ({ currentUserId, isAdmin }) => {
  const { data: eventsRaw } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const { data: permissionsRaw } = useLocalStorageFirst<SupabasePermissaoIgreja>({ table: 'permissoes_igreja' });
  const [form, setForm] = useState<EventForm>(INITIAL_FORM);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
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
        .filter((member) => !managersByMemberId.get(member.id)?.gerenciar_eventos_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(permissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, permissionSearch]
  );
  const orderedEvents = useMemo(
    () =>
      [...(eventsRaw || [])].sort(
        (a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()
      ),
    [eventsRaw]
  );

  const slugify = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'evento';

  const uploadCardImage = async (eventId: string, file: File | null, variant: 'desktop' | 'mobile') => {
    if (!file) return null;

    const compressed = await compressImageFile(file, {
      maxWidth: variant === 'desktop' ? 1600 : 1080,
      maxHeight: variant === 'desktop' ? 900 : 1920,
      quality: 0.78
    });
    const folder = `${slugify(form.titulo)}-${eventId}`;
    const filePath = `eventos-igreja/${folder}/${variant}.jpg`;
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
      const endsAt = form.horarioFim ? `${form.data}T${form.horarioFim}:00` : null;
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        local: form.local.trim() || null,
        categoria: form.categoria.trim() || null,
        data_inicio: startsAt,
        data_fim: endsAt,
        horario_inicio: form.horario || null,
        horario_fim: form.horarioFim || null,
        recorrente: form.recorrente,
        recorrencia_tipo: form.recorrente ? form.recorrencia_tipo : null,
        recorrencia_intervalo: 1,
        recorrencia_dias_semana:
          form.recorrente && ['semanal', 'mensal_ordem_semana'].includes(form.recorrencia_tipo)
            ? form.recorrencia_dias_semana
            : null,
        recorrencia_dia_mes:
          form.recorrente && form.recorrencia_tipo === 'mensal_dia_mes' ? form.recorrencia_dia_mes : null,
        recorrencia_ordem_semana:
          form.recorrente && form.recorrencia_tipo === 'mensal_ordem_semana'
            ? form.recorrencia_ordem_semana
            : null,
        recorrencia_data_fim: form.recorrente && form.recorrencia_data_fim ? form.recorrencia_data_fim : null,
        prioridade: form.prioridade,
        substitui_eventos_menor_prioridade: form.substitui_eventos_menor_prioridade,
        visivel_dashboard: form.visivel_dashboard,
        visivel_agenda: form.visivel_agenda,
        ativo: true,
        ...(editingEventId ? {} : { created_by: currentUserId || null })
      };

      const request = editingEventId
        ? supabase.from('eventos_igreja').update(payload).eq('id', editingEventId).select('id').single()
        : supabase.from('eventos_igreja').insert(payload).select('id').single();

      const { data, error } = await request;

      if (error) throw error;

      const [desktopImageUrl, mobileImageUrl] = await Promise.all([
        uploadCardImage(data.id, form.imagemDesktop, 'desktop'),
        uploadCardImage(data.id, form.imagemMobile, 'mobile')
      ]);
      const imagePayload = {
        ...(desktopImageUrl ? { imagem_url_desktop: desktopImageUrl, imagem_url: desktopImageUrl } : {}),
        ...(mobileImageUrl ? { imagem_url_mobile: mobileImageUrl, imagem_url: desktopImageUrl || mobileImageUrl } : {})
      };
      if (Object.keys(imagePayload).length > 0) {
        const { error: imageError } = await supabase
          .from('eventos_igreja')
          .update(imagePayload)
          .eq('id', data.id);
        if (imageError) throw imageError;
      }

      await LocalStorageFirstService.forceSync('eventos_igreja');
      setForm(INITIAL_FORM);
      setEditingEventId(null);
      setIsEventModalOpen(false);
      showSuccess(editingEventId ? 'Evento atualizado.' : 'Evento salvo na agenda.');
    } catch (error) {
      console.error('Erro ao salvar evento da igreja:', error);
      showError('Erro ao salvar evento.');
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event: SupabaseEventoIgreja) => {
    const start = new Date(event.data_inicio);
    const fallbackDate = event.data_inicio.slice(0, 10);
    setEditingEventId(event.id);
    setForm({
      titulo: event.titulo || '',
      descricao: event.descricao || '',
      local: event.local || '',
      data: Number.isNaN(start.getTime()) ? fallbackDate : start.toISOString().slice(0, 10),
      horario: event.horario_inicio?.slice(0, 5) || '19:30',
      horarioFim: event.horario_fim?.slice(0, 5) || '',
      categoria: event.categoria || 'Culto',
      recorrente: Boolean(event.recorrente),
      recorrencia_tipo: event.recorrencia_tipo || 'semanal',
      recorrencia_dias_semana: event.recorrencia_dias_semana?.length ? event.recorrencia_dias_semana : [0],
      recorrencia_dia_mes: event.recorrencia_dia_mes || 1,
      recorrencia_ordem_semana: event.recorrencia_ordem_semana || 1,
      recorrencia_data_fim: event.recorrencia_data_fim || '',
      prioridade: event.prioridade || 0,
      substitui_eventos_menor_prioridade: Boolean(event.substitui_eventos_menor_prioridade),
      visivel_dashboard: event.visivel_dashboard !== false,
      visivel_agenda: event.visivel_agenda !== false,
      imagemDesktop: null,
      imagemMobile: null
    });
    setIsEventModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingEventId(null);
    setForm(INITIAL_FORM);
    setIsEventModalOpen(false);
  };

  const deleteEvent = async (event: SupabaseEventoIgreja) => {
    const confirmed = window.confirm(`Excluir "${event.titulo}" da agenda e dos cards?`);
    if (!confirmed) return;

    const { error } = await supabase.from('eventos_igreja').delete().eq('id', event.id);
    if (error) {
      showError('Erro ao excluir evento.');
      return;
    }

    if (editingEventId === event.id) cancelEdit();
    await LocalStorageFirstService.forceSync('eventos_igreja');
    showSuccess('Evento excluido.');
  };

  const toggleWeekDay = (day: number) => {
    const exists = form.recorrencia_dias_semana.includes(day);
    const next = exists
      ? form.recorrencia_dias_semana.filter((item) => item !== day)
      : [...form.recorrencia_dias_semana, day].sort((a, b) => a - b);
    setForm({ ...form, recorrencia_dias_semana: next.length ? next : [day] });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Administracao</p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Agenda e cards da igreja
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingEventId(null);
            setForm(INITIAL_FORM);
            setIsEventModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
        >
          <i className="fas fa-plus" />
          Adicionar evento
        </button>
      </div>

      {isEventModalOpen && (
        <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <form onSubmit={saveEvent} className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                  {editingEventId ? 'Editar evento' : 'Novo evento'}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {editingEventId ? 'Atualizar agenda/card' : 'Adicionar a agenda'}
                </h2>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
        {editingEventId && (
          <div className="mb-4 flex flex-col gap-3 rounded-xl bg-brand/10 p-3 text-sm font-bold text-brand sm:flex-row sm:items-center sm:justify-between">
            <span>Editando evento cadastrado</span>
            <button type="button" onClick={cancelEdit} className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/60 dark:hover:bg-slate-900/40">
              Cancelar
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-8 md:gap-4">
          <Field label="Titulo" className="md:col-span-4">
            <input className={inputClass} placeholder="Ex: Culto de celebracao" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Local" className="md:col-span-4">
            <input className={inputClass} placeholder="Ex: Templo sede" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
          </Field>
          <Field label="Data inicial" className="md:col-span-3">
            <input type="date" className={inputClass} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Horario inicial" className="md:col-span-2">
            <input type="time" className={inputClass} value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </Field>
          <Field label="Horario final" className="md:col-span-3">
            <input type="time" className={inputClass} value={form.horarioFim} onChange={(e) => setForm({ ...form, horarioFim: e.target.value })} />
          </Field>
          <Field label="Descricao" className="md:col-span-8">
            <textarea className={inputClass} placeholder="Resumo curto do evento" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <Field label="Imagem desktop 16:9" className="md:col-span-2">
            <input type="file" accept="image/*" className={inputClass} onChange={(e) => setForm({ ...form, imagemDesktop: e.target.files?.[0] || null })} />
            <p className="mt-1 text-[9px] font-bold text-slate-400">Usada em computadores. Recomendado: 1920x1080.</p>
          </Field>
          <Field label="Imagem celular 9:16" className="md:col-span-2">
            <input type="file" accept="image/*" className={inputClass} onChange={(e) => setForm({ ...form, imagemMobile: e.target.files?.[0] || null })} />
            <p className="mt-1 text-[9px] font-bold text-slate-400">Usada em celulares. Recomendado: 1080x1920.</p>
          </Field>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo do evento</label>
            <select
              className={inputClass}
              value={form.recorrente ? form.recorrencia_tipo : 'unico'}
              onChange={(e) => {
                const value = e.target.value;
                setForm({
                  ...form,
                  recorrente: value !== 'unico',
                  recorrencia_tipo: value === 'unico' ? form.recorrencia_tipo : value
                });
              }}
            >
              <option value="unico">📌 Evento unico</option>
              <option value="diaria">📅 Todo dia</option>
              <option value="semanal">📆 Toda semana</option>
              <option value="mensal_dia_mes">🗓️ Todo mês no mesmo dia</option>
              <option value="mensal_ordem_semana">📊 Todo primeiro/segundo domingo do mês</option>
            </select>
            {!form.recorrente && (
              <p className="text-[10px] text-slate-400">Evento acontece somente na data inicial informada.</p>
            )}
            {form.recorrente && form.recorrencia_tipo === 'diaria' && (
              <p className="text-[10px] text-slate-400">Evento se repete todos os dias. Útil para eventos diários como devocionais.</p>
            )}
            {form.recorrente && form.recorrencia_tipo === 'semanal' && (
              <p className="text-[10px] text-slate-400">Evento se repete toda semana nos dias selecionados. Ex: toda quinta-feira.</p>
            )}
            {form.recorrente && form.recorrencia_tipo === 'mensal_dia_mes' && (
              <p className="text-[10px] text-slate-400">Evento se repete todo mês no mesmo dia. Ex: todo dia 15.</p>
            )}
            {form.recorrente && form.recorrencia_tipo === 'mensal_ordem_semana' && (
              <p className="text-[10px] text-slate-400">Evento se repete toda semana específica do mês. Ex: primeira sexta de cada mês.</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prioridade do evento</label>
            <input
              type="number"
              className={inputClass}
              value={form.prioridade}
              onChange={(e) => setForm({ ...form, prioridade: Number(e.target.value) })}
              placeholder="Prioridade (0-10)"
              min={0}
              max={10}
            />
            <p className="text-[9px] text-slate-400">Numeros maiores = maior prioridade. Vale para evento unico e recorrente.</p>
          </div>
        </div>

        {form.recorrente && (
          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60 md:grid-cols-2">
            {['semanal', 'mensal_ordem_semana'].includes(form.recorrencia_tipo) && (
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dias da semana</p>
                  <span className="text-[9px] text-slate-400">(selecione um ou mais dias)</span>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekDay(index)}
                      className={`rounded-xl px-2 py-3 text-[10px] font-black uppercase tracking-widest transition ${
                        form.recorrencia_dias_semana.includes(index)
                          ? 'bg-brand text-white shadow-lg shadow-brand/20'
                          : 'bg-white text-slate-500 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                      title={form.recorrencia_tipo === 'semanal' ? `Evento se repete toda ${day.toLowerCase()}` : `Evento se repete toda ${day.toLowerCase()} selecionada`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400">
                  {form.recorrencia_tipo === 'semanal' 
                    ? 'Evento ocorrerá toda semana nos dias selecionados acima'
                    : 'Evento ocorrerá toda semana selecionada acima (primeira, segunda, etc.)'
                  }
                </p>
              </div>
            )}

            {form.recorrencia_tipo === 'mensal_ordem_semana' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ordem da semana</label>
                <select className={inputClass} value={form.recorrencia_ordem_semana} onChange={(e) => setForm({ ...form, recorrencia_ordem_semana: Number(e.target.value) })}>
                  <option value={1}>🥇 Primeira semana do mês</option>
                  <option value={2}>🥈 Segunda semana do mês</option>
                  <option value={3}>🥉 Terceira semana do mês</option>
                  <option value={4}>🏅 Quarta semana do mês</option>
                  <option value={5}>⭐ Quinta semana do mês</option>
                </select>
                <p className="text-[9px] text-slate-400">Evento ocorrerá na semana selecionada, combinada com o dia da semana escolhido acima</p>
              </div>
            )}

            {form.recorrencia_tipo === 'mensal_dia_mes' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dia do mês</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className={inputClass}
                  value={form.recorrencia_dia_mes}
                  onChange={(e) => setForm({ ...form, recorrencia_dia_mes: Number(e.target.value) })}
                  placeholder="Dia do mês (1-31)"
                />
                <p className="text-[9px] text-slate-400">Evento ocorrerá todo mês neste dia específico. Se o mês não tiver este dia, o evento não ocorrerá.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data limite da recorrência</label>
              <input 
                type="date" 
                className={inputClass} 
                value={form.recorrencia_data_fim} 
                onChange={(e) => setForm({ ...form, recorrencia_data_fim: e.target.value })} 
                placeholder="Data final (opcional)"
              />
              <p className="text-[9px] text-slate-400">Opcional. Se definida, as repetições pararão nesta data. Deixe em branco para repetir indefinidamente.</p>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          <Toggle label="Mostrar no inicio" checked={form.visivel_dashboard} onChange={(value) => setForm({ ...form, visivel_dashboard: value })} />
          <Toggle label="Mostrar na agenda" checked={form.visivel_agenda} onChange={(value) => setForm({ ...form, visivel_agenda: value })} />
          <Toggle label="Substituir menor prioridade" checked={form.substitui_eventos_menor_prioridade} onChange={(value) => setForm({ ...form, substitui_eventos_menor_prioridade: value })} />
        </div>

        <div className="mt-4">
          <button disabled={saving} className="w-full rounded-2xl bg-brand px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 disabled:opacity-60 sm:w-auto">
            {saving ? 'Salvando...' : editingEventId ? 'Atualizar evento' : 'Adicionar a agenda'}
          </button>
        </div>
            </div>
      </form>
        </div>
      )}

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
          {orderedEvents.slice(0, 20).map((event) => (
            <div key={event.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-700 dark:text-slate-200">{event.titulo}</span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {new Date(event.data_inicio).toLocaleDateString('pt-BR')} · {event.recorrente ? 'Recorrente' : 'Unico'} · {event.visivel_dashboard ? 'Card' : 'Agenda'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => editEvent(event)}
                  className="rounded-lg bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => deleteEvent(event)}
                  className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Excluir
                </button>
              </div>
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

const Field = ({
  label,
  className = '',
  children
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <label className={`space-y-2 ${className}`}>
    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    {children}
  </label>
);

export default ChurchAdmin;
