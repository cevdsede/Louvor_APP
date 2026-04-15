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
  refreshInterval = 30000,
  enableBackgroundSync = true
}: LocalStorageFirstOptions) {
  const [state, setState] = useState<LocalStorageFirstState<T>>({
    data: [],
    loading: false,
    error: null,
    isOnline: navigator.onLine,
    lastSync: 0,
    pendingOperations: 0,
    isLocalStorageFirst: false
  });

  const loadData = useCallback(() => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const cachedData = LocalStorageFirstService.get<T>(table);

      setState((prev) => ({
        ...prev,
        data: cachedData,
        loading: false,
        lastSync: Date.now()
      }));

      if (navigator.onLine && enableBackgroundSync) {
        void LocalStorageFirstService.forceSync(table)
          .then(() => {
            const freshData = LocalStorageFirstService.get<T>(table);
            setState((prev) => ({
              ...prev,
              data: freshData,
              lastSync: Date.now()
            }));
          })
          .catch((error) => {
            console.error(`Erro ao sincronizar a tabela ${table}:`, error);
          });
      }

      return cachedData;
    } catch (error) {
      console.error(`Erro ao carregar dados da tabela ${table}:`, error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      }));
      return [];
    }
  }, [enableBackgroundSync, table]);

  const addItem = useCallback(
    (item: T) => {
      try {
        const result = LocalStorageFirstService.add<T>(table, item);

        setState((prev) => ({
          ...prev,
          data: [result, ...prev.data.filter((existing) => (existing as any).id !== (result as any).id)],
          pendingOperations: prev.pendingOperations + 1
        }));

        return result;
      } catch (error) {
        console.error('Erro ao adicionar item:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Erro ao adicionar item'
        }));
        throw error;
      }
    },
    [table]
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<T>) => {
      try {
        const result = LocalStorageFirstService.update<T>(table, id, updates);

        if (result) {
          setState((prev) => ({
            ...prev,
            data: prev.data.map((item) => ((item as any).id === id ? result : item)),
            pendingOperations: prev.pendingOperations + 1
          }));
        }

        return result;
      } catch (error) {
        console.error('Erro ao atualizar item:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Erro ao atualizar item'
        }));
        throw error;
      }
    },
    [table]
  );

  const removeItem = useCallback(
    (id: string) => {
      try {
        const success = LocalStorageFirstService.remove<T>(table, id);

        if (success) {
          setState((prev) => ({
            ...prev,
            data: prev.data.filter((item) => (item as any).id !== id),
            pendingOperations: prev.pendingOperations + 1
          }));
        }

        return success;
      } catch (error) {
        console.error('Erro ao remover item:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Erro ao remover item'
        }));
        throw error;
      }
    },
    [table]
  );

  const forceSync = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      await LocalStorageFirstService.forceSync(table);
      const data = LocalStorageFirstService.get<T>(table);

      setState((prev) => ({
        ...prev,
        data,
        loading: false,
        lastSync: Date.now(),
        pendingOperations: 0
      }));
    } catch (error) {
      console.error('Erro na sincronizacao forcada:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro na sincronizacao'
      }));
    }
  }, [table]);

  const clearData = useCallback(() => {
    LocalStorageFirstService.clearTable(table);
    setState((prev) => ({
      ...prev,
      data: [],
      lastSync: 0
    }));
  }, [table]);

  const replaceData = useCallback(
    (newData: T[]) => {
      LocalStorageFirstService.set(table, newData);
      setState((prev) => ({
        ...prev,
        data: newData,
        lastSync: Date.now()
      }));
    },
    [table]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh || !enableBackgroundSync) {
      return;
    }

    const interval = setInterval(() => {
      if (navigator.onLine) {
        void LocalStorageFirstService.forceSync(table)
          .then(() => {
            const freshData = LocalStorageFirstService.get<T>(table);
            setState((prev) => ({
              ...prev,
              data: freshData,
              lastSync: Date.now()
            }));
          })
          .catch(console.error);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, enableBackgroundSync, refreshInterval, table]);

  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));

      if (enableBackgroundSync) {
        void LocalStorageFirstService.forceSync(table)
          .then(() => {
            const freshData = LocalStorageFirstService.get<T>(table);
            setState((prev) => ({
              ...prev,
              data: freshData,
              lastSync: Date.now()
            }));
          })
          .catch(console.error);
      }
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableBackgroundSync, table]);

  useEffect(() => {
    const updatePendingOperations = () => {
      const status = LocalStorageFirstService.getStatus();
      setState((prev) => ({
        ...prev,
        pendingOperations: status.queueStats.pending + status.queueStats.retrying
      }));
    };

    updatePendingOperations();
    const interval = setInterval(updatePendingOperations, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    isOnline: state.isOnline,
    lastSync: state.lastSync,
    pendingOperations: state.pendingOperations,
    isLocalStorageFirst: state.isLocalStorageFirst,
    loadData,
    addItem,
    updateItem,
    removeItem,
    forceSync,
    clearData,
    replaceData,
    hasData: state.data.length > 0,
    hasError: !!state.error,
    isStale: Date.now() - state.lastSync > 120000,
    needsSync: state.pendingOperations > 0
  };
}

export default useLocalStorageFirst;
