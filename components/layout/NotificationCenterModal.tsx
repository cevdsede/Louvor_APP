import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import AvisoGeralService, { AvisoGeral, AvisoGeralDestino } from '../../services/AvisoGeralService';
import { showError, showSuccess } from '../../utils/toast';
import { getDisplayName } from '../../utils/displayName';

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

const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ onClose }) => {
  const { currentMember, activeMinisterio, activeMinisterioId } = useMinistryContext();
  const { data: avisosRaw, forceSync, loadData } = useLocalStorageFirst<AvisoGeral>({ table: 'aviso_geral' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const [showGeneralNoticeForm, setShowGeneralNoticeForm] = useState(false);
  const [target, setTarget] = useState<AvisoGeralDestino>('todos');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notifications = useMemo(() => {
    if (!currentMember?.id) {
      return [];
    }

    return (avisosRaw || [])
      .filter(
        (aviso) =>
          aviso.id_membro === currentMember.id &&
          (!activeMinisterioId || !aviso.ministerio_id || aviso.ministerio_id === activeMinisterioId)
      )
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [activeMinisterioId, avisosRaw, currentMember?.id]);

  const unreadNotifications = notifications.filter((aviso) => !aviso.lida);
  const readNotifications = notifications.filter((aviso) => aviso.lida);
  const unreadCount = unreadNotifications.length;

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
    await AvisoGeralService.markAsRead(id);
    await forceSync();
  };

  const handleMarkAllAsRead = async () => {
    await AvisoGeralService.markAllAsRead(activeMinisterioId);
    loadData();
  };

  const handleClose = async () => {
    if (unreadNotifications.length > 0) {
      await AvisoGeralService.markAllAsRead(activeMinisterioId);
      loadData();
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
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand">
              {activeMinisterio?.nome || 'Ministerio'}
            </p>
            <h3 className="mt-1 text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Notificacoes
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Marcar todas
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-red-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Nao lidas</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{unreadCount}</p>
            </div>

            <button
              onClick={() => setShowGeneralNoticeForm((previous) => !previous)}
              className="rounded-2xl bg-brand px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-transform hover:scale-[1.01]"
            >
              <i className="fas fa-bullhorn mr-2"></i>
              Aviso Geral
            </button>
          </div>

          {showGeneralNoticeForm && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <div>
                  <label className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Destino
                  </label>
                  <select
                    value={target}
                    onChange={(event) => setTarget(event.target.value as AvisoGeralDestino)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="todos">Todos</option>
                    <option value="lideres">Somente lideres</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[8px] font-black uppercase tracking-widest text-slate-400">
                    Mensagem
                  </label>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    placeholder="Digite o aviso que sera enviado..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
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
                  className="rounded-xl bg-slate-200 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-600 dark:bg-slate-700 dark:text-slate-200"
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
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <i className="fas fa-bell-slash text-xl"></i>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nenhuma notificacao
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Novas</h4>
                  <span className="rounded-full bg-red-500 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                    {unreadNotifications.length}
                  </span>
                </div>
                {unreadNotifications.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    Nenhuma notificacao nova
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unreadNotifications.map((notification) => (
                      <div
                        key={String(notification.id)}
                        className="rounded-2xl border border-brand/20 bg-brand/5 p-4 transition-colors dark:border-brand/30 dark:bg-brand/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-brand dark:bg-slate-900/70">
                                {notification.titulo || 'Notificacao'}
                              </span>
                              <span className="rounded-full bg-red-500 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                                Nova
                              </span>
                            </div>

                            <p className="text-sm font-bold text-slate-800 dark:text-white">{notification.texto}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              <span>{getSenderName(notification.remetente_id)}</span>
                              <span>{formatNotificationTime(notification.created_at)}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Marcar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lidas</h4>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    {readNotifications.length}
                  </span>
                </div>
                {readNotifications.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                    Nenhuma notificacao lida
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readNotifications.map((notification) => (
                      <div
                        key={String(notification.id)}
                        className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-brand dark:bg-slate-900/70">
                                {notification.titulo || 'Notificacao'}
                              </span>
                            </div>

                            <p className="text-sm font-bold text-slate-800 dark:text-white">{notification.texto}</p>

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              <span>{getSenderName(notification.remetente_id)}</span>
                              <span>{formatNotificationTime(notification.created_at)}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Lida
                          </button>
                        </div>
                      </div>
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
