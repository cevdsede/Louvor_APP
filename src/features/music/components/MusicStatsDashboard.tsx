import React, { useRef, useEffect } from 'react';
import { ChartInstances } from '../../../types-supabase';
import { logger } from '../../../utils/logger';

interface MusicStats {
  totalSongs: number;
  totalRepertoires: number;
  totalHistory: number;
  stylesDistribution: Record<string, number>;
  themesDistribution: Record<string, number>;
  topSongs: Array<{ song: string; count: number }>;
}

interface MusicStatsDashboardProps {
  stats: MusicStats;
  loading?: boolean;
}

export const MusicStatsDashboard: React.FC<MusicStatsDashboardProps> = ({ 
  stats, 
  loading = false 
}) => {
  const stylesChartRef = useRef<HTMLCanvasElement>(null);
  const themesChartRef = useRef<HTMLCanvasElement>(null);
  const rankingChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<ChartInstances>({});

  const themeColorsPalette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#ec4899'];

  useEffect(() => {
    if (!loading && stats) {
      createCharts();
    }

    return () => {
      // Cleanup charts on unmount
      Object.values(chartInstances.current).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
    };
  }, [stats, loading]);

  const createCharts = () => {
    try {
      createStylesChart();
      createThemesChart();
      createRankingChart();
    } catch (error) {
      logger.error('Error creating charts:', error, 'music');
    }
  };

  const createStylesChart = () => {
    if (!stylesChartRef.current || !window.Chart) return;

    // Destroy existing chart if it exists
    if (chartInstances.current.styles) {
      chartInstances.current.styles.destroy();
    }

    const ctx = stylesChartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstances.current.styles = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(stats.stylesDistribution),
        datasets: [{
          data: Object.values(stats.stylesDistribution),
          backgroundColor: themeColorsPalette,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          title: {
            display: true,
            text: 'Distribuição por Estilo',
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    });
  };

  const createThemesChart = () => {
    if (!themesChartRef.current || !window.Chart) return;

    if (chartInstances.current.themes) {
      chartInstances.current.themes.destroy();
    }

    const ctx = themesChartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstances.current.themes = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(stats.themesDistribution),
        datasets: [{
          label: 'Músicas por Tema',
          data: Object.values(stats.themesDistribution),
          backgroundColor: themeColorsPalette[0],
          borderColor: themeColorsPalette[0],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Músicas por Tema',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  };

  const createRankingChart = () => {
    if (!rankingChartRef.current || !window.Chart) return;

    if (chartInstances.current.ranking) {
      chartInstances.current.ranking.destroy();
    }

    const ctx = rankingChartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstances.current.ranking = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: stats.topSongs.map(item => item.song),
        datasets: [{
          label: 'Vezes Executadas',
          data: stats.topSongs.map(item => item.count),
          backgroundColor: themeColorsPalette[1],
          borderColor: themeColorsPalette[1],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Top Músicas Mais Executadas',
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-4 w-1/2"></div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Músicas</p>
              <p className="text-3xl font-bold mt-2">{stats.totalSongs}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <i className="fas fa-music text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Repertórios</p>
              <p className="text-3xl font-bold mt-2">{stats.totalRepertoires}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <i className="fas fa-list-music text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Histórico</p>
              <p className="text-3xl font-bold mt-2">{stats.totalHistory}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <i className="fas fa-history text-2xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <canvas ref={stylesChartRef} width={400} height={300}></canvas>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <canvas ref={themesChartRef} width={400} height={300}></canvas>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <canvas ref={rankingChartRef} width={400} height={300}></canvas>
        </div>
      </div>
    </div>
  );
};
