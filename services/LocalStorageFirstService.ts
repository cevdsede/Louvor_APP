import { supabase } from '../supabaseClient';
import LocalStorageService from './LocalStorageService';
import CacheService from './CacheService';

interface LocalStorageConfig {
  syncInterval?: number;
  enableBackgroundSync?: boolean;
  priorityLocal?: boolean;
}

interface SyncErrorEntry {
  table: string;
  message: string;
  timestamp: number;
}

type ManagedTable =
  | 'membros'
  | 'ministerios'
  | 'membros_ministerios'
  | 'cultos'
  | 'eventos'
  | 'musicas'
  | 'escalas'
  | 'avisos_cultos'
  | 'repertorio'
  | 'funcao'
  | 'temas'
  | 'tons'
  | 'nome_cultos'
  | 'membros_funcoes'
  | 'historico_musicas'
  | 'limpeza'
  | 'solicitacoes_membro'
  | 'aviso_geral'
  | 'presenca_evento';

class LocalStorageFirstService {
  private static readonly MANAGED_TABLES: ManagedTable[] = [
    'membros',
    'ministerios',
    'membros_ministerios',
    'cultos',
    'eventos',
    'musicas',
    'escalas',
    'avisos_cultos',
    'repertorio',
    'funcao',
    'temas',
    'tons',
    'nome_cultos',
    'membros_funcoes',
    'historico_musicas',
    'limpeza',
    'solicitacoes_membro',
    'aviso_geral',
    'presenca_evento'
  ];

  private static readonly FULL_SYNC_REQUEST_KEY = 'louvor_force_full_sync';
  private static readonly LAST_FULL_SYNC_KEY = 'louvor_last_full_sync';
  private static readonly INITIAL_SYNC_GRACE_MS = 8000;
  private static readonly TABLE_STALE_MS = 60000;
  private static readonly PRIMARY_KEYS: Record<string, string> = {
    avisos_cultos: 'id_lembrete',
    eventos: 'id_evento',
    presenca_evento: 'id_chamada'
  };
  private static readonly NUMERIC_ID_TABLES = new Set(['aviso_geral', 'funcao', 'limpeza', 'tons']);
  private static readonly UNSUPPORTED_UPDATE_COLUMNS: Record<string, string[]> = {
    eventos: ['updated_at'],
    presenca_evento: ['updated_at']
  };

  private static config: LocalStorageConfig = {
    syncInterval: 2 * 60 * 1000,
    enableBackgroundSync: true,
    priorityLocal: false
  };

  private static syncTimer: NodeJS.Timeout | null = null;
  private static isInitialized = false;
  private static initializedAt = 0;
  private static listenersAttached = false;
  private static scheduledTables = new Set<string>();
  private static syncingTables = new Map<string, Promise<void>>();
  private static bootstrapPromise: Promise<void> | null = null;
  private static lastSyncStartedAt = 0;
  private static syncErrors = new Map<string, SyncErrorEntry>();

  static init(config?: LocalStorageConfig): void {
    this.config = { ...this.config, ...config };

    if (!this.isInitialized) {
      LocalStorageService.init();
      this.isInitialized = true;
      this.initializedAt = Date.now();
      this.attachConnectionListeners();
    }

    if (this.config.enableBackgroundSync) {
      this.startBackgroundSync();
    } else {
      this.stopBackgroundSync();
    }
  }

  static requestFullSync(): void {
    localStorage.setItem(this.FULL_SYNC_REQUEST_KEY, 'true');
  }

  static shouldForceFullSync(): boolean {
    return localStorage.getItem(this.FULL_SYNC_REQUEST_KEY) === 'true';
  }

  static clearFullSyncRequest(): void {
    localStorage.removeItem(this.FULL_SYNC_REQUEST_KEY);
  }

  static getManagedTables(): string[] {
    return [...this.MANAGED_TABLES];
  }

  static async bootstrapApplication(options?: { force?: boolean; preloadImages?: boolean }): Promise<void> {
    const { force = false, preloadImages = true } = options || {};
    this.ensureInitialized();

    if (!navigator.onLine) {
      return;
    }

    if (this.bootstrapPromise && !force) {
      return this.bootstrapPromise;
    }

    if (this.bootstrapPromise && force) {
      await this.bootstrapPromise.catch(() => undefined);
    }

    const run = async () => {
      this.lastSyncStartedAt = Date.now();
      await LocalStorageService.processSyncQueue();
      await Promise.allSettled(this.MANAGED_TABLES.map((table) => this.syncTable(table)));

      if (preloadImages) {
        await CacheService.downloadAppImages();
      }

      localStorage.setItem(this.LAST_FULL_SYNC_KEY, Date.now().toString());
      if (force) {
        this.clearFullSyncRequest();
      }
    };

    const promise = run().finally(() => {
      if (this.bootstrapPromise === promise) {
        this.bootstrapPromise = null;
      }
    });

    this.bootstrapPromise = promise;
    return promise;
  }

  static async syncPriorityTables(
    tables: string[],
    options?: {
      preloadImages?: boolean;
    }
  ): Promise<void> {
    this.ensureInitialized();

    if (!navigator.onLine || tables.length === 0) {
      return;
    }

    const { preloadImages = false } = options || {};
    const uniqueTables = [...new Set(tables)].filter((table): table is ManagedTable =>
      this.MANAGED_TABLES.includes(table as ManagedTable)
    );

    await Promise.allSettled(uniqueTables.map((table) => this.syncTable(table)));

    if (preloadImages) {
      const imageTables = uniqueTables.filter((table) => this.shouldPreloadImages(table));
      if (imageTables.length > 0) {
        await CacheService.downloadAppImages(imageTables);
      }
    }
  }

  static get<T>(table: string): T[] {
    this.ensureInitialized();

    const localData = this.getLocalData<T>(table);
    if (!navigator.onLine) {
      return localData;
    }

    if (this.shouldSyncTable(table, localData.length > 0)) {
      this.scheduleSync(table, localData.length > 0 ? 250 : 0);
    }

    return localData;
  }

  static set<T>(table: string, data: T[]): void {
    this.ensureInitialized();
    LocalStorageService.set(table, data);
  }

  static add<T>(table: string, item: T): T {
    this.ensureInitialized();

    const preparedItem = this.prepareLocalItem<T>(table, item);
    const currentData = this.getLocalData<T>(table);
    const nextData = [
      preparedItem,
      ...currentData.filter((existing) => this.getItemKey(table, existing) !== this.getItemKey(table, preparedItem))
    ];

    LocalStorageService.set(table, nextData);
    this.persistChange(table, 'create', preparedItem);
    return preparedItem;
  }

  static update<T>(table: string, id: string, updates: Partial<T>): T | null {
    this.ensureInitialized();

    const currentData = this.getLocalData<T>(table);
    const itemIndex = currentData.findIndex((item) => this.matchesItemId(table, item, id));

    if (itemIndex === -1) {
      console.warn(`Item nao encontrado para atualizacao: ${table}.${id}`);
      return null;
    }

    const updatedItem = this.prepareLocalItem<T>(table, {
      ...(currentData[itemIndex] as object),
      ...(updates as object),
      ...(this.buildIdentityPayload(table, id) as object)
    } as T);

    currentData[itemIndex] = updatedItem;
    LocalStorageService.set(table, currentData);
    this.persistChange(table, 'update', updatedItem);
    return updatedItem;
  }

  static remove<T>(table: string, id: string): boolean {
    this.ensureInitialized();

    const currentData = this.getLocalData<T>(table);
    const filteredData = currentData.filter((item) => !this.matchesItemId(table, item, id));

    if (filteredData.length === currentData.length) {
      return false;
    }

    LocalStorageService.set(table, filteredData);
    this.persistChange(table, 'delete', this.buildIdentityPayload(table, id));
    return true;
  }

  static async forceSync(table?: string): Promise<void> {
    this.ensureInitialized();

    if (!navigator.onLine) {
      return;
    }

    if (table) {
      this.lastSyncStartedAt = Date.now();
      await this.syncTable(table, { preloadImages: this.shouldPreloadImages(table) });
      return;
    }

    await this.bootstrapApplication({ force: true, preloadImages: true });
  }

  static stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  static getStatus(): {
    isInitialized: boolean;
    isOnline: boolean;
    isSyncing: boolean;
    backgroundSyncEnabled: boolean;
    activeSyncTables: string[];
    scheduledSyncTables: string[];
    syncErrors: SyncErrorEntry[];
    lastFullSync: number;
    lastSyncStartedAt: number;
    nextBackgroundSync: number;
    lastSyncTimes: { [table: string]: number };
    queueStats: { pending: number; retrying: number };
    cacheStats: { [table: string]: { size: number; timestamp: number; valid: boolean } };
  } {
    const lastFullSync = Number(localStorage.getItem(this.LAST_FULL_SYNC_KEY) || 0);
    const interval = this.config.syncInterval ?? 2 * 60 * 1000;

    return {
      isInitialized: this.isInitialized,
      isOnline: navigator.onLine,
      isSyncing: this.bootstrapPromise !== null || this.syncingTables.size > 0,
      backgroundSyncEnabled: Boolean(this.syncTimer),
      activeSyncTables: [...this.syncingTables.keys()],
      scheduledSyncTables: [...this.scheduledTables],
      syncErrors: [...this.syncErrors.values()].sort((a, b) => b.timestamp - a.timestamp),
      lastFullSync,
      lastSyncStartedAt: this.lastSyncStartedAt,
      nextBackgroundSync: this.syncTimer && lastFullSync ? lastFullSync + interval : 0,
      lastSyncTimes: this.getAllLastSyncTimes(),
      queueStats: LocalStorageService.getSyncQueueStats(),
      cacheStats: LocalStorageService.getCacheStatus()
    };
  }

  static clearAll(): void {
    LocalStorageService.clear();
    localStorage.removeItem(this.FULL_SYNC_REQUEST_KEY);
    localStorage.removeItem(this.LAST_FULL_SYNC_KEY);
  }

  static clearTable(table: string): void {
    LocalStorageService.remove(table);
  }

  private static ensureInitialized(): void {
    if (!this.isInitialized) {
      this.init();
    }
  }

  private static attachConnectionListeners(): void {
    if (this.listenersAttached) {
      return;
    }

    this.listenersAttached = true;

    window.addEventListener('online', () => {
      const force = this.shouldForceFullSync();
      void this.bootstrapApplication({ force, preloadImages: false }).catch((error) => {
        console.error('Erro ao sincronizar ao voltar para o modo online:', error);
      });
    });
  }

  private static startBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    const interval = this.config.syncInterval ?? 2 * 60 * 1000;
    this.syncTimer = setInterval(() => {
      if (!navigator.onLine) {
        return;
      }

      void this.bootstrapApplication({ preloadImages: false }).catch((error) => {
        console.error('Erro na sincronizacao em background:', error);
      });
    }, interval);
  }

  private static shouldSyncTable(table: string, hasLocalData: boolean): boolean {
    if (!navigator.onLine) {
      return false;
    }

    if (this.syncingTables.has(table) || this.scheduledTables.has(table)) {
      return false;
    }

    if (!hasLocalData || this.hasPendingQueueItems(table)) {
      return true;
    }

    const lastSync = this.getLastSyncTime(table);
    if (!lastSync) {
      return true;
    }

    return Date.now() - lastSync >= this.TABLE_STALE_MS;
  }

  private static scheduleSync(table: string, delay = 1000): void {
    if (this.scheduledTables.has(table)) {
      return;
    }

    this.scheduledTables.add(table);

    window.setTimeout(() => {
      this.scheduledTables.delete(table);
      if (!navigator.onLine) {
        return;
      }

      void this.syncTable(table).catch((error) => {
        console.error(`Erro ao sincronizar tabela ${table}:`, error);
      });
    }, delay);
  }

  private static async syncTable(
    table: string,
    options?: {
      preloadImages?: boolean;
    }
  ): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    const preloadImages = options?.preloadImages ?? false;
    const existingSync = this.syncingTables.get(table);
    if (existingSync) {
      return existingSync;
    }

    const syncPromise = (async () => {
      await LocalStorageService.processSyncQueue();

      const serverData = await this.fetchFromServer<any[]>(table);
      if (!serverData) {
        return;
      }

      const mergedData = this.mergeWithPendingChanges(table, serverData);
      LocalStorageService.set(table, mergedData);
      this.updateLastSyncTime(table);
      this.syncErrors.delete(table);

      if (preloadImages && this.shouldPreloadImages(table)) {
        await CacheService.downloadAppImages([table]);
      }
    })().finally(() => {
      this.syncingTables.delete(table);
    });

    this.syncingTables.set(table, syncPromise);
    return syncPromise;
  }

  private static async fetchFromServer<T>(table: string): Promise<T | null> {
    try {
      const baseQuery = supabase.from(table).select('*');
      const orderedQuery =
        table === 'cultos'
          ? baseQuery.order('data_culto', { ascending: false })
          : baseQuery.order('created_at', { ascending: false });

      let { data, error } = await orderedQuery;

      if (error) {
        const fallback = await supabase.from(table).select('*');
        data = fallback.data as any[] | null;
        error = fallback.error;
      }

      if (error) {
        throw error;
      }

      if (table === 'membros' && Array.isArray(data)) {
        data = await this.attachAuthDisplayNames(data as any[]);
      }

      return (data as T) || null;
    } catch (error) {
      console.error(`Erro ao buscar dados do servidor para ${table}:`, error);
      this.recordSyncError(table, error);
      return null;
    }
  }

  private static recordSyncError(table: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error || 'Erro desconhecido');

    this.syncErrors.set(table, {
      table,
      message,
      timestamp: Date.now()
    });
  }

  private static async attachAuthDisplayNames(membros: any[]): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_auth_display_names');
      if (error || !Array.isArray(data)) {
        return membros;
      }

      const displayNameById = new Map(
        data
          .filter((item: any) => item?.id && item?.display_name)
          .map((item: any) => [item.id, item.display_name])
      );

      return membros.map((membro) => ({
        ...membro,
        display_name: displayNameById.get(membro.id) || membro.display_name || null
      }));
    } catch (error) {
      console.warn('Nao foi possivel anexar display_name do Auth:', error);
      return membros;
    }
  }

  private static persistChange(table: string, action: 'create' | 'update' | 'delete', data: any): void {
    if (!navigator.onLine) {
      LocalStorageService.addToSyncQueue(table, action, data);
      return;
    }

    void this.commitOnlineChange(table, action, data).catch((error) => {
      console.error(`Erro ao persistir alteracao online em ${table}:`, error);
      LocalStorageService.addToSyncQueue(table, action, data);
      this.scheduleSync(table, 1500);
    });
  }

  private static async commitOnlineChange(
    table: string,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const primaryKey = this.getPrimaryKey(table);
    const recordId = this.extractItemId(table, data);

    if (action === 'create') {
      const payload = this.normalizePayloadForServer(table, data, 'create');
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    } else if (action === 'update') {
      if (!recordId) {
        throw new Error('ID nao informado para atualizacao');
      }

      const payload = this.normalizePayloadForServer(table, data, 'update');
      const { error } = await supabase.from(table).update(payload).eq(primaryKey, recordId);
      if (error) throw error;
    } else {
      if (!recordId) {
        throw new Error('ID nao informado para exclusao');
      }

      const { error } = await supabase.from(table).delete().eq(primaryKey, recordId);
      if (error) throw error;
    }

    await this.syncTable(table, { preloadImages: this.shouldPreloadImages(table) });
  }

  private static mergeWithPendingChanges(table: string, serverData: any[]): any[] {
    const queueItems = LocalStorageService.getSyncQueue().filter((queueItem) => queueItem.table === table);
    if (queueItems.length === 0) {
      return serverData;
    }

    const localData = this.getLocalData<any>(table);
    const deleteKeys = new Set(
      queueItems
        .filter((queueItem) => queueItem.action === 'delete')
        .map((queueItem) => this.getItemKey(table, queueItem.data))
        .filter(Boolean)
    );

    const upsertKeys = new Set(
      queueItems
        .filter((queueItem) => queueItem.action !== 'delete')
        .map((queueItem) => this.getItemKey(table, queueItem.data))
        .filter(Boolean)
    );

    const merged = serverData.filter((item) => !deleteKeys.has(this.getItemKey(table, item)));

    for (const localItem of localData) {
      const localKey = this.getItemKey(table, localItem);
      if (!upsertKeys.has(localKey)) {
        continue;
      }

      const existingIndex = merged.findIndex((serverItem) => this.getItemKey(table, serverItem) === localKey);
      if (existingIndex === -1) {
        merged.push(localItem);
      } else {
        merged[existingIndex] = localItem;
      }
    }

    return merged;
  }

  private static getLocalData<T>(table: string): T[] {
    const localData = LocalStorageService.get<T[]>(table);
    return Array.isArray(localData) ? localData : [];
  }

  private static prepareLocalItem<T>(table: string, item: T): T {
    const prepared = { ...(item as any) };
    this.normalizeAliases(table, prepared);

    const primaryKey = this.getPrimaryKey(table);
    let recordId = this.extractItemId(table, prepared);

    if (!recordId) {
      recordId = this.shouldGenerateUuid(table) ? this.generateUuid() : this.generateTempId();
      prepared[primaryKey] = recordId;
    } else if (this.shouldGenerateUuid(table) && this.isTemporaryId(recordId)) {
      recordId = this.generateUuid();
      prepared[primaryKey] = recordId;
    }

    if (primaryKey !== 'id' && prepared.id == null && prepared[primaryKey] != null) {
      prepared.id = prepared[primaryKey];
    }

    return prepared as T;
  }

  private static normalizePayloadForServer(
    table: string,
    data: any,
    mode: 'create' | 'update'
  ): Record<string, any> {
    const payload = { ...(data || {}) };
    this.normalizeAliases(table, payload);

    const primaryKey = this.getPrimaryKey(table);
    const recordId = payload[primaryKey] ?? payload.id;
    const unsupportedUpdateColumns = this.UNSUPPORTED_UPDATE_COLUMNS[table] || [];

    unsupportedUpdateColumns.forEach((column) => {
      delete payload[column];
    });

    if (table === 'avisos_cultos') {
      delete payload.id_culto;
      delete payload.texto;
    }

    if (primaryKey !== 'id') {
      delete payload.id;
    }

    if (mode === 'update') {
      delete payload[primaryKey];
      delete payload.id;
      return payload;
    }

    if (this.isTemporaryId(recordId)) {
      delete payload[primaryKey];
      delete payload.id;
    }

    if (!this.shouldGenerateUuid(table) && typeof payload.id === 'string' && this.isTemporaryId(payload.id)) {
      delete payload.id;
    }

    return payload;
  }

  private static normalizeAliases(table: string, item: Record<string, any>): void {
    if (table === 'avisos_cultos') {
      if (item.id && !item.id_lembrete) {
        item.id_lembrete = item.id;
      }

      if (item.id_culto && !item.id_cultos) {
        item.id_cultos = item.id_culto;
      }

      if (item.texto && !item.info) {
        item.info = item.texto;
      }
    }

    if (table === 'eventos') {
      if (item.id && !item.id_evento) {
        item.id_evento = item.id;
      }

      if (item.id_evento && !item.id) {
        item.id = item.id_evento;
      }
    }

    if (table === 'presenca_evento') {
      if (item.id && !item.id_chamada) {
        item.id_chamada = item.id;
      }

      if (item.id_chamada && !item.id) {
        item.id = item.id_chamada;
      }
    }
  }

  private static buildIdentityPayload(table: string, id: string): Record<string, string> {
    const primaryKey = this.getPrimaryKey(table);
    return primaryKey === 'id' ? { id } : { id, [primaryKey]: id };
  }

  private static extractItemId(table: string, item: any): string | number | undefined {
    if (!item) {
      return undefined;
    }

    const primaryKey = this.getPrimaryKey(table);
    return item[primaryKey] ?? item.id;
  }

  private static matchesItemId(table: string, item: any, id: string): boolean {
    const itemId = this.extractItemId(table, item);
    return itemId != null && String(itemId) === String(id);
  }

  private static getItemKey(table: string, item: any): string {
    const recordId = this.extractItemId(table, item);

    if (recordId != null) {
      return String(recordId);
    }

    return JSON.stringify(item);
  }

  private static hasPendingQueueItems(table: string): boolean {
    return LocalStorageService.getSyncQueue().some((item) => item.table === table);
  }

  private static shouldGenerateUuid(table: string): boolean {
    return !this.NUMERIC_ID_TABLES.has(table);
  }

  private static getPrimaryKey(table: string): string {
    return this.PRIMARY_KEYS[table] || 'id';
  }

  private static shouldPreloadImages(table: string): boolean {
    return table === 'membros' || table === 'limpeza';
  }

  private static isWithinStartupGracePeriod(): boolean {
    return Date.now() - this.initializedAt < this.INITIAL_SYNC_GRACE_MS;
  }

  private static getStartupSyncDelay(): number {
    if (!this.isWithinStartupGracePeriod()) {
      return 1000;
    }

    return this.INITIAL_SYNC_GRACE_MS - (Date.now() - this.initializedAt) + 1000;
  }

  private static getLastSyncTime(table: string): number {
    const stored = localStorage.getItem(`last_sync_${table}`);
    return stored ? parseInt(stored, 10) : 0;
  }

  private static updateLastSyncTime(table: string): void {
    localStorage.setItem(`last_sync_${table}`, Date.now().toString());
  }

  private static getAllLastSyncTimes(): { [table: string]: number } {
    const times: { [table: string]: number } = {};

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('last_sync_')) {
        times[key.replace('last_sync_', '')] = parseInt(localStorage.getItem(key) || '0', 10);
      }
    });

    return times;
  }

  private static generateTempId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private static generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  private static isTemporaryId(value: unknown): boolean {
    return typeof value === 'string' && (value.startsWith('local-') || value.startsWith('local-ch-'));
  }
}

export default LocalStorageFirstService;
