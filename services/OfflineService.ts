import { supabase } from '../supabaseClient';
import LocalStorageService from './LocalStorageService';
import SyncService from './SyncService';

interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  timestamp: number;
}

interface OfflineOperation {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  conflictResolution?: ConflictResolution;
  retryCount: number;
  status: 'pending' | 'conflict' | 'resolved' | 'failed';
}

class OfflineService {
  private static readonly OFFLINE_OPERATIONS_KEY = 'louvor_offline_ops';
  private static readonly CONFLICT_RESOLUTIONS_KEY = 'louvor_conflict_resolutions';
  private static isOnline = navigator.onLine;
  private static conflictCallbacks: ((conflict: OfflineOperation) => void)[] = [];

  // Inicializar serviço offline
  static init(): void {
    // Listeners de conexão
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Conexão restaurada, processando operações pendentes...');
      this.processPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Conexão perdida, entrando em modo offline...');
    });

    // Processar operações pendentes ao iniciar se estiver online
    if (this.isOnline) {
      this.processPendingOperations();
    }
  }

  // Verificar se está online
  static isOnlineMode(): boolean {
    return this.isOnline;
  }

  // Executar operação com suporte offline
  static async executeOperation<T>(
    table: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    id?: string
  ): Promise<T> {
    const operationId = this.generateOperationId();
    
    if (this.isOnline) {
      try {
        // Tentar executar online primeiro
        const result = await this.executeOnlineOperation<T>(table, operation, data, id);
        
        // Se sucesso, remover operações pendentes relacionadas
        this.removeRelatedOperations(table, id);
        return result;
        
      } catch (error) {
        console.warn(`Falha na operação online, salvando localmente:`, error);
        
        // Se falhar, salvar para executar offline
        return this.executeOfflineOperation<T>(operationId, table, operation, data, id);
      }
    } else {
      // Modo offline, salvar localmente
      console.log(`Executando operação offline: ${operation} em ${table}`);
      return this.executeOfflineOperation<T>(operationId, table, operation, data, id);
    }
  }

  // Executar operação online
  private static async executeOnlineOperation<T>(
    table: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    id?: string
  ): Promise<T> {
    switch (operation) {
      case 'create':
        const { data: created, error: createError } = await supabase
          .from(table)
          .insert([data])
          .select()
          .single();
        
        if (createError) throw createError;
        return created;

      case 'update':
        const { data: updated, error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return updated;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        
        if (deleteError) throw deleteError;
        return data as T;

      default:
        throw new Error(`Operação não suportada: ${operation}`);
    }
  }

  // Executar operação offline
  private static executeOfflineOperation<T>(
    operationId: string,
    table: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    id?: string
  ): T {
    const offlineOp: OfflineOperation = {
      id: operationId,
      table,
      operation,
      data: { ...data, ...(id && { id }) },
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    // Salvar operação offline
    this.saveOfflineOperation(offlineOp);

    // Atualizar cache local imediatamente
    this.updateLocalCache(table, operation, offlineOp.data);

    // Retornar dados temporários
    if (operation === 'create') {
      return { ...data, id: operationId, created_at: new Date().toISOString() } as T;
    } else if (operation === 'update') {
      return { ...data, id, updated_at: new Date().toISOString() } as T;
    } else {
      return data as T;
    }
  }

  // Atualizar cache local com operação offline
  private static updateLocalCache(table: string, operation: string, data: any): void {
    const cached = LocalStorageService.get<any[]>(table) || [];

    switch (operation) {
      case 'create':
        // Verificar se já existe para evitar duplicatas
        if (!cached.find(item => item.id === data.id)) {
          LocalStorageService.set(table, [data, ...cached]);
        }
        break;

      case 'update':
        const updated = cached.map(item => 
          item.id === data.id ? { ...item, ...data } : item
        );
        LocalStorageService.set(table, updated);
        break;

      case 'delete':
        const filtered = cached.filter(item => item.id !== data.id);
        LocalStorageService.set(table, filtered);
        break;
    }
  }

  // Processar operações pendentes
  static async processPendingOperations(): Promise<void> {
    if (!this.isOnline) return;

    const operations = this.getPendingOperations();
    console.log(`Processando ${operations.length} operações pendentes...`);

    for (const operation of operations) {
      try {
        await this.processOperation(operation);
      } catch (error) {
        console.error(`Erro ao processar operação ${operation.id}:`, error);
        
        // Incrementar contador de tentativas
        operation.retryCount++;
        
        // Marcar como falha se exceder tentativas
        if (operation.retryCount > 5) {
          operation.status = 'failed';
          this.updateOfflineOperation(operation);
        } else {
          this.updateOfflineOperation(operation);
        }
      }
    }

    // Remover operações concluídas
    this.cleanupCompletedOperations();
  }

  // Processar operação individual
  private static async processOperation(operation: OfflineOperation): Promise<void> {
    console.log(`Processando operação: ${operation.operation} em ${operation.table}`);

    try {
      switch (operation.operation) {
        case 'create':
          await this.processCreateOperation(operation);
          break;
        case 'update':
          await this.processUpdateOperation(operation);
          break;
        case 'delete':
          await this.processDeleteOperation(operation);
          break;
      }

      operation.status = 'resolved';
      this.updateOfflineOperation(operation);

    } catch (error) {
      // Verificar se é um conflito
      if (this.isConflictError(error)) {
        operation.status = 'conflict';
        this.handleConflict(operation, error);
      } else {
        throw error;
      }
    }
  }

  // Processar operação de criação
  private static async processCreateOperation(operation: OfflineOperation): Promise<void> {
    const { data, error } = await supabase
      .from(operation.table)
      .insert([operation.data])
      .select()
      .single();

    if (error) throw error;

    // Atualizar cache com ID real
    const cached = LocalStorageService.get<any[]>(operation.table) || [];
    const updated = cached.map(item => 
      item.id === operation.data.id ? data : item
    );
    LocalStorageService.set(operation.table, updated);
  }

  // Processar operação de atualização
  private static async processUpdateOperation(operation: OfflineOperation): Promise<void> {
    const { error } = await supabase
      .from(operation.table)
      .update(operation.data)
      .eq('id', operation.data.id);

    if (error) throw error;
  }

  // Processar operação de exclusão
  private static async processDeleteOperation(operation: OfflineOperation): Promise<void> {
    const { error } = await supabase
      .from(operation.table)
      .delete()
      .eq('id', operation.data.id);

    if (error) throw error;
  }

  // Verificar se erro é de conflito
  private static isConflictError(error: any): boolean {
    return error?.code === 'PGRST116' || error?.message?.includes('duplicate');
  }

  // Lidar com conflitos
  private static handleConflict(operation: OfflineOperation, error: any): void {
    console.warn(`Conflito detectado na operação ${operation.id}:`, error);

    // Notificar callbacks de conflito
    this.conflictCallbacks.forEach(callback => {
      try {
        callback(operation);
      } catch (callbackError) {
        console.error('Erro no callback de conflito:', callbackError);
      }
    });

    this.updateOfflineOperation(operation);
  }

  // Resolver conflito
  static resolveConflict(
    operationId: string,
    resolution: ConflictResolution
  ): void {
    const operation = this.getOfflineOperation(operationId);
    if (!operation) return;

    operation.conflictResolution = resolution;
    operation.status = 'resolved';

    this.updateOfflineOperation(operation);

    // Re-processar operação com a resolução
    if (this.isOnline) {
      this.processOperation(operation);
    }
  }

  // Salvar operação offline
  private static saveOfflineOperation(operation: OfflineOperation): void {
    const operations = this.getOfflineOperations();
    operations.push(operation);
    localStorage.setItem(this.OFFLINE_OPERATIONS_KEY, JSON.stringify(operations));
  }

  // Obter operações offline
  private static getOfflineOperations(): OfflineOperation[] {
    try {
      const stored = localStorage.getItem(this.OFFLINE_OPERATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao ler operações offline:', error);
      return [];
    }
  }

  // Obter operação específica
  private static getOfflineOperation(id: string): OfflineOperation | null {
    const operations = this.getOfflineOperations();
    return operations.find(op => op.id === id) || null;
  }

  // Atualizar operação offline
  private static updateOfflineOperation(operation: OfflineOperation): void {
    const operations = this.getOfflineOperations();
    const index = operations.findIndex(op => op.id === operation.id);
    
    if (index >= 0) {
      operations[index] = operation;
      localStorage.setItem(this.OFFLINE_OPERATIONS_KEY, JSON.stringify(operations));
    }
  }

  // Obter operações pendentes
  static getPendingOperations(): OfflineOperation[] {
    const operations = this.getOfflineOperations();
    return operations.filter(op => op.status === 'pending' || op.status === 'conflict');
  }

  // Remover operações relacionadas
  private static removeRelatedOperations(table: string, id?: string): void {
    const operations = this.getOfflineOperations();
    const filtered = operations.filter(op => 
      !(op.table === table && (!id || op.data.id === id))
    );
    localStorage.setItem(this.OFFLINE_OPERATIONS_KEY, JSON.stringify(filtered));
  }

  // Limpar operações concluídas
  private static cleanupCompletedOperations(): void {
    const operations = this.getOfflineOperations();
    const active = operations.filter(op => 
      op.status !== 'resolved' && op.status !== 'failed'
    );
    localStorage.setItem(this.OFFLINE_OPERATIONS_KEY, JSON.stringify(active));
  }

  // Adicionar callback de conflito
  static onConflict(callback: (conflict: OfflineOperation) => void): void {
    this.conflictCallbacks.push(callback);
  }

  // Remover callback de conflito
  static removeConflictCallback(callback: (conflict: OfflineOperation) => void): void {
    const index = this.conflictCallbacks.indexOf(callback);
    if (index >= 0) {
      this.conflictCallbacks.splice(index, 1);
    }
  }

  // Gerar ID de operação
  private static generateOperationId(): string {
    return `offline_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Obter estatísticas offline
  static getOfflineStats(): {
    pending: number;
    conflicts: number;
    failed: number;
    isOnline: boolean;
  } {
    const operations = this.getOfflineOperations();
    
    return {
      pending: operations.filter(op => op.status === 'pending').length,
      conflicts: operations.filter(op => op.status === 'conflict').length,
      failed: operations.filter(op => op.status === 'failed').length,
      isOnline: this.isOnline
    };
  }

  // Limpar todos os dados offline
  static clearOfflineData(): void {
    localStorage.removeItem(this.OFFLINE_OPERATIONS_KEY);
    localStorage.removeItem(this.CONFLICT_RESOLUTIONS_KEY);
    console.log('Dados offline limpos');
  }

  // Forçar sincronização manual
  static async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Dispositivo offline, não é possível sincronizar');
    }

    await this.processPendingOperations();
  }
}

export default OfflineService;
