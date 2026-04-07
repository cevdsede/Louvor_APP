import { useEffect, useState } from 'react';
import LocalStorageFirstService from '../services/LocalStorageFirstService';

interface LocalStorageFirstInitializerProps {
  children: React.ReactNode;
  onReady?: () => void;
  onError?: (error: Error) => void;
  config?: {
    syncInterval?: number;
    enableBackgroundSync?: boolean;
    priorityLocal?: boolean;
  };
}

export function LocalStorageFirstInitializer({ 
  children, 
  onReady, 
  onError,
  config 
}: LocalStorageFirstInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Inicializando sistema localStorage-first...');

  useEffect(() => {
    const initializeServices = async () => {
      try {
        setStatus('Inicializando serviço localStorage-first...');
        
        // Inicializar LocalStorageFirstService
        LocalStorageFirstService.init(config);
        
        setStatus('Verificando dados locais...');
        
        // Verificar se há dados locais
        const status = LocalStorageFirstService.getStatus();
        const hasLocalData = Object.keys(status.cacheStats).length > 0;
        
        if (!hasLocalData) {
          setStatus('Buscando dados iniciais do servidor...');
          
          // Se não há dados locais, buscar do servidor
          await LocalStorageFirstService.forceSync();
        } else {
          setStatus('Dados locais encontrados, pronto para uso!');
          
          // Se há dados locais, iniciar sincronização em background
          if (navigator.onLine && config?.enableBackgroundSync !== false) {
            setTimeout(() => {
              LocalStorageFirstService.forceSync().catch(console.error);
            }, 2000); // Aguardar 2 segundos para não bloquear UI
          }
        }
        
        setStatus('Sistema localStorage-first inicializado com sucesso!');
        setIsInitialized(true);
        
        onReady?.();
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        console.error('Erro ao inicializar sistema localStorage-first:', err);
        
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initializeServices();
  }, [config, onReady, onError]);

  // Componente de loading
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Modo LocalStorage-First
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              {status}
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-blue-700 text-xs">
                <strong>Como funciona:</strong><br/>
                • Dados são carregados do localStorage instantaneamente<br/>
                • Sincronização com servidor ocorre em background<br/>
                • Aplicação funciona totalmente offline
              </p>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">
                  Erro: {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Tentar Novamente
                </button>
              </div>
            )}
            
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <div className={`w-2 h-2 rounded-full mr-2 ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {navigator.onLine ? 'Online' : 'Offline'}
              </div>
              <div className="text-xs text-gray-500">
                Prioridade: Dados Locais 🏠
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Componente para mostrar status localStorage-first
export function LocalStorageFirstStatus() {
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

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
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
          <div className="pt-2 border-t">
            <div className="text-xs text-gray-600 mb-1">Últimas sincronizações:</div>
            {Object.entries(status.lastSyncTimes).slice(0, 3).map(([table, time]) => (
              <div key={table} className="flex justify-between text-xs">
                <span className="text-gray-600">{table}:</span>
                <span>{formatTime(time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => LocalStorageFirstService.forceSync()}
          disabled={!status.isOnline}
          className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Sync Agora
        </button>
        
        <button
          onClick={() => {
            if (confirm('Limpar todos os dados locais? Isso irá remover todo o cache.')) {
              LocalStorageFirstService.clearAll();
              window.location.reload();
            }
          }}
          className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
        >
          Limpar Tudo
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Dados sempre do localStorage 🏠
      </div>
    </div>
  );
}

export default LocalStorageFirstInitializer;
