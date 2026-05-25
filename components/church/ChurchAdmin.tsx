import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { SupabaseEventoIgreja, SupabaseMembro, SupabasePermissaoIgreja } from '../../types-supabase';
import { compressImageFile } from '../../utils/imageCompression';
import { recordChurchAudit } from '../../utils/churchAudit';
import { getDisplayName } from '../../utils/displayName';
import { getPublicAssetsPathFromUrl } from '../../utils/imageUrl';
import { showError, showSuccess } from '../../utils/toast';

type ChurchAuditLog = {
  id: string;
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  descricao: string;
  payload?: Record<string, unknown> | null;
  created_by?: string | null;
  created_at?: string | null;
};

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
  'app-input w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10';

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ChurchAdmin: React.FC<{ currentUserId?: string | null; isAdmin: boolean; mode?: 'admin' | 'events' }> = ({
  currentUserId,
  isAdmin,
  mode = 'admin'
}) => {
  const { data: eventsRaw } = useLocalStorageFirst<SupabaseEventoIgreja>({ table: 'eventos_igreja' });
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const { data: permissionsRaw } = useLocalStorageFirst<SupabasePermissaoIgreja>({ table: 'permissoes_igreja' });
  const { data: cultNamesRaw } = useLocalStorageFirst<{ nome_culto: string }>({ table: 'nome_cultos' });
  const { data: auditRaw } = useLocalStorageFirst<ChurchAuditLog>({ table: 'auditoria_igreja' });
  const [form, setForm] = useState<EventForm>(INITIAL_FORM);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isPastorModalOpen, setIsPastorModalOpen] = useState(false);
  const [isVisitorPermissionModalOpen, setIsVisitorPermissionModalOpen] = useState(false);
  const [isConvertPermissionModalOpen, setIsConvertPermissionModalOpen] = useState(false);
  const [isSitePermissionModalOpen, setIsSitePermissionModalOpen] = useState(false);
  const [isReportPermissionModalOpen, setIsReportPermissionModalOpen] = useState(false);
  const [isReportExportPermissionModalOpen, setIsReportExportPermissionModalOpen] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [pastorSearch, setPastorSearch] = useState('');
  const [visitorPermissionSearch, setVisitorPermissionSearch] = useState('');
  const [convertPermissionSearch, setConvertPermissionSearch] = useState('');
  const [sitePermissionSearch, setSitePermissionSearch] = useState('');
  const [reportPermissionSearch, setReportPermissionSearch] = useState('');
  const [reportExportPermissionSearch, setReportExportPermissionSearch] = useState('');
  const [openAdminSection, setOpenAdminSection] = useState<string | null>('permissions-events');
  const isEventsMode = mode === 'events';
  const isAdminMode = mode === 'admin';

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
  const featuredPastors = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.mostrar_pastor_inicio)
        .map((permission) => ({
          permission,
          member: (membersRaw || []).find((member) => member.id === permission.membro_id)
        }))
        .filter((item): item is { permission: SupabasePermissaoIgreja; member: SupabaseMembro } => Boolean(item.member)),
    [membersRaw, permissionsRaw]
  );
  const activeVisitorManagers = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.gerenciar_visitantes_igreja)
        .map((permission) => ({
          permission,
          member: (membersRaw || []).find((member) => member.id === permission.membro_id)
        }))
        .filter((item): item is { permission: SupabasePermissaoIgreja; member: SupabaseMembro } => Boolean(item.member)),
    [membersRaw, permissionsRaw]
  );
  const activeConvertManagers = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.gerenciar_novos_convertidos_igreja)
        .map((permission) => ({
          permission,
          member: (membersRaw || []).find((member) => member.id === permission.membro_id)
        }))
        .filter((item): item is { permission: SupabasePermissaoIgreja; member: SupabaseMembro } => Boolean(item.member)),
    [membersRaw, permissionsRaw]
  );
  const activeSiteManagers = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.gerenciar_site_igreja)
        .map((permission) => ({
          permission,
          member: (membersRaw || []).find((member) => member.id === permission.membro_id)
        }))
        .filter((item): item is { permission: SupabasePermissaoIgreja; member: SupabaseMembro } => Boolean(item.member)),
    [membersRaw, permissionsRaw]
  );
  const activeReportViewers = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.acessar_relatorios_igreja)
        .map((permission) => ({
          permission,
          member: (membersRaw || []).find((member) => member.id === permission.membro_id)
        }))
        .filter((item): item is { permission: SupabasePermissaoIgreja; member: SupabaseMembro } => Boolean(item.member)),
    [membersRaw, permissionsRaw]
  );
  const activeReportExporters = useMemo(
    () =>
      (permissionsRaw || [])
        .filter((permission) => permission.exportar_relatorios_igreja)
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
  const auditSummary = useMemo(() => {
    const logs = [...(auditRaw || [])].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const lastSevenDays = new Date();
    lastSevenDays.setDate(lastSevenDays.getDate() - 7);

    const recentLogs = logs.filter((log) => {
      const date = new Date(log.created_at || '');
      return !Number.isNaN(date.getTime()) && date >= lastSevenDays;
    });

    const countByAction = recentLogs.reduce<Record<string, number>>((accumulator, log) => {
      accumulator[log.acao] = (accumulator[log.acao] || 0) + 1;
      return accumulator;
    }, {});

    const countByEntity = recentLogs.reduce<Record<string, number>>((accumulator, log) => {
      accumulator[log.entidade] = (accumulator[log.entidade] || 0) + 1;
      return accumulator;
    }, {});

    return {
      logs,
      recentLogs,
      countByAction,
      countByEntity
    };
  }, [auditRaw]);
  const availablePastors = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => normalize(member.posicao_igreja).includes('pastor'))
        .filter((member) => !managersByMemberId.get(member.id)?.mostrar_pastor_inicio)
        .filter((member) => getDisplayName(member).toLowerCase().includes(pastorSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, pastorSearch]
  );
  const availableVisitorManagers = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => !managersByMemberId.get(member.id)?.gerenciar_visitantes_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(visitorPermissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, visitorPermissionSearch]
  );
  const availableConvertManagers = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => !managersByMemberId.get(member.id)?.gerenciar_novos_convertidos_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(convertPermissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [convertPermissionSearch, managersByMemberId, membersRaw]
  );
  const availableSiteManagers = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => !managersByMemberId.get(member.id)?.gerenciar_site_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(sitePermissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, sitePermissionSearch]
  );
  const availableReportViewers = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => !managersByMemberId.get(member.id)?.acessar_relatorios_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(reportPermissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, reportPermissionSearch]
  );
  const availableReportExporters = useMemo(
    () =>
      (membersRaw || [])
        .filter((member) => !managersByMemberId.get(member.id)?.exportar_relatorios_igreja)
        .filter((member) => getDisplayName(member).toLowerCase().includes(reportExportPermissionSearch.toLowerCase()))
        .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b))),
    [managersByMemberId, membersRaw, reportExportPermissionSearch]
  );
  const orderedEvents = useMemo(
    () =>
      [...(eventsRaw || [])].sort(
        (a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()
      ),
    [eventsRaw]
  );
  const cultNameSuggestions = useMemo(
    () =>
      Array.from(new Set((cultNamesRaw || []).map((item) => item.nome_culto).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b)),
    [cultNamesRaw]
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
    if (form.horarioFim && form.horarioFim <= form.horario) {
      showError('O horario final deve ser maior que o horario inicial.');
      return;
    }

    setSaving(true);

    try {
      const duplicateEvent = (eventsRaw || []).find((item) => {
        if (item.id === editingEventId) return false;
        return (
          item.titulo.trim().toLowerCase() === form.titulo.trim().toLowerCase() &&
          item.data_inicio.slice(0, 10) === form.data &&
          (item.horario_inicio?.slice(0, 5) || '') === (form.horario || '')
        );
      });
      if (duplicateEvent) {
        showError('Ja existe um evento com este titulo, data e horario.');
        return;
      }

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
      await recordChurchAudit({
        action: editingEventId ? 'update' : 'create',
        entity: 'eventos_igreja',
        entityId: data.id,
        userId: currentUserId,
        description: editingEventId ? `Evento atualizado: ${payload.titulo}` : `Evento criado: ${payload.titulo}`,
        payload: {
          titulo: payload.titulo,
          data_inicio: payload.data_inicio,
          categoria: payload.categoria
        }
      });
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

    const imagePaths = Array.from(new Set([
      getPublicAssetsPathFromUrl(event.imagem_url),
      getPublicAssetsPathFromUrl(event.imagem_url_desktop),
      getPublicAssetsPathFromUrl(event.imagem_url_mobile)
    ].filter(Boolean)));

    if (imagePaths.length > 0) {
      const { error: removeError } = await supabase.storage.from('public-assets').remove(imagePaths);
      if (removeError) {
        console.warn('Erro ao remover imagens do evento:', removeError);
      }
    }

    const { error } = await supabase.from('eventos_igreja').delete().eq('id', event.id);
    if (error) {
      showError('Erro ao excluir evento.');
      return;
    }

    if (editingEventId === event.id) cancelEdit();
    await LocalStorageFirstService.forceSync('eventos_igreja');
    await recordChurchAudit({
      action: 'delete',
      entity: 'eventos_igreja',
      entityId: event.id,
      userId: currentUserId,
      description: `Evento excluido: ${event.titulo}`,
      payload: {
        titulo: event.titulo,
        data_inicio: event.data_inicio,
        categoria: event.categoria
      }
    });
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
    const payload = {
      membro_id: member.id,
      gerenciar_eventos_igreja: allowed,
      mostrar_pastor_inicio: existing?.mostrar_pastor_inicio || false,
      gerenciar_visitantes_igreja: existing?.gerenciar_visitantes_igreja || false,
      gerenciar_novos_convertidos_igreja: existing?.gerenciar_novos_convertidos_igreja || false,
      gerenciar_site_igreja: existing?.gerenciar_site_igreja || false,
      acessar_relatorios_igreja: existing?.acessar_relatorios_igreja || false,
      exportar_relatorios_igreja: existing?.exportar_relatorios_igreja || false
    };
    const request = existing
      ? supabase.from('permissoes_igreja').update(payload).eq('id', existing.id)
      : supabase.from('permissoes_igreja').insert(payload);

    const { error } = await request;
    if (error) {
      showError('Erro ao atualizar permissao.');
      return;
    }

    await LocalStorageFirstService.forceSync('permissoes_igreja');
    await recordChurchAudit({
      action: allowed ? 'grant' : 'revoke',
      entity: 'permissoes_igreja',
      entityId: existing?.id || null,
      userId: currentUserId,
      description: `${allowed ? 'Liberado' : 'Removido'} acesso para alterar agenda/cards: ${getDisplayName(member)}`,
      payload: {
        membro_id: member.id,
        nome: getDisplayName(member),
        permissao: 'gerenciar_eventos_igreja',
        valor: allowed
      }
    });
    if (allowed) {
      setIsPermissionModalOpen(false);
      setPermissionSearch('');
    }
  };

  const toggleFeaturedPastor = async (member: SupabaseMembro, visible: boolean) => {
    if (!isAdmin) {
      showError('Somente admin define os pastores do inicio.');
      return;
    }

    const existing = managersByMemberId.get(member.id);
    const payload = {
      membro_id: member.id,
      gerenciar_eventos_igreja: existing?.gerenciar_eventos_igreja || false,
      mostrar_pastor_inicio: visible,
      gerenciar_visitantes_igreja: existing?.gerenciar_visitantes_igreja || false,
      gerenciar_novos_convertidos_igreja: existing?.gerenciar_novos_convertidos_igreja || false,
      gerenciar_site_igreja: existing?.gerenciar_site_igreja || false,
      acessar_relatorios_igreja: existing?.acessar_relatorios_igreja || false,
      exportar_relatorios_igreja: existing?.exportar_relatorios_igreja || false
    };
    const request = existing
      ? supabase.from('permissoes_igreja').update(payload).eq('id', existing.id)
      : supabase.from('permissoes_igreja').insert(payload);

    const { error } = await request;
    if (error) {
      showError('Erro ao atualizar pastor do inicio.');
      return;
    }

    await LocalStorageFirstService.forceSync('permissoes_igreja');
    await recordChurchAudit({
      action: visible ? 'grant' : 'revoke',
      entity: 'permissoes_igreja',
      entityId: existing?.id || null,
      userId: currentUserId,
      description: `${visible ? 'Adicionado' : 'Removido'} pastor do inicio: ${getDisplayName(member)}`,
      payload: {
        membro_id: member.id,
        nome: getDisplayName(member),
        permissao: 'mostrar_pastor_inicio',
        valor: visible
      }
    });
    if (visible) {
      setIsPastorModalOpen(false);
      setPastorSearch('');
    }
  };

  const toggleChurchPermission = async (
    member: SupabaseMembro,
    field:
      | 'gerenciar_visitantes_igreja'
      | 'gerenciar_novos_convertidos_igreja'
      | 'gerenciar_site_igreja'
      | 'acessar_relatorios_igreja'
      | 'exportar_relatorios_igreja',
    allowed: boolean,
    successCallback?: () => void
  ) => {
    if (!isAdmin) {
      showError('Somente admin define quem acessa esses cadastros.');
      return;
    }

    const existing = managersByMemberId.get(member.id);
    const payload = {
      membro_id: member.id,
      gerenciar_eventos_igreja: existing?.gerenciar_eventos_igreja || false,
      mostrar_pastor_inicio: existing?.mostrar_pastor_inicio || false,
      gerenciar_visitantes_igreja: field === 'gerenciar_visitantes_igreja' ? allowed : existing?.gerenciar_visitantes_igreja || false,
      gerenciar_novos_convertidos_igreja:
        field === 'gerenciar_novos_convertidos_igreja' ? allowed : existing?.gerenciar_novos_convertidos_igreja || false,
      gerenciar_site_igreja: field === 'gerenciar_site_igreja' ? allowed : existing?.gerenciar_site_igreja || false,
      acessar_relatorios_igreja: field === 'acessar_relatorios_igreja' ? allowed : existing?.acessar_relatorios_igreja || false,
      exportar_relatorios_igreja: field === 'exportar_relatorios_igreja' ? allowed : existing?.exportar_relatorios_igreja || false
    };

    const request = existing
      ? supabase.from('permissoes_igreja').update(payload).eq('id', existing.id)
      : supabase.from('permissoes_igreja').insert(payload);

    const { error } = await request;
    if (error) {
      showError('Erro ao atualizar permissao.');
      return;
    }

    await LocalStorageFirstService.forceSync('permissoes_igreja');
    await recordChurchAudit({
      action: allowed ? 'grant' : 'revoke',
      entity: 'permissoes_igreja',
      entityId: existing?.id || null,
      userId: currentUserId,
      description: `${allowed ? 'Liberado' : 'Removido'} acesso ${field} para ${getDisplayName(member)}`,
      payload: {
        membro_id: member.id,
        nome: getDisplayName(member),
        permissao: field,
        valor: allowed
      }
    });
    successCallback?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Administracao</p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {isEventsMode ? 'Agenda e cards da igreja' : 'Permissoes e exibicao da igreja'}
          </h1>
        </div>
        {isEventsMode && (
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
        )}
      </div>

      {isEventsMode && isEventModalOpen && (
        <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <form onSubmit={saveEvent} className="app-card mx-auto max-w-3xl rounded-2xl border shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-app bg-app-surface p-4 sm:p-5">
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
            <button type="button" onClick={cancelEdit} className="rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-app-surface-strong">
              Cancelar
            </button>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-8 md:gap-4">
          <Field label="Titulo" className="md:col-span-4">
            <input
              className={inputClass}
              list="church-event-title-suggestions"
              placeholder="Ex: Culto de celebracao"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
            <datalist id="church-event-title-suggestions">
              {cultNameSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
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
          <div className="mt-4 grid gap-3 rounded-2xl bg-app-surface-strong p-3 md:grid-cols-2">
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
                          : 'bg-app-surface text-app-muted hover:bg-app-surface-strong'
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

      {isAdminMode && (
        <div className="app-card rounded-2xl border p-4 sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Painel admin</p>
            <h2 className="mt-1 text-base font-black text-slate-900 dark:text-white">Escolha uma area para gerenciar</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { id: 'permissions-events', label: 'Agenda/cards', count: activeManagers.length, icon: 'fa-calendar-check' },
              { id: 'permissions-site', label: 'Site', count: activeSiteManagers.length, icon: 'fa-globe' },
              { id: 'permissions-reports', label: 'Relatorios', count: activeReportViewers.length + activeReportExporters.length, icon: 'fa-chart-line' },
              { id: 'permissions-registry', label: 'Cadastros', count: activeVisitorManagers.length + activeConvertManagers.length, icon: 'fa-address-book' },
              { id: 'pastors', label: 'Pastores no inicio', count: featuredPastors.length, icon: 'fa-user-tie' },
              { id: 'audit', label: 'Auditoria', count: auditSummary.recentLogs.length, icon: 'fa-shield-halved' }
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setOpenAdminSection(section.id)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  openAdminSection === section.id
                    ? 'border-brand bg-brand text-white shadow-lg shadow-brand/20'
                    : 'border-app bg-app-surface-strong text-app hover:border-brand/40 hover:text-brand'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-black uppercase tracking-widest">{section.label}</p>
                  <p className={`mt-1 text-[10px] font-bold ${openAdminSection === section.id ? 'text-white/75' : 'text-app-muted'}`}>
                    {section.count} ativo{section.count === 1 ? '' : 's'}
                  </p>
                </div>
                <i className={`fas ${section.icon} shrink-0 text-sm`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'audit' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand">Auditoria avancada</p>
            <h2 className="mt-1 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
              Atividade recente da igreja
            </h2>
          </div>
          <span className="rounded-full bg-app-surface-strong px-3 py-2 text-[10px] font-black uppercase tracking-widest text-app-muted">
            {auditSummary.recentLogs.length} acoes em 7 dias
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: 'Criacoes', value: auditSummary.countByAction.create || 0, icon: 'fa-plus' },
            { label: 'Edicoes', value: auditSummary.countByAction.update || 0, icon: 'fa-pen' },
            { label: 'Permissoes', value: (auditSummary.countByAction.grant || 0) + (auditSummary.countByAction.revoke || 0), icon: 'fa-shield-halved' }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-app-surface-strong p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-app-muted">{item.label}</p>
                <i className={`fas ${item.icon} text-brand`} />
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl bg-app-surface-strong p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-app-muted">Areas mais alteradas</p>
            <div className="mt-3 space-y-2">
              {Object.entries(auditSummary.countByEntity).slice(0, 5).map(([entity, count]) => (
                <div key={entity} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface px-3 py-2">
                  <span className="truncate text-xs font-black text-slate-700 dark:text-slate-200">{entity}</span>
                  <span className="text-xs font-black text-brand">{count}</span>
                </div>
              ))}
              {Object.keys(auditSummary.countByEntity).length === 0 && (
                <p className="text-xs font-bold text-app-muted">Nenhuma atividade recente registrada.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-app-surface-strong p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-app-muted">Ultimas atividades</p>
            <div className="mt-3 space-y-2">
              {auditSummary.logs.slice(0, 6).map((log) => {
                const author = (membersRaw || []).find((member) => member.id === log.created_by);
                return (
                  <div key={log.id} className="rounded-xl bg-app-surface px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-xs font-black text-slate-800 dark:text-white">{log.descricao}</p>
                      <span className="rounded-full bg-brand/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-brand">
                        {log.acao}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-app-muted">
                      {getDisplayName(author, 'Sistema')} · {log.created_at ? new Date(log.created_at).toLocaleDateString('pt-BR') : 'sem data'}
                    </p>
                  </div>
                );
              })}
              {auditSummary.logs.length === 0 && (
                <p className="text-xs font-bold text-app-muted">Nenhum registro de auditoria encontrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'permissions-reports' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Quem pode acessar relatorios
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsReportPermissionModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Liberar pessoa
            </button>
          )}
        </div>

        <div className="space-y-2">
          {activeReportViewers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ninguem liberado para visualizar relatorios ainda.
            </div>
          ) : (
            activeReportViewers.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleChurchPermission(member, 'acessar_relatorios_igreja', false)}
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
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'permissions-reports' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Quem pode exportar relatorios
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsReportExportPermissionModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Liberar pessoa
            </button>
          )}
        </div>

        <div className="space-y-2">
          {activeReportExporters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ninguem liberado para exportar relatorios ainda.
            </div>
          ) : (
            activeReportExporters.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleChurchPermission(member, 'exportar_relatorios_igreja', false)}
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
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'permissions-events' ? '' : 'hidden'}`}>
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
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
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
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'permissions-site' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Quem pode alterar o site
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsSitePermissionModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Liberar pessoa
            </button>
          )}
        </div>

        <div className="space-y-2">
          {activeSiteManagers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ninguem liberado para editar o site ainda.
            </div>
          ) : (
            activeSiteManagers.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleChurchPermission(member, 'gerenciar_site_igreja', false)}
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
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'permissions-registry' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Quem pode acessar visitantes
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsVisitorPermissionModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Liberar pessoa
            </button>
          )}
        </div>

        <div className="space-y-2">
          {activeVisitorManagers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ninguem liberado para visitantes ainda.
            </div>
          ) : (
            activeVisitorManagers.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleChurchPermission(member, 'gerenciar_visitantes_igreja', false)}
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
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'permissions-registry' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Quem pode acessar novos convertidos
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsConvertPermissionModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Liberar pessoa
            </button>
          )}
        </div>

        <div className="space-y-2">
          {activeConvertManagers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Ninguem liberado para novos convertidos ainda.
            </div>
          ) : (
            activeConvertManagers.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleChurchPermission(member, 'gerenciar_novos_convertidos_igreja', false)}
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
      )}

      {isAdminMode && (
      <div className={`app-card rounded-2xl border p-4 sm:p-5 ${openAdminSection === 'pastors' ? '' : 'hidden'}`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Pastores presidentes no inicio
          </h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsPastorModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
            >
              <i className="fas fa-user-plus" />
              Adicionar pastor
            </button>
          )}
        </div>

        <div className="space-y-2">
          {featuredPastors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nenhum pastor selecionado ainda.
            </div>
          ) : (
            featuredPastors.map(({ member }) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
                <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleFeaturedPastor(member, false)}
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
      )}

      {isEventsMode && (
      <div className="app-card rounded-2xl border p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Eventos cadastrados</h2>
        <div className="space-y-2">
          {orderedEvents.slice(0, 20).map((event) => (
            <div key={event.id} className="flex flex-col gap-3 rounded-xl bg-app-surface-strong px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                  className="rounded-lg bg-app-surface px-3 py-2 text-[10px] font-black uppercase tracking-widest text-app-muted hover:bg-app-surface-strong"
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
      )}

      {isAdminMode && isPermissionModalOpen && (
        <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="app-card mx-auto max-w-xl rounded-2xl border p-4 shadow-2xl sm:p-5">
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
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3 text-left hover:bg-app-surface-muted"
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

      {isAdminMode && isPastorModalOpen && (
        <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
          <div className="app-card mx-auto max-w-xl rounded-2xl border p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">Inicio</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Adicionar pastor</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPastorModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <input
              value={pastorSearch}
              onChange={(event) => setPastorSearch(event.target.value)}
              placeholder="Buscar pastor"
              className={inputClass}
            />

            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {availablePastors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhum pastor disponivel.
                </div>
              ) : (
                availablePastors.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleFeaturedPastor(member, true)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3 text-left hover:bg-app-surface-muted"
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

      {isAdminMode && isVisitorPermissionModalOpen && (
        <PermissionModal
          title="Adicionar acesso a visitantes"
          subtitle="Visitantes"
          search={visitorPermissionSearch}
          setSearch={setVisitorPermissionSearch}
          placeholder="Buscar membro"
          onClose={() => setIsVisitorPermissionModalOpen(false)}
          members={availableVisitorManagers}
          onSelect={(member) =>
            toggleChurchPermission(member, 'gerenciar_visitantes_igreja', true, () => {
              setIsVisitorPermissionModalOpen(false);
              setVisitorPermissionSearch('');
            })
          }
          emptyLabel="Nenhum membro disponivel."
        />
      )}

      {isAdminMode && isConvertPermissionModalOpen && (
        <PermissionModal
          title="Adicionar acesso a novos convertidos"
          subtitle="Novos convertidos"
          search={convertPermissionSearch}
          setSearch={setConvertPermissionSearch}
          placeholder="Buscar membro"
          onClose={() => setIsConvertPermissionModalOpen(false)}
          members={availableConvertManagers}
          onSelect={(member) =>
            toggleChurchPermission(member, 'gerenciar_novos_convertidos_igreja', true, () => {
              setIsConvertPermissionModalOpen(false);
              setConvertPermissionSearch('');
            })
          }
          emptyLabel="Nenhum membro disponivel."
        />
      )}

      {isAdminMode && isSitePermissionModalOpen && (
        <PermissionModal
          title="Adicionar acesso ao site"
          subtitle="Site"
          search={sitePermissionSearch}
          setSearch={setSitePermissionSearch}
          placeholder="Buscar membro"
          onClose={() => setIsSitePermissionModalOpen(false)}
          members={availableSiteManagers}
          onSelect={(member) =>
            toggleChurchPermission(member, 'gerenciar_site_igreja', true, () => {
              setIsSitePermissionModalOpen(false);
              setSitePermissionSearch('');
            })
          }
          emptyLabel="Nenhum membro disponivel."
        />
      )}

      {isAdminMode && isReportPermissionModalOpen && (
        <PermissionModal
          title="Adicionar acesso a relatorios"
          subtitle="Relatorios"
          search={reportPermissionSearch}
          setSearch={setReportPermissionSearch}
          placeholder="Buscar membro"
          onClose={() => setIsReportPermissionModalOpen(false)}
          members={availableReportViewers}
          onSelect={(member) =>
            toggleChurchPermission(member, 'acessar_relatorios_igreja', true, () => {
              setIsReportPermissionModalOpen(false);
              setReportPermissionSearch('');
            })
          }
          emptyLabel="Nenhum membro disponivel."
        />
      )}

      {isAdminMode && isReportExportPermissionModalOpen && (
        <PermissionModal
          title="Adicionar permissao para exportar relatorios"
          subtitle="Exportacao"
          search={reportExportPermissionSearch}
          setSearch={setReportExportPermissionSearch}
          placeholder="Buscar membro"
          onClose={() => setIsReportExportPermissionModalOpen(false)}
          members={availableReportExporters}
          onSelect={(member) =>
            toggleChurchPermission(member, 'exportar_relatorios_igreja', true, () => {
              setIsReportExportPermissionModalOpen(false);
              setReportExportPermissionSearch('');
            })
          }
          emptyLabel="Nenhum membro disponivel."
        />
      )}
    </div>
  );
};

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3">
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

const PermissionModal = ({
  title,
  subtitle,
  search,
  setSearch,
  placeholder,
  onClose,
  members,
  onSelect,
  emptyLabel
}: {
  title: string;
  subtitle: string;
  search: string;
  setSearch: (value: string) => void;
  placeholder: string;
  onClose: () => void;
  members: SupabaseMembro[];
  onSelect: (member: SupabaseMembro) => void;
  emptyLabel: string;
}) => (
  <div className="fixed inset-0 z-[720] overflow-y-auto bg-slate-950/60 px-3 py-4 pb-24 backdrop-blur-sm sm:px-4 sm:py-6">
    <div className="app-card mx-auto max-w-xl rounded-2xl border p-4 shadow-2xl sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand">{subtitle}</p>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
        >
          <i className="fas fa-times" />
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />

      <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {emptyLabel}
          </div>
        ) : (
          members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-app-surface-strong px-4 py-3 text-left hover:bg-app-surface-muted"
            >
              <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{getDisplayName(member)}</span>
              <i className="fas fa-plus text-brand" />
            </button>
          ))
        )}
      </div>
    </div>
  </div>
);

export default ChurchAdmin;
