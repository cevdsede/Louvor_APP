import { useState, useEffect, useCallback } from 'react';
import LocalStorageFirstService from '../services/LocalStorageFirstService';

interface LocalStorageFirstOptions {
  table: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableBackgroundSync?: boolean;
}

interface LocalStorageFirstState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  lastSync: number;
  pendingOperations: number;
  isLocalStorageFirst: boolean;
}

export function useLocalStorageFirst<T>({
  table,
  autoRefresh = true,
  refreshInterval = 30000, // 30 segundos
  enableBackgroundSync = true
}: LocalStorageFirstOptions) {
  const [state, setState] = useState<LocalStorageFirstState<T>>({
    data: [],
    loading: false,
    error: null,
    isOnline: navigator.onLine,
    lastSync: 0,
    pendingOperations: 0,
    isLocalStorageFirst: true
  });

  // Carregar dados do localStorage
  const loadData = useCallback(() => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // SEMPRE obter do localStorage primeiro
      const data = LocalStorageFirstService.get<T>(table);
      
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        lastSync: Date.now()
      }));

      return data;
    } catch (error) {
      console.error(`Erro ao carregar dados da tabela ${table}:`, error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      }));
      return [];
    }
  }, [table]);

  // Adicionar item - salva localmente imediatamente
  const addItem = useCallback((item: T) => {
    try {
      const result = LocalStorageFirstService.add<T>(table, item);
      
      setState(prev => ({
        ...prev,
        data: [result, ...prev.data],
        pendingOperations: prev.pendingOperations + 1
      }));

      return result;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao adicionar item'
      }));
      throw error;
    }
  }, [table]);

  // Atualizar item - atualiza localmente imediatamente
  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    try {
      const result = LocalStorageFirstService.update<T>(table, id, updates);
      
      if (result) {
        setState(prev => ({
          ...prev,
          data: prev.data.map(item => 
            (item as any).id === id ? result : item
          ),
          pendingOperations: prev.pendingOperations + 1
        }));
      }

      return result;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao atualizar item'
      }));
      throw error;
    }
  }, [table]);

  // Remover item - remove localmente imediatamente
  const removeItem = useCallback((id: string) => {
    try {
      const success = LocalStorageFirstService.remove<T>(table, id);
      
      if (success) {
        setState(prev => ({
          ...prev,
          data: prev.data.filter(item => (item as any).id !== id),
          pendingOperations: prev.pendingOperations + 1
        }));
      }

      return success;
    } catch (error) {
      console.error('Erro ao remover item:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao remover item'
      }));
      throw error;
    }
  }, [table]);

  // Forçar sincronização com servidor
  const forceSync = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      await LocalStorageFirstService.forceSync(table);
      
      // Recarregar dados após sincronização
      const data = loadData();
      
      setState(prev => ({
        ...prev,
        data,
        loading: false,
        lastSync: Date.now(),
        pendingOperations: 0
      }));
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro na sincronização'
      }));
    }
  }, [table, loadData]);

  // Limpar dados locais
  const clearData = useCallback(() => {
    LocalStorageFirstService.clearTable(table);
    setState(prev => ({
      ...prev,
      data: [],
      lastSync: 0
    }));
  }, [table]);

  // Substituir todos os dados localmente
  const replaceData = useCallback((newData: T[]) => {
    LocalStorageFirstService.set(table, newData);
    setState(prev => ({
      ...prev,
      data: newData,
      lastSync: Date.now()
    }));
  }, [table]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Efeito para auto refresh (sincronização em background)
  useEffect(() => {
    if (!autoRefresh || !enableBackgroundSync) return;

    const interval = setInterval(() => {
      // Silently sync in background - não atualiza o estado a menos que necessário
      if (navigator.onLine) {
        LocalStorageFirstService.forceSync(table).catch(console.error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, enableBackgroundSync, table]);

  // Efeito para monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Quando voltar online, tentar sincronizar
      if (enableBackgroundSync) {
        LocalStorageFirstService.forceSync(table).catch(console.error);
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
  }, [enableBackgroundSync, table]);

  // Efeito para atualizar contador de operações pendentes
  useEffect(() => {
    const updatePendingOperations = () => {
      const status = LocalStorageFirstService.getStatus();
      setState(prev => ({
        ...prev,
        pendingOperations: status.queueStats.pending + status.queueStats.retrying
      }));
    };

    const interval = setInterval(updatePendingOperations, 3000); // Atualizar a cada 3 segundos
    updatePendingOperations(); // Atualizar imediatamente

    return () => clearInterval(interval);
  }, []);

  return {
    // Estado
    data: state.data,
    loading: state.loading,
    error: state.error,
    isOnline: state.isOnline,
    lastSync: state.lastSync,
    pendingOperations: state.pendingOperations,
    isLocalStorageFirst: state.isLocalStorageFirst,

    // Ações (todas operam localmente primeiro)
    loadData,
    addItem,
    updateItem,
    removeItem,
    forceSync,
    clearData,
    replaceData,

    // Utilitários
    hasData: state.data.length > 0,
    hasError: !!state.error,
    isStale: Date.now() - state.lastSync > 120000, // Considera obsoleto após 2 minutos
    needsSync: state.pendingOperations > 0
  };
}

export default useLocalStorageFirst;
