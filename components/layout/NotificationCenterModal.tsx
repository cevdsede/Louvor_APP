import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import AvisoGeralService, { AvisoGeral, AvisoGeralDestino, isAvisoGeralVisible } from '../../services/AvisoGeralService';
import { showError, showSuccess } from '../../utils/toast';
import { showConfirmModal } from '../../utils/confirmModal';
import { getDisplayName } from '../../utils/displayName';
import { buildWeeklyScaleItems, formatDateOnly } from '../../utils/weeklyScale';

type GeneralNoticeTarget = Extract<AvisoGeralDestino, 'todos' | 'lideres'>;

interface NotificationCenterModalProps {
  onClose: () => void;
}

const formatNotificationTime = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTomorrowDateOnly = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDateOnly(date);
};

const getNotificationPriority = (notification: AvisoGeral, today: string, tomorrow: string) => {
  const notificationDate = (notification.created_at || '').split('T')[0];

  if (notification.tipo === 'escala_aviso' && notificationDate === today) {
    return { label: 'Hoje', className: 'bg-red-500 text-white', level: 0 };
  }

  if (notification.tipo === 'escala_aviso' && notificationDate === tomorrow) {
    return { label: 'Amanha', className: 'bg-amber-500 text-white', level: 1 };
  }

  if (notification.tipo === 'escala_aviso') {
    return { label: 'Semana', className: 'bg-brand text-white', level: 2 };
  }

  return { label: 'Aviso', className: 'bg-app-surface text-brand', level: 3 };
};

const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ onClose }) => {
  const { currentMember, activeMinisterio, activeMinisterioId } = useMinistryContext();
  const { data: avisosRaw, forceSync, loadData, removeItem } = useLocalStorageFirst<AvisoGeral>({ table: 'aviso_geral' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });
  const [showGeneralNoticeForm, setShowGeneralNoticeForm] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [target, setTarget] = useState<GeneralNoticeTarget>('todos');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readScaleNotifications, setReadScaleNotifications] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('louvor_read_scale_notifications') || '{}');
  });

  const notifications = useMemo(() => {
    if (!currentMember?.id) {
      return [];
    }

    const storedNotifications = (avisosRaw || [])
      .filter(
        (aviso) =>
          aviso.id_membro === currentMember.id &&
          isAvisoGeralVisible(aviso) &&
          (!activeMinisterioId || !aviso.ministerio_id || aviso.ministerio_id === activeMinisterioId)
      )
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    const today = formatDateOnly(new Date());
    const tomorrow = getTomorrowDateOnly();
    const scaleNotifications: AvisoGeral[] = buildWeeklyScaleItems({
      userId: currentMember.id,
      escalas: escalasRaw || [],
      cultos: cultosRaw || [],
      nomeCultos: nomeCultosRaw || [],
      funcoes: funcoesRaw || [],
      ministerioId: activeMinisterioId
    }).map((item) => {
      const id = `scale:${activeMinisterioId || 'all'}:${item.idCulto}:${item.data}`;
      const roles = item.funcoes.join(' / ');
      const isToday = item.data === today;
      const isTomorrow = item.data === tomorrow;

      return {
        id,
        created_at: `${item.data}T${item.horario || '00:00:00'}`,
        id_membro: currentMember.id,
        titulo: isToday ? 'Sua escala e hoje' : isTomorrow ? 'Sua escala e amanha' : 'Voce esta escalado esta semana',
        texto: isToday
          ? `Sua escala de ${roles || 'servico'} e hoje${item.horario ? ` as ${item.horario.slice(0, 5)}` : ''}.`
          : isTomorrow
            ? `Sua escala de ${roles || 'servico'} e amanha em ${item.culto}${item.horario ? ` as ${item.horario.slice(0, 5)}` : ''}.`
          : `Voce esta escalado esta semana em ${item.culto}${roles ? ` como ${roles}` : ''}.`,
        tipo: 'escala_aviso',
        remetente_id: null,
        ministerio_id: item.ministerioId,
        destino: 'escala',
        id_culto: item.idCulto,
        lida: Boolean(readScaleNotifications[id])
      };
    });

    return [...scaleNotifications, ...storedNotifications].sort((a, b) => {
      const today = formatDateOnly(new Date());
      const tomorrow = getTomorrowDateOnly();
      const priorityCompare = getNotificationPriority(a, today, tomorrow).level - getNotificationPriority(b, today, tomorrow).level;
      if (priorityCompare !== 0) return priorityCompare;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [
    activeMinisterioId,
    avisosRaw,
    cultosRaw,
    currentMember?.id,
    escalasRaw,
    funcoesRaw,
    nomeCultosRaw,
    readScaleNotifications
  ]);

  const unreadNotifications = notifications.filter((aviso) => !aviso.lida);
  const readNotifications = notifications.filter((aviso) => aviso.lida);
  const unreadCount = unreadNotifications.length;
  const selectedCount = selectedNotifications.length;
  const selectedSet = new Set(selectedNotifications);
  const today = formatDateOnly(new Date());
  const tomorrow = getTomorrowDateOnly();
  const urgentCount = notifications.filter((notification) => getNotificationPriority(notification, today, tomorrow).level <= 1).length;
  const weeklyScaleCount = notifications.filter((notification) => notification.tipo === 'escala_aviso').length;

  useEffect(() => {
    setSelectedNotifications((current) =>
      current.filter((id) => notifications.some((notification) => String(notification.id) === id))
    );
  }, [notifications]);

  useEffect(() => {
    const handleUpdated = () => {
      loadData();
    };

    window.addEventListener('aviso-geral-updated', handleUpdated);
    return () => {
      window.removeEventListener('aviso-geral-updated', handleUpdated);
    };
  }, [loadData]);

  const getSenderName = (remetenteId?: string | null) => {
    if (!remetenteId) {
      return 'Sistema';
    }

    const member = (membrosRaw || []).find((item: any) => item.id === remetenteId);
    return getDisplayName(member, 'Sistema');
  };

  const handleMarkAsRead = async (id: string | number) => {
    if (String(id).startsWith('scale:')) {
      const updated = { ...readScaleNotifications, [String(id)]: true };
      setReadScaleNotifications(updated);
      localStorage.setItem('louvor_read_scale_notifications', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('aviso-geral-updated'));
      return;
    }

    await AvisoGeralService.markAsRead(id);
    await forceSync();
  };

  const toggleNotificationSelection = (id: string | number) => {
    const normalizedId = String(id);

    setSelectedNotifications((current) =>
      current.includes(normalizedId)
        ? current.filter((item) => item !== normalizedId)
        : [...current, normalizedId]
    );
  };

  const handleSelectAllNotifications = () => {
    if (selectedCount === notifications.length) {
      setSelectedNotifications([]);
      return;
    }

    setSelectedNotifications(notifications.map((notification) => String(notification.id)));
  };

  const handleDeleteNotification = async (id: string | number) => {
    const confirmed = await showConfirmModal({
      title: 'Excluir notificacao',
      message: 'Esta notificacao sera removida da sua lista. Esta acao nao pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Manter',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) {
      return;
    }

    try {
      removeItem(String(id));
      showSuccess('A notificacao foi excluida com sucesso.');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel excluir a notificacao.');
    }
  };

  const handleDeleteSelectedNotifications = async () => {
    if (selectedCount === 0) {
      showError('Selecione pelo menos uma notificacao.');
      return;
    }

    const confirmed = await showConfirmModal({
      title: 'Excluir notificacoes',
      message: `${selectedCount} notificacao(oes) selecionada(s) serao removidas da sua lista. Esta acao nao pode ser desfeita.`,
      confirmText: 'Excluir selecionadas',
      cancelText: 'Manter',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) {
      return;
    }

    try {
      selectedNotifications.forEach((id) => {
        removeItem(String(id));
      });
      setSelectedNotifications([]);
      showSuccess(`${selectedCount} notificacao(oes) excluida(s) com sucesso.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Nao foi possivel excluir as notificacoes selecionadas.');
    }
  };

  const handleMarkAllAsRead = async () => {
    const updated = { ...readScaleNotifications };
    unreadNotifications
      .filter((notification) => String(notification.id).startsWith('scale:'))
      .forEach((notification) => {
        updated[String(notification.id)] = true;
      });

    setReadScaleNotifications(updated);
    localStorage.setItem('louvor_read_scale_notifications', JSON.stringify(updated));
    await AvisoGeralService.markAllAsRead(activeMinisterioId);
    window.dispatchEvent(new CustomEvent('aviso-geral-updated'));
    loadData();
  };

  const handleClose = async () => {
    if (unreadNotifications.length > 0) {
      await handleMarkAllAsRead();
    }

    onClose();
  };

  const handleSubmitGeneralNotice = async () => {
    if (!message.trim()) {
      showError('Digite a mensagem do aviso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const total = await AvisoGeralService.createGeneralNotice({
        ministerioId: activeMinisterioId,
        target,
        texto: message.trim()
      });

      showSuccess(`Aviso enviado para ${total} destinatario(s).`);
      setMessage('');
      setTarget('todos');
      setShowGeneralNoticeForm(false);
      await forceSync();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao enviar aviso geral.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="app-card relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl">
        <div className="border-app flex items-center justify-between border-b px-6 py-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand">
              {activeMinisterio?.nome || 'Ministerio'}
            </p>
            <h3 className="text-app mt-1 text-xl font-black uppercase tracking-tighter">
              Notificacoes
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="bg-app-surface-strong text-app-muted rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-colors hover:text-brand"
              >
                Marcar todas
              </button>
            )}
            <button
              onClick={handleClose}
              className="bg-app-surface-strong text-app-muted flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:text-red-500"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        <div className="border-app border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-app-surface-muted rounded-2xl px-4 py-3">
                <p className="text-app-muted text-[8px] font-black uppercase tracking-widest">Nao lidas</p>
                <p className="text-app mt-1 text-2xl font-black tracking-tight">{unreadCount}</p>
              </div>
              <div className="bg-app-surface-muted rounded-2xl px-4 py-3">
                <p className="text-app-muted text-[8px] font-black uppercase tracking-widest">Urgentes</p>
                <p className="text-app mt-1 text-2xl font-black tracking-tight">{urgentCount}</p>
              </div>
              <div className="bg-app-surface-muted rounded-2xl px-4 py-3">
                <p className="text-app-muted text-[8px] font-black uppercase tracking-widest">Escalas</p>
                <p className="text-app mt-1 text-2xl font-black tracking-tight">{weeklyScaleCount}</p>
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={handleSelectAllNotifications}
                className="bg-app-surface-strong text-app-muted rounded-2xl px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-colors hover:text-brand"
                >
                  {selectedCount === notifications.length ? 'Limpar selecao' : 'Selecionar todas'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selectedCount > 0 && (
                <button
                  onClick={handleDeleteSelectedNotifications}
                  className="rounded-2xl bg-red-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 transition-colors hover:bg-red-600"
                >
                  <i className="fas fa-trash mr-2"></i>
                  Excluir ({selectedCount})
                </button>
              )}

              <button
                onClick={() => setShowGeneralNoticeForm((previous) => !previous)}
                className="rounded-2xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-transform hover:scale-[1.01]"
              >
                <i className="fas fa-bullhorn mr-2"></i>
                Aviso Geral
              </button>
            </div>
          </div>

          {showGeneralNoticeForm && (
            <div className="bg-app-surface-muted border-app mt-4 rounded-2xl border p-4">
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <div>
                  <label className="text-app-muted mb-2 block text-[8px] font-black uppercase tracking-widest">
                    Destino
                  </label>
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value as GeneralNoticeTarget)}
                    className="app-input w-full rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="todos">Todos</option>
                    <option value="lideres">Somente lideres</option>
                  </select>
                </div>

                <div>
                  <label className="text-app-muted mb-2 block text-[8px] font-black uppercase tracking-widest">
                    Mensagem
                  </label>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    placeholder="Digite o aviso que sera enviado..."
                    className="app-input w-full rounded-xl px-3 py-3 text-xs font-medium outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => {
                    setShowGeneralNoticeForm(false);
                    setMessage('');
                    setTarget('todos');
                  }}
                  className="bg-app-surface-strong text-app rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitGeneralNotice}
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Aviso'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-app-surface-strong text-app-muted flex h-16 w-16 items-center justify-center rounded-full">
                <i className="fas fa-bell-slash text-xl"></i>
              </div>
              <p className="text-app-muted mt-4 text-[10px] font-black uppercase tracking-widest">
                Nenhuma notificacao
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-app-muted text-[10px] font-black uppercase tracking-widest">Novas</h4>
                  <span className="rounded-full bg-red-500 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                    {unreadNotifications.length}
                  </span>
                </div>
                {unreadNotifications.length === 0 ? (
                  <div className="bg-app-surface-muted border-app text-app-muted rounded-2xl border p-4 text-[10px] font-bold uppercase tracking-widest">
                    Nenhuma notificacao nova
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unreadNotifications.map((notification) => (
                      (() => {
                        const priority = getNotificationPriority(notification, today, tomorrow);
                        return (
                      <div
                        key={String(notification.id)}
                        className="rounded-2xl border border-brand/20 bg-brand/5 p-4 transition-colors dark:border-brand/30 dark:bg-brand/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => toggleNotificationSelection(notification.id)}
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              selectedSet.has(String(notification.id))
                                ? 'border-brand bg-brand text-white'
                                : 'border-app bg-app-surface text-transparent'
                            }`}
                            aria-label="Selecionar notificacao"
                          >
                            <i className="fas fa-check text-[9px]"></i>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="bg-app-surface rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest text-brand">
                                {notification.titulo || 'Notificacao'}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${priority.className}`}>
                                {priority.label}
                              </span>
                              <span className="rounded-full bg-red-500 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                                Nova
                              </span>
                            </div>

                            <p className="text-app text-sm font-bold">{notification.texto}</p>

                            <div className="text-app-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest">
                              <span>{getSenderName(notification.remetente_id)}</span>
                              <span>{formatNotificationTime(notification.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="bg-app-surface text-app-muted rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest shadow-sm transition-colors hover:text-brand"
                            >
                              Marcar
                            </button>
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              title="Excluir notificacao"
                              aria-label="Excluir notificacao"
                              className="bg-app-surface flex h-9 w-9 items-center justify-center rounded-xl text-red-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-app-muted text-[10px] font-black uppercase tracking-widest">Lidas</h4>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    {readNotifications.length}
                  </span>
                </div>
                {readNotifications.length === 0 ? (
                  <div className="bg-app-surface-muted border-app text-app-muted rounded-2xl border p-4 text-[10px] font-bold uppercase tracking-widest">
                    Nenhuma notificacao lida
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readNotifications.map((notification) => (
                      (() => {
                        const priority = getNotificationPriority(notification, today, tomorrow);
                        return (
                      <div
                        key={String(notification.id)}
                        className="bg-app-surface-muted border-app rounded-2xl border p-4 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => toggleNotificationSelection(notification.id)}
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                              selectedSet.has(String(notification.id))
                                ? 'border-brand bg-brand text-white'
                                : 'border-app bg-app-surface text-transparent'
                            }`}
                            aria-label="Selecionar notificacao"
                          >
                            <i className="fas fa-check text-[9px]"></i>
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="bg-app-surface rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest text-brand">
                                {notification.titulo || 'Notificacao'}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${priority.className}`}>
                                {priority.label}
                              </span>
                            </div>

                            <p className="text-app text-sm font-bold">{notification.texto}</p>

                            <div className="text-app-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest">
                              <span>{getSenderName(notification.remetente_id)}</span>
                              <span>{formatNotificationTime(notification.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="bg-app-surface text-app-muted rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest shadow-sm transition-colors hover:text-brand"
                            >
                              Lida
                            </button>
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              title="Excluir notificacao"
                              aria-label="Excluir notificacao"
                              className="bg-app-surface flex h-9 w-9 items-center justify-center rounded-xl text-red-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <i className="fas fa-trash text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenterModal;
