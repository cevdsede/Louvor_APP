import { supabase } from '../supabaseClient';
import LocalStorageService from './LocalStorageService';
import CacheService from './CacheService';

interface SyncConfig {
  enabled: boolean;
  interval: number; // em milissegundos
  retryAttempts: number;
  retryDelay: number; // em milissegundos
}

class SyncService {
  private static config: SyncConfig = {
    enabled: true,
    interval: 5 * 60 * 1000, // 5 minutos
    retryAttempts: 3,
    retryDelay: 30 * 1000 // 30 segundos
  };

  private static syncTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static lastSyncTime = 0;

  // Iniciar serviço de sincronização
  static start(config?: Partial<SyncConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.syncTimer) {
      this.stop();
    }

    console.log('Iniciando serviço de sincronização...');
    
    // Sincronizar imediatamente ao iniciar
    this.syncAllTables();

    // Configurar sincronização periódica
    this.syncTimer = setInterval(() => {
      if (!this.isRunning && this.config.enabled) {
        this.syncAllTables();
      }
    }, this.config.interval);
  }

  // Parar serviço de sincronização
  static stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('Serviço de sincronização parado');
    }
  }

  // Sincronizar todas as tabelas
  static async syncAllTables(): Promise<void> {
    if (this.isRunning) {
      console.log('Sincronização já em andamento...');
      return;
    }

    if (!navigator.onLine) {
      console.log('Dispositivo offline, pulando sincronização');
      return;
    }

    this.isRunning = true;
    console.log('Iniciando sincronização de todas as tabelas...');

    try {
      // Primeiro processar a fila de sincronização pendente
      await LocalStorageService.processSyncQueue();

      // Depois sincronizar os dados das tabelas
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
        'tons'
      ];

      const results = await Promise.allSettled(
        tables.map(table => this.syncTable(table))
      );

      // Log dos resultados
      results.forEach((result, index) => {
        const table = tables[index];
        if (result.status === 'fulfilled') {
          console.log(`✅ Tabela ${table} sincronizada com sucesso`);
        } else {
          console.error(`❌ Erro ao sincronizar tabela ${table}:`, result.reason);
        }
      });

      this.lastSyncTime = Date.now();
      console.log('Sincronização concluída');

    } catch (error) {
      console.error('Erro durante sincronização:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Sincronizar tabela específica
  static async syncTable(table: string): Promise<void> {
    try {
      console.log(`Sincronizando tabela: ${table}`);

      // Verificar se há dados mais recentes no servidor
      const lastSync = this.getLastSyncTime(table);
      
      let query = supabase.from(table).select('*');
      
      // Se houver última sincronização, buscar apenas dados atualizados
      if (lastSync) {
        query = query.gte('updated_at', new Date(lastSync).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        // Atualizar cache com os novos dados
        const existingCache = LocalStorageService.get<any[]>(table) || [];
        
        // Merge dos dados (prioridade para dados mais recentes)
        const mergedData = this.mergeData(existingCache, data);
        
        LocalStorageService.set(table, mergedData);
        this.updateLastSyncTime(table);

        console.log(`Tabela ${table} atualizada com ${data.length} registros`);
      }

    } catch (error) {
      console.error(`Erro ao sincronizar tabela ${table}:`, error);
      throw error;
    }
  }

  // Merge de dados (evitar duplicatas)
  private static mergeData(existing: any[], newData: any[]): any[] {
    const merged = [...existing];
    
    newData.forEach(newItem => {
      const existingIndex = merged.findIndex(item => item.id === newItem.id);
      
      if (existingIndex >= 0) {
        // Se o item já existe, atualizar se for mais recente
        const existingItem = merged[existingIndex];
        if (new Date(newItem.updated_at || newItem.created_at) > 
            new Date(existingItem.updated_at || existingItem.created_at)) {
          merged[existingIndex] = newItem;
        }
      } else {
        // Se não existe, adicionar
        merged.push(newItem);
      }
    });

    return merged;
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

  // Forçar sincronização imediata
  static async forceSync(): Promise<void> {
    console.log('Forçando sincronização imediata...');
    await this.syncAllTables();
  }

  // Sincronizar tabela específica imediatamente
  static async forceSyncTable(table: string): Promise<void> {
    console.log(`Forçando sincronização da tabela: ${table}`);
    await this.syncTable(table);
  }

  // Verificar status da sincronização
  static getStatus(): {
    enabled: boolean;
    running: boolean;
    lastSync: number;
    nextSync: number;
    queueStats: { pending: number; retrying: number };
  } {
    const queueStats = LocalStorageService.getSyncQueueStats();
    
    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      lastSync: this.lastSyncTime,
      nextSync: this.lastSyncTime + this.config.interval,
      queueStats
    };
  }

  // Limpar dados de sincronização
  static clearSyncData(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('last_sync_')) {
        localStorage.removeItem(key);
      }
    });
    
    LocalStorageService.clear();
    console.log('Dados de sincronização limpos');
  }

  // Habilitar/desabilitar sincronização automática
  static setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (enabled && !this.syncTimer) {
      this.start();
    } else if (!enabled && this.syncTimer) {
      this.stop();
    }
  }

  // Configurar intervalo de sincronização
  static setInterval(interval: number): void {
    this.config.interval = interval;
    
    if (this.syncTimer) {
      this.stop();
      this.start();
    }
  }

  // Verificar se há sincronização pendente
  static hasPendingSync(): boolean {
    const queueStats = LocalStorageService.getSyncQueueStats();
    return queueStats.pending > 0 || queueStats.retrying > 0;
  }

  // Obter tempo até próxima sincronização
  static getTimeToNextSync(): number {
    if (!this.syncTimer || !this.lastSyncTime) return 0;
    
    const elapsed = Date.now() - this.lastSyncTime;
    const remaining = this.config.interval - elapsed;
    
    return Math.max(0, remaining);
  }

  // Sincronização incremental (apenas dados modificados)
  static async incrementalSync(): Promise<void> {
    console.log('Iniciando sincronização incremental...');
    
    const tables = [
      'membros',
      'cultos', 
      'eventos',
      'musicas',
      'escalas',
      'avisos_cultos',
      'repertorio'
    ];

    for (const table of tables) {
      try {
        await this.syncTable(table);
      } catch (error) {
        console.error(`Erro na sincronização incremental da tabela ${table}:`, error);
      }
    }

    console.log('Sincronização incremental concluída');
  }

  // Sincronizar dados críticos primeiro
  static async syncCriticalData(): Promise<void> {
    console.log('Sincronizando dados críticos...');
    
    const criticalTables = ['membros', 'cultos', 'eventos'];
    
    await Promise.allSettled(
      criticalTables.map(table => this.syncTable(table))
    );

    console.log('Dados críticos sincronizados');
  }
}

export default SyncService;
