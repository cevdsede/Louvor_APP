import React, { useState, useEffect } from 'react';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { ImageCache } from './ImageCache';

const CleaningView: React.FC = () => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [cleaningImage, setCleaningImage] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromLocalCache = () => {
      const limpeza = LocalStorageFirstService.get<any>('limpeza') || [];
      const latestImage = [...limpeza]
        .filter(item => typeof item?.foto === 'string' && item.foto.trim() !== '')
        .sort((a, b) => {
          const dateA = new Date(a?.created_at || 0).getTime();
          const dateB = new Date(b?.created_at || 0).getTime();
          return dateB - dateA;
        })[0];

      setCleaningImage(latestImage?.foto || '');
    };

    loadFromLocalCache();
    setLoading(false);

    if (navigator.onLine) {
      LocalStorageFirstService.forceSync('limpeza')
        .then(loadFromLocalCache)
        .catch(error => console.warn('Erro ao sincronizar imagem de limpeza:', error));
    }
  }, []);

  const renderCleaningIllustration = (className = 'w-full h-auto transition-transform duration-1000 group-hover:scale-105') => {
    if (loading) {
      return (
        <div className={`${className} flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
        </div>
      );
    }

    if (!cleaningImage) {
      return (
        <svg
          width="800"
          height="1000"
          viewBox="0 0 800 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect width="800" height="1000" fill="#f3f4f6" />
          <text
            x="400"
            y="500"
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="24"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            Escala de Limpeza
          </text>
        </svg>
      );
    }

    return (
      <ImageCache
        src={cleaningImage}
        alt="Escala de Limpeza"
        className={className}
        cacheVariant="limpeza-hq"
        cacheMaxWidth={1200}
        cacheQuality={0.88}
        maxCacheSize={5 * 1024 * 1024}
      />
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800 text-center relative">
        <div className="mb-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-brand/5 text-brand rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <i className="fas fa-broom text-2xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Escala de Limpeza</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Manutenção e Zeladoria</p>
        </div>

        <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
          {renderCleaningIllustration()}

          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
            <div className="flex gap-4">
              <button
                onClick={() => setIsZoomed(true)}
                className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl hover:bg-brand hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
              >
                <i className="fas fa-search-plus mr-2"></i> Ampliar
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed max-w-lg mx-auto italic">
            "Pois zelamos pelo que é honesto, não só diante do Senhor, mas também diante dos homens."
            <span className="block mt-2 font-black not-italic text-brand text-[10px] uppercase tracking-widest">2 Coríntios 8:21</span>
          </p>
        </div>
      </div>

      {/* Modal de Zoom */}
      {isZoomed && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in" onClick={() => setIsZoomed(false)}>
          <button
            className="absolute top-8 right-8 text-white hover:text-brand transition-colors text-3xl"
            onClick={() => setIsZoomed(false)}
          >
            <i className="fas fa-times"></i>
          </button>

          <div className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {renderCleaningIllustration('max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-up')}
          </div>
        </div>
      )}
    </div>
  );
};

export default CleaningView;
