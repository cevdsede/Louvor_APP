import React, { useEffect, useMemo, useState } from 'react';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { ImageCache } from './ImageCache';
import { useMinistryContext } from '../../contexts/MinistryContext';

interface CleaningItem {
  id?: string;
  foto?: string;
  ministerio_id?: string | null;
  ministerio_nome?: string | null;
  created_at?: string;
}

interface CleaningSlot {
  key: 'louvor' | 'midia';
  title: string;
  subtitle: string;
  icon: string;
  image: string;
}

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isMidia = (item: CleaningItem) => {
  const content = `${item.ministerio_nome || ''} ${item.ministerio_id || ''}`;
  const normalized = normalizeText(content);
  return normalized.includes('midia') || normalized.includes('media');
};

const isLouvor = (item: CleaningItem) => {
  const content = `${item.ministerio_nome || ''} ${item.ministerio_id || ''}`;
  const normalized = normalizeText(content);
  return normalized.includes('louvor');
};

const sortByDateDesc = (items: CleaningItem[]) =>
  [...items].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

const CleaningView: React.FC = () => {
  const { activeMinisterio } = useMinistryContext();
  const [isZoomed, setIsZoomed] = useState<CleaningSlot | null>(null);
  const [cleaningItems, setCleaningItems] = useState<CleaningItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromLocalCache = () => {
      const limpeza = (LocalStorageFirstService.get<CleaningItem>('limpeza') || []).filter(
        (item) => typeof item?.foto === 'string' && item.foto.trim() !== ''
      );
      setCleaningItems(sortByDateDesc(limpeza));
    };

    loadFromLocalCache();
    setLoading(false);

    if (navigator.onLine) {
      LocalStorageFirstService.forceSync('limpeza')
        .then(loadFromLocalCache)
        .catch((error) => console.warn('Erro ao sincronizar imagens da limpeza:', error));
    }
  }, []);

  const slots = useMemo<CleaningSlot[]>(() => {
    const latestImage = cleaningItems[0]?.foto || '';
    const louvorImage = cleaningItems.find(isLouvor)?.foto || latestImage;
    const midiaImage = cleaningItems.find(isMidia)?.foto || latestImage;

    return [
      {
        key: 'louvor',
        title: 'Louvor',
        subtitle: 'Escala de limpeza do ministerio de louvor',
        icon: 'fas fa-music',
        image: louvorImage || ''
      },
      {
        key: 'midia',
        title: 'Midia',
        subtitle: 'Escala de limpeza do ministerio de midia',
        icon: 'fas fa-photo-video',
        image: midiaImage || ''
      }
    ];
  }, [cleaningItems]);

  const visibleSlots = useMemo(() => {
    const activeSlug = normalizeText(activeMinisterio?.slug);

    if (activeSlug === 'louvor') {
      return slots.filter((slot) => slot.key === 'louvor');
    }

    if (activeSlug === 'midia' || activeSlug === 'media') {
      return slots.filter((slot) => slot.key === 'midia');
    }

    return slots;
  }, [activeMinisterio?.slug, slots]);

  const renderCleaningIllustration = (slot: CleaningSlot, className = 'w-full h-auto') => {
    if (loading) {
      return (
        <div className={`${className} flex min-h-[240px] items-center justify-center bg-slate-100 dark:bg-slate-800`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
        </div>
      );
    }

    if (!slot.image) {
      return (
        <div className={`${className} flex min-h-[240px] flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500`}>
          <i className={`${slot.icon} text-4xl mb-4`}></i>
          <p className="text-sm font-bold uppercase tracking-[0.25em]">{slot.title}</p>
          <p className="mt-2 text-xs font-semibold">Nenhuma imagem cadastrada</p>
        </div>
      );
    }

    return (
      <ImageCache
        src={slot.image}
        alt={`Escala de limpeza - ${slot.title}`}
        className={className}
        cacheVariant={`limpeza-${slot.key}-hq`}
        cacheMaxWidth={1400}
        cacheQuality={0.9}
        maxCacheSize={5 * 1024 * 1024}
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-10 shadow-sm border border-slate-100 dark:border-slate-800 relative">
        <div className="mb-10 flex justify-center">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/5 text-brand shadow-inner">
              <i className="fas fa-broom text-2xl"></i>
            </div>
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-800 dark:text-white">Escalas de Limpeza</h2>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              {visibleSlots.length === 1 ? visibleSlots[0].title : 'Louvor e Midia'}
            </p>
          </div>
        </div>

        <div className={`grid gap-6 ${visibleSlots.length > 1 ? 'lg:grid-cols-2' : 'justify-items-center'}`}>
          {visibleSlots.map((slot) => (
            <section
              key={slot.key}
              className={`${
                visibleSlots.length > 1 ? 'w-full' : 'w-full max-w-[560px]'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsZoomed(slot)}
                className="relative mx-auto block w-fit max-w-full overflow-hidden text-left"
              >
                {renderCleaningIllustration(
                  slot,
                  'mx-auto h-auto max-h-[300px] w-auto max-w-full object-contain rounded-[1.1rem] transition-transform duration-500 hover:scale-[1.02]'
                )}
              </button>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
          <p className="mx-auto max-w-2xl text-xs font-semibold italic leading-relaxed text-slate-500 dark:text-slate-400">
            "Pois zelamos pelo que e honesto, nao so diante do Senhor, mas tambem diante dos homens."
            <span className="mt-2 block text-[10px] font-black not-italic uppercase tracking-widest text-brand">2 Corintios 8:21</span>
          </p>
        </div>
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setIsZoomed(null)}
        >
          <button
            className="absolute top-8 right-8 text-3xl text-white transition-colors hover:text-brand"
            onClick={() => setIsZoomed(null)}
          >
            <i className="fas fa-times"></i>
          </button>

          <div
            className="max-h-full max-w-full overflow-hidden rounded-2xl shadow-2xl animate-scale-up"
            onClick={(event) => event.stopPropagation()}
          >
            {renderCleaningIllustration(isZoomed, 'max-h-[90vh] max-w-full object-contain rounded-2xl')}
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningView;
