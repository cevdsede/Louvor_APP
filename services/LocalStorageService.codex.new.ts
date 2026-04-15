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
  private static readonly SYNC_INTERVAL = 5 * 60 * 1000;
  private static readonly CACHE_TTL = 30 * 60 * 1000;
  private static readonly PRIMARY_KEYS: Record<string, string> = {
    avisos_cultos: 'id_lembrete',
    eventos: 'id_evento',
    presenca_evento: 'id_chamada'
  };

  private static syncTimer: NodeJS.Timeout | null = null;
  private static isOnline = navigator.onLine;
  private static isInitialized = false;

  static init() {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.setOfflineMode(!navigator.onLine);

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.setOfflineMode(false);
      void this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.setOfflineMode(true);
    });

    this.startAutoSync();
  }

  static get<T>(table: string): T | null {
    try {
      const cacheKey = this.CACHE_PREFIX + table;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      return cacheItem.data;
    } catch (error) {
      console.error(`Erro ao ler cache da tabela ${table}:`, error);
      return null;
    }
  }

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

  static remove(table: string): void {
    try {
      localStorage.removeItem(this.CACHE_PREFIX + table);
    } catch (error) {
      console.error(`Erro ao remover cache da tabela ${table}:`, error);
    }
  }

  static clear(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX) || key.startsWith('image_cache_')) {
          localStorage.removeItem(key);
        }
      });

      localStorage.removeItem(this.SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  static isValid(table: string): boolean {
    try {
      const cacheKey = this.CACHE_PREFIX + table;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return false;
      }

      const cacheItem: CacheItem<unknown> = JSON.parse(cached);
      return Date.now() - cacheItem.timestamp <= this.CACHE_TTL;
    } catch (error) {
      console.error(`Erro ao validar cache da tabela ${table}:`, error);
      return false;
    }
  }

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

      if (this.isOnline) {
        void this.processSyncQueue();
      }
    } catch (error) {
      console.error('Erro ao adicionar a fila de sincronizacao:', error);
    }
  }

  static getSyncQueue(): SyncQueue[] {
    try {
      const queue = localStorage.getItem(this.SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Erro ao obter fila de sincronizacao:', error);
      return [];
    }
  }

  static async processSyncQueue(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    try {
      const queue = this.getSyncQueue();
      if (queue.length === 0) {
        return;
      }

      const processed = new Set<number>();

      for (const [index, item] of queue.entries()) {
        try {
          await this.syncItem(item);
          processed.add(index);
        } catch (error) {
          console.error(`Erro ao sincronizar item da tabela ${item.table}:`, error);

          item.retryCount = (item.retryCount || 0) + 1;
          if (item.retryCount > 5) {
            processed.add(index);
            console.warn('Item removido da fila apos 5 tentativas:', item);
          }
        }
      }

      const nextQueue = queue.filter((_, index) => !processed.has(index));
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(nextQueue));
    } catch (error) {
      console.error('Erro ao processar fila de sincronizacao:', error);
    }
  }

  private static async syncItem(item: SyncQueue): Promise<void> {
    const { table, action, data } = item;
    const primaryKey = this.getPrimaryKey(table);
    const recordId = this.getRecordId(table, data);

    if (action === 'create') {
      const payload = this.normalizeCreatePayload(table, data);
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      return;
    }

    if (action === 'update') {
      if (!recordId) {
        throw new Error('ID nao fornecido para atualizacao');
      }

      const updates = this.normalizeUpdatePayload(table, data);
      const { error } = await supabase.from(table).update(updates).eq(primaryKey, recordId);
      if (error) throw error;
      return;
    }

    if (!recordId) {
      throw new Error('ID nao fornecido para exclusao');
    }

    const { error } = await supabase.from(table).delete().eq(primaryKey, recordId);
    if (error) throw error;
  }

  static startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        void this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  static stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  static setOfflineMode(offline: boolean): void {
    localStorage.setItem(this.OFFLINE_MODE_KEY, JSON.stringify(offline));
  }

  static isOfflineMode(): boolean {
    try {
      const offline = localStorage.getItem(this.OFFLINE_MODE_KEY);
      return offline ? JSON.parse(offline) : false;
    } catch {
      return false;
    }
  }

  static async forceSync(): Promise<void> {
    await this.processSyncQueue();
  }

  static getCacheStatus(): { [table: string]: { size: number; timestamp: number; valid: boolean } } {
    const status: { [table: string]: { size: number; timestamp: number; valid: boolean } } = {};

    try {
      Object.keys(localStorage).forEach((key) => {
        if (!key.startsWith(this.CACHE_PREFIX)) {
          return;
        }

        const table = key.replace(this.CACHE_PREFIX, '');
        const cached = localStorage.getItem(key);
        if (!cached) {
          return;
        }

        const cacheItem: CacheItem<any> = JSON.parse(cached);
        status[table] = {
          size: cached.length,
          timestamp: cacheItem.timestamp,
          valid: Date.now() - cacheItem.timestamp <= this.CACHE_TTL
        };
      });
    } catch (error) {
      console.error('Erro ao obter status do cache:', error);
    }

    return status;
  }

  static getSyncQueueStats(): { pending: number; retrying: number } {
    const queue = this.getSyncQueue();
    const pending = queue.filter((item) => !item.retryCount || item.retryCount === 0).length;
    const retrying = queue.filter((item) => item.retryCount && item.retryCount > 0).length;
    return { pending, retrying };
  }

  private static getPrimaryKey(table: string): string {
    return this.PRIMARY_KEYS[table] || 'id';
  }

  private static getRecordId(table: string, data: any): string | number | undefined {
    if (typeof data === 'string' || typeof data === 'number') {
      return data;
    }

    const primaryKey = this.getPrimaryKey(table);
    return data?.[primaryKey] ?? data?.id;
  }

  private static normalizeCreatePayload(table: string, data: any): Record<string, any> {
    const payload = { ...(data || {}) };
    const primaryKey = this.getPrimaryKey(table);

    if (table === 'avisos_cultos') {
      if (payload.id_culto && !payload.id_cultos) {
        payload.id_cultos = payload.id_culto;
      }

      if (payload.texto && !payload.info) {
        payload.info = payload.texto;
      }

      if (payload.id && !payload.id_lembrete) {
        payload.id_lembrete = payload.id;
      }

      delete payload.id_culto;
      delete payload.texto;
      delete payload.id;
    }

    if (table === 'eventos') {
      if (payload.id && !payload.id_evento) {
        payload.id_evento = payload.id;
      }

      delete payload.id;
    }

    if (table === 'presenca_evento') {
      if (payload.id && !payload.id_chamada) {
        payload.id_chamada = payload.id;
      }

      delete payload.id;
    }

    const recordId = payload[primaryKey];
    if (this.isTemporaryId(recordId)) {
      delete payload[primaryKey];
    }

    if (this.isTemporaryId(payload.id)) {
      delete payload.id;
    }

    return payload;
  }

  private static normalizeUpdatePayload(table: string, data: any): Record<string, any> {
    const payload = this.normalizeCreatePayload(table, data);
    delete payload[this.getPrimaryKey(table)];
    delete payload.id;
    return payload;
  }

  private static isTemporaryId(value: unknown): boolean {
    return typeof value === 'string' && (value.startsWith('local-') || value.startsWith('local-ch-'));
  }
}

export default LocalStorageService;
