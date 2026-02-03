import React from 'react';
import { useMusicData, useMusicStats } from './hooks/useMusicData';
import { MusicStatsDashboard } from './components/MusicStatsDashboard';
import { SongList } from './components/SongList';
import { HistoryTab } from './components/HistoryTab';

interface MusicFeatureProps {
  subView: string;
}

export const MusicFeature: React.FC<MusicFeatureProps> = ({ subView }) => {
  const { songs, repertoires, history, loading, error, refetch } = useMusicData(subView);
  const stats = useMusicStats(songs, repertoires, history);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3">
          <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-semibold">Erro ao carregar dados</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  switch (subView) {
    case 'music-stats':
      return <MusicStatsDashboard stats={stats} loading={loading} />;
    
    case 'music-list':
      return (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Músicas</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gerencie o catálogo de músicas do ministério
            </p>
          </div>
          <SongList songs={songs} loading={loading} />
        </div>
      );
    
    case 'music-history':
      return (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico de Músicas</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Visualize o histórico de execuções organizado por ministro
            </p>
          </div>
          <HistoryTab history={history} loading={loading} />
        </div>
      );
    
    default:
      return (
        <div className="text-center py-12">
          <i className="fas fa-music text-6xl text-slate-300 dark:text-slate-600 mb-4"></i>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Visualização não encontrada
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            A visualização "{subView}" não está disponível no momento.
          </p>
        </div>
      );
  }
};
