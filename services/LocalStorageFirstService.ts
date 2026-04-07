import { supabase } from '../supabaseClient';
import LocalStorageService from './LocalStorageService';

interface LocalStorageConfig {
  syncInterval?: number; // Intervalo de sincronização em ms
  enableBackgroundSync?: boolean;
  priorityLocal?: boolean; // Se true, sempre prioriza dados locais
}

class LocalStorageFirstService {
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
    this.isInitialized = true;

    // Iniciar sincronização em background
    if (this.config.enableBackgroundSync) {
      this.startBackgroundSync();
    }

    console.log('LocalStorageFirstService inicializado');
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
      } else {
        await this.syncAllTables();
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
        const mergedData = this.mergeData(localData, serverData);
        
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
    const tables = [
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
    ];

    await Promise.allSettled(
      tables.map(table => this.syncTable(table))
    );
  }

  // Buscar dados do servidor
  private static async fetchFromServer<T>(table: string): Promise<T | null> {
    try {
      let query = supabase.from(table).select('*');
      
      // Ajustar query para tabelas que não têm created_at
      if (table === 'cultos') {
        query = query.order('data_culto', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query;

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
  private static mergeData(localData: any[], serverData: any[]): any[] {
    if (!this.config.priorityLocal) {
      // Se não priorizar local, retornar dados do servidor
      return serverData;
    }

    // Priorizar dados locais, mas adicionar novos do servidor
    const merged = [...localData];
    const localIds = new Set(localData.map(item => item.id));

    serverData.forEach(serverItem => {
      if (!localIds.has(serverItem.id)) {
        merged.push(serverItem);
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
        this.syncAllTables();
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
    console.log('Todos os dados locais foram limpos');
  }

  // Limpar tabela específica
  static clearTable(table: string): void {
    LocalStorageService.remove(table);
    console.log(`Tabela ${table} limpa do localStorage`);
  }
}

export default LocalStorageFirstService;
