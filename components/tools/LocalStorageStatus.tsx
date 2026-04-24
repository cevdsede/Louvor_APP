import React, { useState, useEffect } from 'react';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { getImageCacheSize } from '../../utils/teamUtils';
import { showConfirmModal } from '../../utils/confirmModal';

const LocalStorageStatus: React.FC = () => {
  const [status, setStatus] = useState({
    isInitialized: false,
    isOnline: navigator.onLine,
    lastSyncTimes: {} as { [table: string]: number },
    queueStats: { pending: 0, retrying: 0 },
    cacheStats: {} as { [table: string]: { size: number; timestamp: number; valid: boolean } }
  });

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = LocalStorageFirstService.getStatus();
      setStatus(currentStatus);
    };

    updateStatus();
    
    const interval = setInterval(updateStatus, 3000); // Atualizar a cada 3 segundos
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  const getTotalCacheSize = () => {
    return Object.values(status.cacheStats).reduce((total, stat) => total + stat.size, 0);
  };

  const getTableCount = () => {
    return Object.keys(status.cacheStats).length;
  };

  const [imageCacheInfo, setImageCacheInfo] = useState(() => getImageCacheSize());

  useEffect(() => {
    const interval = setInterval(() => {
      setImageCacheInfo(getImageCacheSize());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    try {
      await LocalStorageFirstService.forceSync();
      // Forçar atualização do status
      const currentStatus = LocalStorageFirstService.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Erro ao forçar sincronização:', error);
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <i className="fas fa-database text-white text-lg"></i>
            </div>
            <div>
              <h3 className="font-black text-white text-sm uppercase tracking-wider">Cache Local</h3>
              <p className="text-white/80 text-xs">LocalStorage-First</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            status.isOnline 
              ? 'bg-emerald-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {status.isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-table text-blue-500 text-xs"></i>
              <span className="text-xs text-slate-600 dark:text-slate-400">Tabelas</span>
            </div>
            <p className="text-lg font-black text-slate-800 dark:text-white">{getTableCount()}</p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-image text-amber-500 text-xs"></i>
              <span className="text-xs text-slate-600 dark:text-slate-400">Imagens</span>
            </div>
            <p className="text-lg font-black text-slate-800 dark:text-white">{imageCacheInfo.count}</p>
          </div>
        </div>

        {/* Cache Size Details */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-hdd text-purple-500 text-xs"></i>
            <span className="text-xs text-slate-600 dark:text-slate-400">Uso de Cache</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Dados:</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {(getTotalCacheSize() / 1024).toFixed(1)} KB
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Imagens:</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {imageCacheInfo.sizeMB} MB
              </p>
            </div>
          </div>
        </div>

        {/* Pending Operations */}
        <div className={`rounded-lg p-3 border ${
          status.queueStats.pending > 0 
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className={`fas fa-clock text-xs ${
                status.queueStats.pending > 0 ? 'text-orange-500' : 'text-slate-400'
              }`}></i>
              <span className="text-xs text-slate-600 dark:text-slate-400">Operações Pendentes</span>
            </div>
            <span className={`font-bold text-sm ${
              status.queueStats.pending > 0 ? 'text-orange-600' : 'text-slate-600'
            }`}>
              {status.queueStats.pending + status.queueStats.retrying}
            </span>
          </div>
        </div>

        {/* Recent Syncs */}
        {Object.keys(status.lastSyncTimes).length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-sync text-green-500 text-xs"></i>
              <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Últimas Sincronizações
              </span>
            </div>
            <div className="space-y-1">
              {Object.entries(status.lastSyncTimes).slice(0, 3).map(([table, time]) => (
                <div key={table} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 capitalize">{table}</span>
                  <span className="text-slate-500 dark:text-slate-500 font-medium">
                    {formatTime(time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <i className="fas fa-home"></i>
            <span>Dados sempre disponíveis offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalStorageStatus;
