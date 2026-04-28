import React, { useEffect, useMemo, useState } from 'react';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { getImageCacheSize } from '../../utils/teamUtils';
import { showConfirmModal } from '../../utils/confirmModal';
import { showError, showSuccess } from '../../utils/toast';

const LocalStorageStatus: React.FC = () => {
  const [status, setStatus] = useState(() => LocalStorageFirstService.getStatus());
  const [imageCacheInfo, setImageCacheInfo] = useState(() => getImageCacheSize());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshStatus = () => {
    setStatus(LocalStorageFirstService.getStatus());
    setImageCacheInfo(getImageCacheSize());
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalCacheSize = useMemo(
    () => Object.values(status.cacheStats).reduce((total, stat) => total + stat.size, 0),
    [status.cacheStats]
  );
  const tableCount = Object.keys(status.cacheStats).length;
  const pendingCount = status.queueStats.pending + status.queueStats.retrying;
  const recentSyncErrors = status.syncErrors.slice(0, 3);
  const activeSyncLabel =
    status.activeSyncTables.length > 0
      ? status.activeSyncTables.slice(0, 3).join(', ')
      : status.isSyncing
      ? 'Sincronizacao completa em andamento'
      : 'Nenhuma';

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleForceSync = async () => {
    if (!status.isOnline || isSyncing) {
      return;
    }

    try {
      setIsSyncing(true);
      await LocalStorageFirstService.forceSync();
      refreshStatus();
      showSuccess('Dados sincronizados com sucesso.');
    } catch (error) {
      console.error('Erro ao forcar sincronizacao:', error);
      showError('Nao foi possivel sincronizar agora.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAll = async () => {
    const confirmed = await showConfirmModal({
      title: 'Limpar cache local',
      message: 'Todos os dados locais e imagens em cache serao removidos deste dispositivo. Depois disso, a tela sera recarregada.',
      confirmText: 'Limpar cache',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) {
      return;
    }

    LocalStorageFirstService.clearAll();
    window.location.reload();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <i className="fas fa-database text-lg text-white"></i>
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Cache Local</h3>
              <p className="text-xs text-white/80">LocalStorage-first</p>
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white ${
              status.isOnline ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {status.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="mb-1 flex items-center gap-2">
              <i className="fas fa-table text-xs text-blue-500"></i>
              <span className="text-xs text-slate-600 dark:text-slate-400">Tabelas</span>
            </div>
            <p className="text-lg font-black text-slate-800 dark:text-white">{tableCount}</p>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="mb-1 flex items-center gap-2">
              <i className="fas fa-image text-xs text-amber-500"></i>
              <span className="text-xs text-slate-600 dark:text-slate-400">Imagens</span>
            </div>
            <p className="text-lg font-black text-slate-800 dark:text-white">{imageCacheInfo.count}</p>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-2 flex items-center gap-2">
            <i className="fas fa-hdd text-xs text-purple-500"></i>
            <span className="text-xs text-slate-600 dark:text-slate-400">Uso de cache</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Dados</p>
              <p className="font-bold text-slate-800 dark:text-white">{(totalCacheSize / 1024).toFixed(1)} KB</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Imagens</p>
              <p className="font-bold text-slate-800 dark:text-white">{imageCacheInfo.sizeMB} MB</p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            pendingCount > 0
              ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
              : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={`fas fa-clock text-xs ${pendingCount > 0 ? 'text-orange-500' : 'text-slate-400'}`}></i>
              <span className="text-xs text-slate-600 dark:text-slate-400">Operacoes pendentes</span>
            </div>
            <span className={`text-sm font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
              {pendingCount}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <div className="mb-2 flex items-center gap-2">
            <i className={`fas ${status.isSyncing ? 'fa-spinner animate-spin' : 'fa-satellite-dish'} text-xs text-cyan-500`}></i>
            <span className="text-xs text-slate-600 dark:text-slate-400">Sincronizacao</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Estado</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {status.isSyncing ? 'Em andamento' : 'Aguardando'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Auto sync</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {status.backgroundSyncEnabled ? 'Ativo' : 'Inativo'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 dark:text-slate-400">Tabelas ativas</p>
              <p className="truncate font-bold text-slate-800 dark:text-white">{activeSyncLabel}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Ultima completa</p>
              <p className="font-bold text-slate-800 dark:text-white">{formatTime(status.lastFullSync)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Proxima auto</p>
              <p className="font-bold text-slate-800 dark:text-white">{formatTime(status.nextBackgroundSync)}</p>
            </div>
          </div>
        </div>

        {Object.keys(status.lastSyncTimes).length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="mb-2 flex items-center gap-2">
              <i className="fas fa-sync text-xs text-green-500"></i>
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Ultimas sincronizacoes
              </span>
            </div>
            <div className="space-y-1">
              {Object.entries(status.lastSyncTimes).slice(0, 4).map(([table, time]) => (
                <div key={table} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-slate-600 dark:text-slate-400">{table}</span>
                  <span className="font-medium text-slate-500">{formatTime(time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentSyncErrors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
            <div className="mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle text-xs text-red-500"></i>
              <span className="text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-200">
                Erros recentes
              </span>
            </div>
            <div className="space-y-2">
              {recentSyncErrors.map((error) => (
                <div key={`${error.table}-${error.timestamp}`} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-red-700 dark:text-red-200">{error.table}</span>
                    <span className="shrink-0 text-red-500 dark:text-red-300">{formatTime(error.timestamp)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-red-600 dark:text-red-200">{error.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={handleForceSync}
              disabled={!status.isOnline || isSyncing}
              className="rounded-xl bg-brand px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700"
            >
              <i className={`fas ${isSyncing ? 'fa-spinner animate-spin' : 'fa-sync-alt'} mr-2`}></i>
              {isSyncing ? 'Sincronizando' : 'Sincronizar'}
            </button>

            <button
              onClick={handleClearAll}
              className="rounded-xl bg-slate-100 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            >
              <i className="fas fa-trash-alt mr-2"></i>
              Limpar cache
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <i className="fas fa-home"></i>
            <span>Dados sempre disponiveis offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalStorageStatus;
