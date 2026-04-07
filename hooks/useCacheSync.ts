import { useState, useEffect, useCallback } from 'react';
import LocalStorageService from '../services/LocalStorageService';
import SyncService from '../services/SyncService';
import OfflineService from '../services/OfflineService';

interface CacheSyncOptions {
  table: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableOffline?: boolean;
}

interface CacheSyncState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastSync: number;
  isOnline: boolean;
  pendingOperations: number;
}

export function useCacheSync<T>({
  table,
  autoRefresh = true,
  refreshInterval = 30000, // 30 segundos
  enableOffline = true
}: CacheSyncOptions) {
  const [state, setState] = useState<CacheSyncState<T>>({
    data: [],
    loading: true,
    error: null,
    lastSync: 0,
    isOnline: navigator.onLine,
    pendingOperations: 0
  });

  // Carregar dados do cache
  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Tentar obter do cache primeiro
      const cached = LocalStorageService.get<T[]>(table);
      
      if (cached) {
        setState(prev => ({
          ...prev,
          data: cached,
          loading: false,
          lastSync: Date.now()
        }));
      }

      // Forçar sincronização se estiver online
      if (navigator.onLine) {
        await SyncService.forceSyncTable(table);
        const updated = LocalStorageService.get<T[]>(table);
        
        if (updated) {
          setState(prev => ({
            ...prev,
            data: updated,
            lastSync: Date.now()
          }));
        }
      }

    } catch (error) {
      console.error(`Erro ao carregar dados da tabela ${table}:`, error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      }));
    }
  }, [table]);

  // Atualizar dados localmente
  const updateLocalData = useCallback((newData: T[]) => {
    LocalStorageService.set(table, newData);
    setState(prev => ({
      ...prev,
      data: newData,
      lastSync: Date.now()
    }));
  }, [table]);

  // Adicionar item
  const addItem = useCallback(async (item: Omit<T, 'id'>) => {
    try {
      if (enableOffline) {
        const result = await OfflineService.executeOperation<T>(
          table,
          'create',
          item
        );
        
        setState(prev => ({
          ...prev,
          data: [result, ...prev.data],
          pendingOperations: prev.pendingOperations + 1
        }));
        
        return result;
      } else {
        // Implementação online direta
        throw new Error('Modo offline desabilitado');
      }
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao adicionar item'
      }));
      throw error;
    }
  }, [table, enableOffline]);

  // Atualizar item
  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      if (enableOffline) {
        const result = await OfflineService.executeOperation<T>(
          table,
          'update',
          updates,
          id
        );
        
        setState(prev => ({
          ...prev,
          data: prev.data.map(item => 
            (item as any).id === id ? result : item
          ),
          pendingOperations: prev.pendingOperations + 1
        }));
        
        return result;
      } else {
        throw new Error('Modo offline desabilitado');
      }
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao atualizar item'
      }));
      throw error;
    }
  }, [table, enableOffline]);

  // Remover item
  const removeItem = useCallback(async (id: string) => {
    try {
      if (enableOffline) {
        await OfflineService.executeOperation(
          table,
          'delete',
          { id },
          id
        );
        
        setState(prev => ({
          ...prev,
          data: prev.data.filter(item => (item as any).id !== id),
          pendingOperations: prev.pendingOperations + 1
        }));
      } else {
        throw new Error('Modo offline desabilitado');
      }
    } catch (error) {
      console.error('Erro ao remover item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao remover item'
      }));
      throw error;
    }
  }, [table, enableOffline]);

  // Forçar sincronização
  const forceSync = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (navigator.onLine) {
        await SyncService.forceSyncTable(table);
        await OfflineService.forceSync();
        
        const data = LocalStorageService.get<T[]>(table) || [];
        
        setState(prev => ({
          ...prev,
          data,
          loading: false,
          lastSync: Date.now(),
          pendingOperations: 0
        }));
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Dispositivo offline'
        }));
      }
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro na sincronização'
      }));
    }
  }, [table]);

  // Limpar cache
  const clearCache = useCallback(() => {
    LocalStorageService.remove(table);
    setState(prev => ({
      ...prev,
      data: [],
      lastSync: 0
    }));
  }, [table]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Efeito para auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Efeito para monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      if (enableOffline) {
        OfflineService.forceSync();
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableOffline]);

  // Efeito para atualizar contador de operações pendentes
  useEffect(() => {
    const updatePendingOperations = () => {
      const stats = OfflineService.getOfflineStats();
      setState(prev => ({
        ...prev,
        pendingOperations: stats.pending + stats.conflicts
      }));
    };

    const interval = setInterval(updatePendingOperations, 5000); // Atualizar a cada 5 segundos
    updatePendingOperations(); // Atualizar imediatamente

    return () => clearInterval(interval);
  }, []);

  return {
    // Estado
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastSync: state.lastSync,
    isOnline: state.isOnline,
    pendingOperations: state.pendingOperations,

    // Ações
    loadData,
    updateLocalData,
    addItem,
    updateItem,
    removeItem,
    forceSync,
    clearCache,

    // Utilitários
    isStale: Date.now() - state.lastSync > 60000, // Considera obsoleto após 1 minuto
    hasData: state.data.length > 0,
    hasError: !!state.error
  };
}

export default useCacheSync;
