import React, { useEffect, useMemo, useState } from 'react';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

const OfflineSyncBanner: React.FC = () => {
  const [status, setStatus] = useState(() => LocalStorageFirstService.getStatus());

  useEffect(() => {
    const refresh = () => setStatus(LocalStorageFirstService.getStatus());
    refresh();

    const interval = window.setInterval(refresh, 3000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  const pendingCount = status.queueStats.pending + status.queueStats.retrying;

  const state = useMemo(() => {
    if (!status.isOnline) {
      return {
        icon: 'fa-wifi',
        label: 'Modo offline',
        detail: pendingCount > 0 ? `${pendingCount} alteracoes aguardando internet` : 'Usando dados salvos neste dispositivo',
        className:
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200'
      };
    }

    if (pendingCount > 0) {
      return {
        icon: status.isSyncing ? 'fa-sync-alt animate-spin' : 'fa-clock',
        label: status.isSyncing ? 'Enviando alteracoes' : 'Sincronizacao pendente',
        detail: status.isSyncing ? `${pendingCount} alteracoes sendo enviadas` : `${pendingCount} alteracoes na fila`,
        className:
          'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-200'
      };
    }

    return null;
  }, [pendingCount, status.isOnline, status.isSyncing]);

  if (!state) {
    return null;
  }

  return (
    <div className={`border-b px-4 py-2 sm:px-6 lg:px-8 ${state.className}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 text-xs">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-slate-900/50">
          <i className={`fas ${state.icon}`}></i>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black uppercase tracking-[0.16em]">{state.label}</p>
          <p className="truncate opacity-80">{state.detail}</p>
        </div>
      </div>
    </div>
  );
};

export default OfflineSyncBanner;
