import { useState, useEffect } from 'react';

const FALLBACK_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMDAiIHZpZXdCb3g9IjAgMCA4MDAgMTAwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSIxMDAwIiBmaWxsPSIjZGRkIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iNTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjI0Ij5JbWFnZW0gbmFvw6NvIGRpc3BvbsO2dmVsPC90ZXh0Pgo8L3N2Zz4=';

// Função para comprimir imagem
const compressImage = (file: File, maxWidth: number = 300, quality: number = 0.9): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Falha na compressão'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

interface ImageCacheOptions {
  maxWidth?: number;
  quality?: number;
  maxBlobSize?: number;
  cacheVariant?: string;
}

const getCacheKeyBase = (url: string, variant?: string) => {
  const cacheIdentity = variant ? `${variant}:${url}` : url;
  return `image_cache_${btoa(cacheIdentity)}`;
};

const getLatestCacheKey = (cacheKeyBase: string) => {
  const cachedKeys = Object.keys(localStorage).filter(key => key.startsWith(cacheKeyBase));
  if (!cachedKeys.length) return null;
  return cachedKeys
    .sort((a, b) => {
      const aTime = parseInt(a.split('_').pop() || '0', 10);
      const bTime = parseInt(b.split('_').pop() || '0', 10);
      return bTime - aTime;
    })[0];
};

const pruneDuplicateCacheEntries = (cacheKeyBase: string) => {
  const cachedKeys = Object.keys(localStorage).filter(key => key.startsWith(cacheKeyBase));
  if (cachedKeys.length <= 1) return;

  const sortedKeys = cachedKeys.sort((a, b) => {
    const aTime = parseInt(a.split('_').pop() || '0', 10);
    const bTime = parseInt(b.split('_').pop() || '0', 10);
    return bTime - aTime;
  });

  sortedKeys.slice(1).forEach(key => localStorage.removeItem(key));
};

const cleanOldCache = (aggressive = false) => {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('image_cache_'));
    if (keys.length < (aggressive ? 5 : 20)) return;

    const sortedKeys = keys.sort((a, b) => {
      const aTime = parseInt(a.split('_').pop() || '0', 10);
      const bTime = parseInt(b.split('_').pop() || '0', 10);
      return aTime - bTime;
    });

    const keepCount = aggressive ? 3 : 10;
    const toRemove = sortedKeys.slice(0, -keepCount);
    toRemove.forEach(key => localStorage.removeItem(key));

    console.log(`Limpou ${toRemove.length} imagens antigas do cache (${aggressive ? 'agressivo' : 'normal'})`);
  } catch (error) {
    console.warn('Erro ao limpar cache antigo:', error);
  }
};

const trySaveToCache = (cacheKey: string, data: string) => {
  try {
    localStorage.setItem(cacheKey, data);
    return true;
  } catch (error) {
    console.warn('Erro ao salvar imagem no cache, tentando limpeza adicional:', error);
    cleanOldCache(true);
    try {
      localStorage.setItem(cacheKey, data);
      return true;
    } catch (secondError) {
      console.warn('Ainda não foi possível salvar no cache:', secondError);
      Object.keys(localStorage)
        .filter(key => key.startsWith('image_cache_'))
        .forEach(key => localStorage.removeItem(key));
      try {
        localStorage.setItem(cacheKey, data);
        return true;
      } catch {
        return false;
      }
    }
  }
};

export const useImageCache = (
  url: string,
  fallbackUrl?: string,
  disableCompression = false,
  options: ImageCacheOptions = {}
) => {
  const {
    maxWidth = 300,
    quality = 0.9,
    maxBlobSize = 2048 * 1024,
    cacheVariant
  } = options;
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const setState = (src: string) => {
      if (!active) return;
      setImageSrc(src);
      setLoading(false);
    };

    const loadImage = async () => {
      if (!url) {
        setState(fallbackUrl || '');
        return;
      }

      const cacheKeyBase = getCacheKeyBase(url, cacheVariant);
      const latestKey = getLatestCacheKey(cacheKeyBase);
      if (latestKey) {
        const cached = localStorage.getItem(latestKey);
        if (cached) {
          pruneDuplicateCacheEntries(cacheKeyBase);
          setState(cached);
          return;
        }
      }

      if (disableCompression) {
        setState(url);
        return;
      }

      if (!navigator.onLine) {
        setState(fallbackUrl || FALLBACK_SVG);
        return;
      }

      try {
        const headResponse = await fetch(url, { method: 'HEAD' });
        if (!headResponse.ok) {
          throw new Error(`HTTP ${headResponse.status}`);
        }
      } catch (error) {
        console.warn('Imagem não acessível, usando fallback:', url, error);
        setState(fallbackUrl || FALLBACK_SVG);
        return;
      }

      try {
        const response = await fetch(url);
        const blob = await response.blob();

        if (blob.size > maxBlobSize) {
          console.warn('Imagem muito grande, pulando cache:', url, blob.size);
          setState(url);
          return;
        }

        cleanOldCache();

        let finalBase64: string;
        if (blob.size > 100 * 1024) {
          try {
            finalBase64 = await compressImage(new File([blob], 'temp.jpg', { type: 'image/jpeg' }), maxWidth, quality);
          } catch (compressError) {
            console.warn('Erro ao comprimir imagem, usando original:', compressError);
            finalBase64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } else {
          finalBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        const cacheKey = `${cacheKeyBase}_${Date.now()}`;
        const saved = trySaveToCache(cacheKey, finalBase64);
        if (saved) {
          pruneDuplicateCacheEntries(cacheKeyBase);
          setState(finalBase64);
        } else {
          setState(url);
        }
      } catch (error) {
        console.warn('Erro ao carregar imagem:', error);
        setState(fallbackUrl || FALLBACK_SVG);
      }
    };

    loadImage();
    return () => {
      active = false;
    };
  }, [url, fallbackUrl, disableCompression, maxWidth, quality, maxBlobSize, cacheVariant]);

  return { imageSrc, loading };
};
