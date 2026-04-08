import { supabase } from '../supabaseClient';
import LocalStorageService from './LocalStorageService';
import CacheService from './CacheService';

interface LocalStorageConfig {
  syncInterval?: number; // Intervalo de sincronização em ms
  enableBackgroundSync?: boolean;
  priorityLocal?: boolean; // Se true, sempre prioriza dados locais
}

class LocalStorageFirstService {
  private static readonly MANAGED_TABLES = [
    'membros',
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
  ] as const;
  private static readonly FULL_SYNC_REQUEST_KEY = 'louvor_force_full_sync';
  private static readonly LAST_FULL_SYNC_KEY = 'louvor_last_full_sync';
  private static config: LocalStorageConfig = {
    syncInterval: 2 * 60 * 1000, // 2 minutos
    enableBackgroundSync: true,
    priorityLocal: true
  };

  private static syncTimer: NodeJS.Timeout | null = null;
  private static isInitialized = false;

  // Inicializar o serviço
  static init(config?: LocalStorageConfig): void {
    if (this.isInitialized) return;

    this.config = { ...this.config, ...config };
    LocalStorageService.init();
    this.isInitialized = true;

    // Iniciar sincronização em background
    if (this.config.enableBackgroundSync) {
      this.startBackgroundSync();
    }

    console.log('LocalStorageFirstService inicializado');
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

  static async bootstrapApplication(options?: {
    force?: boolean;
    preloadImages?: boolean;
  }): Promise<void> {
    const { force = false, preloadImages = true } = options || {};

    if (!this.isInitialized) {
      this.init();
    }

    if (!navigator.onLine) {
      console.log('Bootstrap ignorado: dispositivo offline, usando dados locais');
      return;
    }

    await this.syncAllTables();

    if (preloadImages) {
      await CacheService.downloadMemberImages();
    }

    localStorage.setItem(this.LAST_FULL_SYNC_KEY, Date.now().toString());
    if (force) {
      this.clearFullSyncRequest();
    }
  }

  // Obter dados - SEMPRE do localStorage primeiro
  static get<T>(table: string): T[] {
    try {
      // Prioridade absoluta para dados locais
      const localData = LocalStorageService.get<T[]>(table);
      
      if (localData !== null) {
        console.log(`Dados obtidos do localStorage: ${table} (${localData.length} itens)`);
        
        // Iniciar sincronização em background se necessário
        this.scheduleSyncIfNeeded(table);
        
        return localData;
      }

      // Se não tiver dados locais, buscar do servidor e salvar
      console.log(`Sem dados locais para ${table}, buscando do servidor...`);
      this.fetchAndSaveFromServer<T>(table);
      
      return [];
    } catch (error) {
      console.error(`Erro ao obter dados da tabela ${table}:`, error);
      return [];
    }
  }

  // Salvar dados localmente imediatamente
  static set<T>(table: string, data: T[]): void {
    try {
      LocalStorageService.set(table, data);
      console.log(`Dados salvos localmente: ${table} (${data.length} itens)`);
      
      // Agendar sincronização com servidor
      this.scheduleSync(table);
    } catch (error) {
      console.error(`Erro ao salvar dados da tabela ${table}:`, error);
    }
  }

  // Adicionar item - salva localmente e agenda sincronização
  static add<T>(table: string, item: T): T {
    try {
      const currentData = this.get<T[]>(table) || [];
      const newData = [item, ...currentData];
      
      this.set(table, newData);
      
      // Adicionar à fila de sincronização
      LocalStorageService.addToSyncQueue(table, 'create', item);
      
      console.log(`Item adicionado localmente: ${table}`);
      return item;
    } catch (error) {
      console.error(`Erro ao adicionar item na tabela ${table}:`, error);
      throw error;
    }
  }

  // Atualizar item - atualiza localmente e agenda sincronização
  static update<T>(table: string, id: string, updates: Partial<T>): T | null {
    try {
      const currentData = this.get<T>(table);
      const itemIndex = currentData.findIndex((item: any) => item.id === id);
      
      if (itemIndex === -1) {
        console.warn(`Item não encontrado para atualização: ${table}.${id}`);
        return null;
      }

      const updatedItem = { ...currentData[itemIndex], ...updates } as T;
      currentData[itemIndex] = updatedItem;
      
      this.set(table, currentData);
      
      // Adicionar à fila de sincronização
      LocalStorageService.addToSyncQueue(table, 'update', { id, ...updates });
      
      console.log(`Item atualizado localmente: ${table}.${id}`);
      return updatedItem;
    } catch (error) {
      console.error(`Erro ao atualizar item na tabela ${table}:`, error);
      throw error;
    }
  }

  // Remover item - remove localmente e agenda sincronização
  static remove<T>(table: string, id: string): boolean {
    try {
      const currentData = this.get<T>(table);
      const filteredData = currentData.filter((item: any) => item.id !== id);
      
      if (filteredData.length === currentData.length) {
        console.warn(`Item não encontrado para remoção: ${table}.${id}`);
        return false;
      }

      this.set(table, filteredData);
      
      // Adicionar à fila de sincronização
      LocalStorageService.addToSyncQueue(table, 'delete', { id });
      
      console.log(`Item removido localmente: ${table}.${id}`);
      return true;
    } catch (error) {
      console.error(`Erro ao remover item na tabela ${table}:`, error);
      throw error;
    }
  }

  // Forçar sincronização com servidor
  static async forceSync(table?: string): Promise<void> {
    try {
      console.log(`Forçando sincronização${table ? ` da tabela ${table}` : ' de todas as tabelas'}...`);
      
      if (table) {
        await this.syncTable(table);
        if (table === 'membros') {
          await CacheService.downloadMemberImages();
        }
      } else {
        await this.bootstrapApplication({ force: true, preloadImages: true });
      }
      
      console.log('Sincronização forçada concluída');
    } catch (error) {
      console.error('Erro na sincronização forçada:', error);
      throw error;
    }
  }

  // Sincronizar tabela específica
  private static async syncTable(table: string): Promise<void> {
    try {
      if (!navigator.onLine) {
        console.log('Dispositivo offline, pulando sincronização');
        return;
      }

      // Processar fila de sincronização primeiro
      await LocalStorageService.processSyncQueue();

      // Buscar dados atualizados do servidor
      const serverData = await this.fetchFromServer<any[]>(table);
      
      if (serverData) {
        const localData = LocalStorageService.get<any[]>(table) || [];
        
        // Merge inteligente - prioriza dados locais se config.priorityLocal
        const mergedData = this.mergeData(table, localData, serverData);
        
        LocalStorageService.set(table, mergedData);
        this.updateLastSyncTime(table); // Atualizar tempo de sync
        console.log(`✅ Tabela ${table} sincronizada: ${mergedData.length} itens`);
      }
    } catch (error) {
      console.error(`Erro ao sincronizar tabela ${table}:`, error);
    }
  }

  // Sincronizar todas as tabelas
  private static async syncAllTables(): Promise<void> {
    await Promise.allSettled(
      this.MANAGED_TABLES.map(table => this.syncTable(table))
    );
  }

  // Buscar dados do servidor
  private static async fetchFromServer<T>(table: string): Promise<T | null> {
    try {
      const baseQuery = supabase.from(table).select('*');
      const orderedQuery = table === 'cultos'
        ? baseQuery.order('data_culto', { ascending: false })
        : baseQuery.order('created_at', { ascending: false });
      
      let { data, error } = await orderedQuery;

      if (error) {
        const fallback = await supabase.from(table).select('*');
        data = fallback.data as T;
        error = fallback.error;
      }

      if (error) throw error;
      
      return data as T || null;
    } catch (error) {
      console.error(`Erro ao buscar dados do servidor para ${table}:`, error);
      return null;
    }
  }

  // Buscar e salvar do servidor (usado quando não há dados locais)
  private static async fetchAndSaveFromServer<T>(table: string): Promise<void> {
    try {
      const data = await this.fetchFromServer<T[]>(table);
      if (data) {
        LocalStorageService.set(table, data);
        console.log(`Dados do servidor salvos localmente: ${table}`);
      }
    } catch (error) {
      console.error(`Erro ao buscar e salvar dados do servidor para ${table}:`, error);
    }
  }

  // Merge inteligente de dados
  private static mergeData(table: string, localData: any[], serverData: any[]): any[] {
    if (!this.config.priorityLocal) {
      // Se não priorizar local, retornar dados do servidor
      return serverData;
    }

    const serverKeys = new Set(serverData.map(item => this.getItemKey(item)));
    const merged = localData.filter(localItem => {
      const key = this.getItemKey(localItem);
      return serverKeys.has(key) || this.hasPendingLocalChange(table, key);
    });

    serverData.forEach(serverItem => {
      const key = this.getItemKey(serverItem);
      const localIndex = merged.findIndex(localItem => this.getItemKey(localItem) === key);

      if (localIndex === -1) {
        merged.push(serverItem);
        return;
      }

      if (this.hasPendingLocalChange(table, key)) {
        return;
      }

      const localItem = merged[localIndex];
      const localTimestamp = this.getItemTimestamp(localItem);
      const serverTimestamp = this.getItemTimestamp(serverItem);

      if (serverTimestamp >= localTimestamp) {
        merged[localIndex] = serverItem;
      }
    });

    return merged;
  }

  // Iniciar sincronização em background
  private static startBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.bootstrapApplication({ preloadImages: true }).catch(console.error);
      }
    }, this.config.syncInterval!);

    console.log(`Sincronização em background iniciada (${this.config.syncInterval}ms)`);
  }

  // Parar sincronização em background
  static stopBackgroundSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Sincronização em background parada');
    }
  }

  // Agendar sincronização se necessário
  private static scheduleSyncIfNeeded(table: string): void {
    const lastSync = this.getLastSyncTime(table);
    const now = Date.now();
    
    // Se última sincronização foi há mais de 1 minuto, agendar
    if (now - lastSync > 60000) {
      this.scheduleSync(table);
    }
  }

  // Agendar sincronização
  private static scheduleSync(table: string): void {
    setTimeout(() => {
      if (navigator.onLine) {
        this.syncTable(table);
      }
    }, 1000); // Aguardar 1 segundo para sincronizar
  }

  // Obter tempo da última sincronização
  private static getLastSyncTime(table: string): number {
    const key = `last_sync_${table}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored) : 0;
  }

  // Atualizar tempo da última sincronização
  private static updateLastSyncTime(table: string): void {
    const key = `last_sync_${table}`;
    localStorage.setItem(key, Date.now().toString());
  }

  // Obter status do sistema
  static getStatus(): {
    isInitialized: boolean;
    isOnline: boolean;
    lastSyncTimes: { [table: string]: number };
    queueStats: { pending: number; retrying: number };
    cacheStats: { [table: string]: { size: number; timestamp: number; valid: boolean } };
  } {
    const cacheStats = LocalStorageService.getCacheStatus();
    const queueStats = LocalStorageService.getSyncQueueStats();
    
    return {
      isInitialized: this.isInitialized,
      isOnline: navigator.onLine,
      lastSyncTimes: this.getAllLastSyncTimes(),
      queueStats,
      cacheStats
    };
  }

  // Obter todos os tempos de sincronização
  private static getAllLastSyncTimes(): { [table: string]: number } {
    const times: { [table: string]: number } = {};
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('last_sync_')) {
        const table = key.replace('last_sync_', '');
        times[table] = parseInt(localStorage.getItem(key) || '0');
      }
    });
    
    return times;
  }

  // Limpar todos os dados
  static clearAll(): void {
    LocalStorageService.clear();
    localStorage.removeItem(this.FULL_SYNC_REQUEST_KEY);
    localStorage.removeItem(this.LAST_FULL_SYNC_KEY);
    console.log('Todos os dados locais foram limpos');
  }

  // Limpar tabela específica
  static clearTable(table: string): void {
    LocalStorageService.remove(table);
    console.log(`Tabela ${table} limpa do localStorage`);
  }

  private static getItemKey(item: any): string {
    return String(
      item?.id ??
      item?.id_lembrete ??
      item?.id_evento ??
      item?.id_chamada ??
      item?.id_culto ??
      JSON.stringify(item)
    );
  }

  private static getItemTimestamp(item: any): number {
    const rawTimestamp = item?.updated_at || item?.created_at || item?.data_culto || 0;
    const parsed = new Date(rawTimestamp).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private static hasPendingLocalChange(table: string, key: string): boolean {
    return LocalStorageService.getSyncQueue().some(queueItem => {
      if (queueItem.table !== table) {
        return false;
      }

      return this.getItemKey(queueItem.data) === key;
    });
  }
}

export default LocalStorageFirstService;
