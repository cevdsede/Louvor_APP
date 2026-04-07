import { supabase } from '../supabaseClient';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  lastSync: number;
  version: number;
}

interface SyncQueue {
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount?: number;
}

class LocalStorageService {
  private static readonly CACHE_PREFIX = 'louvor_cache_';
  private static readonly SYNC_QUEUE_KEY = 'louvor_sync_queue';
  private static readonly OFFLINE_MODE_KEY = 'louvor_offline_mode';
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos
  private static syncTimer: NodeJS.Timeout | null = null;
  private static isOnline = navigator.onLine;

  // Inicializar o serviço
  static init() {
    // Listener para conexão
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.setOfflineMode(false);
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setOfflineMode(true);
    });

    // Iniciar sincronização automática
    this.startAutoSync();
  }

  // Obter dados do cache
  static get<T>(table: string): T | null {
    try {
      const cacheKey = this.CACHE_PREFIX + table;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Verificar se o cache expirou
      if (Date.now() - cacheItem.timestamp > this.CACHE_TTL) {
        this.remove(table);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error(`Erro ao ler cache da tabela ${table}:`, error);
      return null;
    }
  }

  // Salvar dados no cache
  static set<T>(table: string, data: T): void {
    try {
      const cacheKey = this.CACHE_PREFIX + table;
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        lastSync: Date.now(),
        version: 1
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.error(`Erro ao salvar cache da tabela ${table}:`, error);
    }
  }

  // Remover cache específico
  static remove(table: string): void {
    try {
      const cacheKey = this.CACHE_PREFIX + table;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error(`Erro ao remover cache da tabela ${table}:`, error);
    }
  }

  // Limpar todo o cache
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      localStorage.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  // Verificar se dados estão em cache e são válidos
  static isValid(table: string): boolean {
    const cached = this.get(table);
    return cached !== null;
  }

  // Adicionar ação à fila de sincronização
  static addToSyncQueue(table: string, action: 'create' | 'update' | 'delete', data: any): void {
    try {
      const queue = this.getSyncQueue();
      queue.push({
        table,
        action,
        data,
        timestamp: Date.now(),
        retryCount: 0
      });

      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));

      // Tentar sincronizar imediatamente se estiver online
      if (this.isOnline) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('Erro ao adicionar à fila de sincronização:', error);
    }
  }

  // Obter fila de sincronização
  static getSyncQueue(): SyncQueue[] {
    try {
      const queue = localStorage.getItem(this.SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Erro ao obter fila de sincronização:', error);
      return [];
    }
  }

  // Processar fila de sincronização
  static async processSyncQueue(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const queue = this.getSyncQueue();
      if (queue.length === 0) return;

      const processed: string[] = [];

      for (const item of queue) {
        try {
          await this.syncItem(item);
          processed.push(JSON.stringify(item));
        } catch (error) {
          console.error(`Erro ao sincronizar item da tabela ${item.table}:`, error);
          
          // Incrementar contador de tentativas
          item.retryCount = (item.retryCount || 0) + 1;
          
          // Remover item se excedeu tentativas (5 tentativas)
          if (item.retryCount > 5) {
            processed.push(JSON.stringify(item));
            console.warn(`Item removido da fila após 5 tentativas:`, item);
          }
        }
      }

      // Remover itens processados
      const newQueue = queue.filter(item => !processed.includes(JSON.stringify(item)));
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(newQueue));

    } catch (error) {
      console.error('Erro ao processar fila de sincronização:', error);
    }
  }

  // Sincronizar item individual
  private static async syncItem(item: SyncQueue): Promise<void> {
    const { table, action, data } = item;
    
    try {
      if (action === 'create') {
        const { error } = await supabase.from(table).insert(data);
        if (error) throw error;
      } else if (action === 'update') {
        const { id, ...updates } = data;
        if (!id) throw new Error('ID não fornecido para atualização');
        const { error } = await supabase.from(table).update(updates).eq('id', id);
        if (error) throw error;
      } else if (action === 'delete') {
        const id = typeof data === 'string' ? data : data.id;
        if (!id) throw new Error('ID não fornecido para exclusão');
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      }
      
      console.log(`✅ Sucesso ao sincronizar ${action} na tabela ${table}`);
    } catch (error) {
      throw error;
    }
  }

  // Iniciar sincronização automática
  static startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  // Parar sincronização automática
  static stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // Modo offline
  static setOfflineMode(offline: boolean): void {
    localStorage.setItem(this.OFFLINE_MODE_KEY, JSON.stringify(offline));
  }

  static isOfflineMode(): boolean {
    try {
      const offline = localStorage.getItem(this.OFFLINE_MODE_KEY);
      return offline ? JSON.parse(offline) : false;
    } catch (error) {
      return false;
    }
  }

  // Forçar sincronização manual
  static async forceSync(): Promise<void> {
    await this.processSyncQueue();
  }

  // Obter status do cache
  static getCacheStatus(): { [table: string]: { size: number; timestamp: number; valid: boolean } } {
    const status: { [table: string]: { size: number; timestamp: number; valid: boolean } } = {};
    
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const table = key.replace(this.CACHE_PREFIX, '');
          const cached = localStorage.getItem(key);
          
          if (cached) {
            const cacheItem: CacheItem<any> = JSON.parse(cached);
            const valid = Date.now() - cacheItem.timestamp <= this.CACHE_TTL;
            
            status[table] = {
              size: cached.length,
              timestamp: cacheItem.timestamp,
              valid
            };
          }
        }
      });
    } catch (error) {
      console.error('Erro ao obter status do cache:', error);
    }

    return status;
  }

  // Estatísticas da fila de sincronização
  static getSyncQueueStats(): { pending: number; retrying: number } {
    const queue = this.getSyncQueue();
    const pending = queue.filter(item => !item.retryCount || item.retryCount === 0).length;
    const retrying = queue.filter(item => item.retryCount && item.retryCount > 0).length;

    return { pending, retrying };
  }
}

export default LocalStorageService;
