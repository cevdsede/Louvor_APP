import { supabase } from '../supabaseClient';
import LocalStorageService from './LocalStorageService';

interface CacheConfig {
  ttl?: number; // Time to live em milissegundos
  enableAutoSync?: boolean;
  syncInterval?: number;
}

class CacheService {
  private static defaultConfig: CacheConfig = {
    ttl: 30 * 60 * 1000, // 30 minutos
    enableAutoSync: true,
    syncInterval: 5 * 60 * 1000 // 5 minutos
  };
  private static readonly IMAGE_CACHE_PREFIX = 'image_cache_';

  // Obter dados com cache
  static async get<T>(
    table: string,
    config: CacheConfig = {}
  ): Promise<T[]> {
    const { ttl } = { ...this.defaultConfig, ...config };

    // Tentar obter do cache primeiro
    const cached = LocalStorageService.get<T[]>(table);
    if (cached) {
      console.log(`Dados obtidos do cache: ${table}`);
      return cached;
    }

    // Se não tiver cache, buscar do Supabase
    console.log(`Buscando dados do Supabase: ${table}`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar dados da tabela ${table}:`, error);
      throw error;
    }

    // Salvar no cache
    LocalStorageService.set(table, data || []);

    return data || [];
  }

  // Obter dados com query específica
  static async getWithQuery<T>(
    table: string,
    query: string,
    config: CacheConfig = {}
  ): Promise<T[]> {
    const cacheKey = `${table}_${query.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Tentar obter do cache primeiro
    const cached = LocalStorageService.get<T[]>(cacheKey);
    if (cached) {
      console.log(`Dados obtidos do cache: ${cacheKey}`);
      return cached;
    }

    // Se não tiver cache, buscar do Supabase
    console.log(`Buscando dados do Supabase: ${cacheKey}`);
    const { data, error } = await supabase
      .from(table)
      .select(query);

    if (error) {
      console.error(`Erro ao buscar dados da tabela ${table}:`, error);
      throw error;
    }

    // Salvar no cache
    LocalStorageService.set(cacheKey, data as T[] || []);

    return data as T[] || [];
  }

  // Criar novo registro
  static async create<T>(
    table: string,
    data: Partial<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      // Adicionar à fila de sincronização
      LocalStorageService.addToSyncQueue(table, 'create', result);

      // Atualizar cache imediatamente
      const cached = LocalStorageService.get<T[]>(table) || [];
      LocalStorageService.set(table, [result, ...cached]);

      console.log(`Registro criado na tabela ${table}:`, result);
      return result;
    } catch (error) {
      console.error(`Erro ao criar registro na tabela ${table}:`, error);
      
      // Se estiver offline, adicionar à fila e salvar localmente
      if (!navigator.onLine) {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const tempData = { ...data, id: tempId, created_at: new Date().toISOString() };
        
        LocalStorageService.addToSyncQueue(table, 'create', tempData);
        
        const cached = LocalStorageService.get<T[]>(table) || [];
        LocalStorageService.set(table, [tempData as T, ...cached]);
        
        return tempData as T;
      }
      
      throw error;
    }
  }

  // Atualizar registro
  static async update<T>(
    table: string,
    id: string,
    data: Partial<T>,
    config: CacheConfig = {}
  ): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Adicionar à fila de sincronização
      LocalStorageService.addToSyncQueue(table, 'update', result);

      // Atualizar cache imediatamente
      const cached = LocalStorageService.get<T[]>(table) || [];
      const updated = cached.map(item => 
        (item as any).id === id ? result : item
      );
      LocalStorageService.set(table, updated);

      console.log(`Registro atualizado na tabela ${table}:`, result);
      return result;
    } catch (error) {
      console.error(`Erro ao atualizar registro na tabela ${table}:`, error);
      
      // Se estiver offline, adicionar à fila e atualizar localmente
      if (!navigator.onLine) {
        LocalStorageService.addToSyncQueue(table, 'update', { id, ...data });
        
        const cached = LocalStorageService.get<T[]>(table) || [];
        const updated = cached.map(item => 
          (item as any).id === id ? { ...item, ...data } : item
        );
        LocalStorageService.set(table, updated);
        
        return { ...data, id } as T;
      }
      
      throw error;
    }
  }

  // Deletar registro
  static async delete(
    table: string,
    id: string,
    config: CacheConfig = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Adicionar à fila de sincronização
      LocalStorageService.addToSyncQueue(table, 'delete', { id });

      // Atualizar cache imediatamente
      const cached = LocalStorageService.get<any[]>(table) || [];
      const filtered = cached.filter(item => item.id !== id);
      LocalStorageService.set(table, filtered);

      console.log(`Registro deletado da tabela ${table}:`, id);
    } catch (error) {
      console.error(`Erro ao deletar registro na tabela ${table}:`, error);
      
      // Se estiver offline, adicionar à fila e remover localmente
      if (!navigator.onLine) {
        LocalStorageService.addToSyncQueue(table, 'delete', { id });
        
        const cached = LocalStorageService.get<any[]>(table) || [];
        const filtered = cached.filter(item => item.id !== id);
        LocalStorageService.set(table, filtered);
      }
      
      throw error;
    }
  }

  // Forçar sincronização de uma tabela
  static async forceSync(table: string): Promise<void> {
    try {
      console.log(`Forçando sincronização da tabela: ${table}`);
      
      // Buscar dados atualizados do Supabase
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Atualizar cache
      LocalStorageService.set(table, data || []);

      console.log(`Tabela ${table} sincronizada com sucesso`);
    } catch (error) {
      console.error(`Erro ao sincronizar tabela ${table}:`, error);
      throw error;
    }
  }

  // Baixar imagens dos membros para cache local
  static async downloadMemberImages(): Promise<void> {
    try {
      console.log('Baixando imagens dos membros para cache...');
      
      const membros = LocalStorageService.get<any[]>('membros') || [];
      let downloaded = 0;
      
      for (const membro of membros) {
        if (membro.foto && membro.foto.startsWith('http')) {
          const cacheKeyBase = `${this.IMAGE_CACHE_PREFIX}${btoa(membro.foto)}`;
          
          // Verificar se já está em cache
          const alreadyCached = Object.keys(localStorage).some(key => key.startsWith(cacheKeyBase));
          if (!alreadyCached) {
            try {
              const response = await fetch(membro.foto);
              if (!response.ok) {
                continue;
              }
              const blob = await response.blob();
              
              const serializedImage = await this.serializeImageBlob(blob);
              if (!serializedImage) {
                continue;
              }

              const cacheKey = `${cacheKeyBase}_${Date.now()}`;
              try {
                localStorage.setItem(cacheKey, serializedImage);
                downloaded++;
              } catch (error) {
                console.warn('Erro ao salvar imagem no cache:', error);
              }
            } catch (error) {
              console.warn('Erro ao baixar imagem do membro:', membro.foto, error);
            }
          }
        }
      }
      
      console.log(`${downloaded} imagens de membros baixadas para cache`);
    } catch (error) {
      console.error('Erro ao baixar imagens dos membros:', error);
    }
  }

  private static async serializeImageBlob(blob: Blob): Promise<string | null> {
    try {
      if (!blob.type.startsWith('image/')) {
        return await this.blobToDataUrl(blob);
      }

      if (blob.size <= 120 * 1024) {
        return await this.blobToDataUrl(blob);
      }

      return await this.compressBlobToDataUrl(blob, 280, 0.72);
    } catch (error) {
      console.warn('Erro ao serializar imagem para o cache:', error);
      return null;
    }
  }

  private static async blobToDataUrl(blob: Blob): Promise<string> {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private static async compressBlobToDataUrl(blob: Blob, maxWidth: number, quality: number): Promise<string> {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Não foi possível criar contexto para compressão da imagem'));
          return;
        }

        const ratio = Math.min(1, maxWidth / image.width);
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      image.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      };

      image.src = objectUrl;
    });
  }

  // Sincronizar todas as tabelas em cache
  static async syncAll(): Promise<void> {
    const cacheStatus = LocalStorageService.getCacheStatus();
    const tables = Object.keys(cacheStatus);

    console.log(`Sincronizando ${tables.length} tabelas...`);

    await Promise.allSettled(
      tables.map(table => this.forceSync(table))
    );

    // Após sincronizar, baixar imagens dos membros
    await this.downloadMemberImages();

    console.log('Sincronização de todas as tabelas concluída');
  }

  // Limpar cache de uma tabela específica
  static clearCache(table: string): void {
    LocalStorageService.remove(table);
    console.log(`Cache limpo para tabela: ${table}`);
  }

  // Limpar todos os caches
  static clearAllCache(): void {
    LocalStorageService.clear();
    console.log('Todos os caches foram limpos');
  }

  // Verificar se tabela tem cache válido
  static hasValidCache(table: string): boolean {
    return LocalStorageService.isValid(table);
  }

  // Obter informações do cache
  static getCacheInfo(table: string): { size: number; timestamp: number; valid: boolean } | null {
    const status = LocalStorageService.getCacheStatus();
    return status[table] || null;
  }

  // Métodos específicos para as principais tabelas do sistema
  static async getMembros() {
    return this.get('membros');
  }

  static async getCultos() {
    return this.getWithQuery('cultos', `
      *,
      nome_cultos (
        id,
        nome_culto
      )
    `);
  }

  static async getEventos() {
    return this.get('eventos');
  }

  static async getMusicas() {
    return this.getWithQuery('musicas', `
      *,
      temas (
        id,
        nome_tema
      )
    `);
  }

  static async getEscalas() {
    return this.getWithQuery('escalas', `
      *,
      cultos (
        id,
        data_culto,
        horario,
        nome_cultos (
          id,
          nome_culto
        )
      ),
      membros (
        id,
        nome,
        foto
      ),
      funcao (
        id,
        nome_funcao
      )
    `);
  }

  static async getAvisos() {
    return this.getWithQuery('avisos_cultos', `
      *,
      cultos (
        id,
        data_culto,
        nome_cultos (
          id,
          nome_culto
        )
      ),
      membros (
        id,
        nome
      )
    `);
  }

  static async getRepertorio() {
    return this.getWithQuery('repertorio', `
      *,
      cultos (
        id,
        data_culto,
        nome_cultos (
          id,
          nome_culto
        )
      ),
      musicas (
        id,
        musica,
        cantor
      ),
      tons (
        id,
        nome_tons
      ),
      membros (
        id,
        nome
      )
    `);
  }
}

export default CacheService;
