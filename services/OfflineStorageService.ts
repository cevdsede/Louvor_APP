type OfflineStoreName = 'cache' | 'meta';

interface OfflineRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

class OfflineStorageService {
  private static readonly DB_NAME = 'louvor_offline_storage';
  private static readonly DB_VERSION = 1;
  private static dbPromise: Promise<IDBDatabase> | null = null;

  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  static async get<T>(storeName: OfflineStoreName, key: string): Promise<T | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const db = await this.getDatabase();
      const record = await this.request<OfflineRecord<T> | undefined>(
        db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
      );

      return record?.value ?? null;
    } catch (error) {
      console.warn('Nao foi possivel ler IndexedDB offline:', error);
      return null;
    }
  }

  static async set<T>(storeName: OfflineStoreName, key: string, value: T): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      const db = await this.getDatabase();
      const record: OfflineRecord<T> = {
        key,
        value,
        updatedAt: Date.now()
      };

      await this.request(db.transaction(storeName, 'readwrite').objectStore(storeName).put(record));
    } catch (error) {
      console.warn('Nao foi possivel salvar IndexedDB offline:', error);
    }
  }

  static async remove(storeName: OfflineStoreName, key: string): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      const db = await this.getDatabase();
      await this.request(db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key));
    } catch (error) {
      console.warn('Nao foi possivel remover IndexedDB offline:', error);
    }
  }

  static async clear(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    try {
      const db = await this.getDatabase();
      await Promise.all([
        this.request(db.transaction('cache', 'readwrite').objectStore('cache').clear()),
        this.request(db.transaction('meta', 'readwrite').objectStore('meta').clear())
      ]);
    } catch (error) {
      console.warn('Nao foi possivel limpar IndexedDB offline:', error);
    }
  }

  static async getUsage(): Promise<{ supported: boolean; usage: number; quota: number }> {
    if (!this.isSupported() || !navigator.storage?.estimate) {
      return { supported: this.isSupported(), usage: 0, quota: 0 };
    }

    const estimate = await navigator.storage.estimate();
    return {
      supported: true,
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }

  private static getDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        this.ensureStore(db, 'cache');
        this.ensureStore(db, 'meta');
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private static ensureStore(db: IDBDatabase, storeName: OfflineStoreName): void {
    if (!db.objectStoreNames.contains(storeName)) {
      db.createObjectStore(storeName, { keyPath: 'key' });
    }
  }

  private static request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export default OfflineStorageService;
