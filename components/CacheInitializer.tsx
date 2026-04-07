import { useEffect, useState } from 'react';
import LocalStorageService from '../services/LocalStorageService';
import SyncService from '../services/SyncService';
import OfflineService from '../services/OfflineService';

interface CacheInitializerProps {
  children: React.ReactNode;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function CacheInitializer({ children, onReady, onError }: CacheInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Inicializando...');

  useEffect(() => {
    const initializeServices = async () => {
      try {
        setStatus('Inicializando serviços de cache...');
        
        // Inicializar LocalStorageService
        LocalStorageService.init();
        
        setStatus('Inicializando serviço offline...');
        
        // Inicializar OfflineService
        OfflineService.init();
        
        // Configurar callback para conflitos
        OfflineService.onConflict((conflict) => {
          console.warn('Conflito detectado:', conflict);
          // Aqui você pode mostrar uma notificação para o usuário
          // ou implementar uma estratégia de resolução automática
        });
        
        setStatus('Iniciando sincronização automática...');
        
        // Iniciar SyncService
        SyncService.start({
          enabled: true,
          interval: 5 * 60 * 1000, // 5 minutos
          retryAttempts: 3,
          retryDelay: 30 * 1000 // 30 segundos
        });
        
        setStatus('Verificando sincronização pendente...');
        
        // Processar operações pendentes se estiver online
        if (navigator.onLine) {
          await OfflineService.processPendingOperations();
        }
        
        setStatus('Serviços inicializados com sucesso!');
        setIsInitialized(true);
        
        onReady?.();
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        console.error('Erro ao inicializar serviços de cache:', err);
        
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initializeServices();
  }, [onReady, onError]);

  // Componente de loading
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Inicializando Sistema
            </h2>
            <p className="text-gray-600 text-sm">
              {status}
            </p>
            
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Componente para mostrar status de sincronização
export function SyncStatus() {
  const [status, setStatus] = useState({
    enabled: true,
    running: false,
    lastSync: 0,
    nextSync: 0,
    queueStats: { pending: 0, retrying: 0 }
  });
  const [offlineStats, setOfflineStats] = useState({
    pending: 0,
    conflicts: 0,
    failed: 0,
    isOnline: true
  });

  useEffect(() => {
    const updateStatus = () => {
      const syncStatus = SyncService.getStatus();
      const offlineStatus = OfflineService.getOfflineStats();
      
      setStatus(syncStatus);
      setOfflineStats(offlineStatus);
    };

    updateStatus();
    
    const interval = setInterval(updateStatus, 5000); // Atualizar a cada 5 segundos
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  const getTimeToNextSync = () => {
    if (!status.nextSync) return 'N/A';
    const ms = status.nextSync - Date.now();
    if (ms <= 0) return 'Agora';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
      <h3 className="font-semibold text-sm mb-2">Status de Sincronização</h3>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Conexão:</span>
          <span className={`font-medium ${offlineStats.isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {offlineStats.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Sincronização:</span>
          <span className={`font-medium ${status.running ? 'text-blue-600' : 'text-gray-600'}`}>
            {status.running ? 'Em andamento' : 'Parada'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Última sincronização:</span>
          <span>{formatTime(status.lastSync)}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Próxima sincronização:</span>
          <span>{getTimeToNextSync()}</span>
        </div>
        
        {(offlineStats.pending > 0 || offlineStats.conflicts > 0) && (
          <div className="pt-2 border-t">
            <div className="flex justify-between">
              <span>Operações pendentes:</span>
              <span className="font-medium text-orange-600">
                {offlineStats.pending + offlineStats.conflicts}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => SyncService.forceSync()}
          disabled={!offlineStats.isOnline}
          className="flex-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Forçar Sync
        </button>
        
        <button
          onClick={() => {
            LocalStorageService.clear();
            window.location.reload();
          }}
          className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
        >
          Limpar Cache
        </button>
      </div>
    </div>
  );
}

export default CacheInitializer;
