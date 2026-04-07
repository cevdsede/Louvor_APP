import React, { useState, useEffect } from 'react';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

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

  const handleClearAll = () => {
    if (confirm('Limpar todos os dados locais? Isso irá remover todo o cache.')) {
      LocalStorageFirstService.clearAll();
      window.location.reload();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-4 border border-slate-100 dark:border-slate-800">
      <h3 className="font-semibold text-sm mb-2 flex items-center">
        🏠 LocalStorage-First
        <span className={`ml-2 w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
      </h3>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-medium ${status.isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Tabelas em cache:</span>
          <span className="font-medium">{getTableCount()}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Tamanho do cache:</span>
          <span>{(getTotalCacheSize() / 1024).toFixed(1)} KB</span>
        </div>
        
        <div className="flex justify-between">
          <span>Operações pendentes:</span>
          <span className={`font-medium ${status.queueStats.pending > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
            {status.queueStats.pending + status.queueStats.retrying}
          </span>
        </div>
        
        {Object.keys(status.lastSyncTimes).length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Últimas sincronizações:</div>
            {Object.entries(status.lastSyncTimes).slice(0, 3).map(([table, time]) => (
              <div key={table} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{table}:</span>
                <span>{formatTime(time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleForceSync}
          disabled={!status.isOnline}
          className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Sync Agora
        </button>
        
        <button
          onClick={handleClearAll}
          className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
        >
          Limpar Tudo
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Dados sempre do localStorage 🏠
      </div>
    </div>
  );
};

export default LocalStorageStatus;
