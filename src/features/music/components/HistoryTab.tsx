import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../../../models/music';

interface HistoryTabProps {
  history: HistoryItem[];
  loading?: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ 
  history, 
  loading = false 
}) => {
  const [expandedMinisters, setExpandedMinisters] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [expandedStyles, setExpandedStyles] = useState<Record<string, boolean>>({});

  // Group history by minister, theme, and style
  const groupedHistory = useMemo(() => {
    const grouped: Record<string, Record<string, Record<string, HistoryItem[]>>> = {};
    
    history.forEach(item => {
      const minister = item.minister || 'Sem Ministro';
      const theme = item.theme || 'Geral';
      const style = item.style || 'Outro';
      
      if (!grouped[minister]) grouped[minister] = {};
      if (!grouped[minister][theme]) grouped[minister][theme] = {};
      if (!grouped[minister][theme][style]) grouped[minister][theme][style] = [];
      
      grouped[minister][theme][style].push(item);
    });
    
    return grouped;
  }, [history]);

  const toggleMinister = (minister: string) => {
    setExpandedMinisters(prev => ({
      ...prev,
      [minister]: !prev[minister]
    }));
  };

  const toggleTheme = (minister: string, theme: string) => {
    const key = `${minister}-${theme}`;
    setExpandedThemes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleStyle = (minister: string, theme: string, style: string) => {
    const key = `${minister}-${theme}-${style}`;
    setExpandedStyles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center">
        <i className="fas fa-history text-4xl text-slate-300 dark:text-slate-600 mb-4"></i>
        <p className="text-slate-500 dark:text-slate-400">
          Nenhum histórico de músicas encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Histórico de Músicas ({history.length})
          </h3>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Organizado por ministro → tema → estilo
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([minister, themes]) => (
            <div key={minister} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {/* Minister Header */}
              <button
                onClick={() => toggleMinister(minister)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <i className="fas fa-user text-blue-600 dark:text-blue-400"></i>
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {minister}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {Object.keys(themes).length} tema(s) • 
                      {Object.values(themes).reduce((acc, themeStyles) => 
                        acc + Object.values(themeStyles).reduce((styleAcc, styleItems) => 
                          styleAcc + styleItems.length, 0), 0
                      )} música(s)
                    </p>
                  </div>
                </div>
                <i className={`fas fa-chevron-${expandedMinisters[minister] ? 'up' : 'down'} text-slate-400`}></i>
              </button>

              {/* Themes */}
              {expandedMinisters[minister] && (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {Object.entries(themes).map(([theme, styles]) => (
                    <div key={theme} className="bg-white dark:bg-slate-900">
                      {/* Theme Header */}
                      <button
                        onClick={() => toggleTheme(minister, theme)}
                        className="w-full px-8 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded">
                            <i className="fas fa-tag text-purple-600 dark:text-purple-400 text-xs"></i>
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {theme}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            ({Object.values(styles).reduce((acc, styleItems) => acc + styleItems.length, 0)} músicas)
                          </span>
                        </div>
                        <i className={`fas fa-chevron-${expandedThemes[`${minister}-${theme}`] ? 'up' : 'down'} text-slate-400 text-sm`}></i>
                      </button>

                      {/* Styles */}
                      {expandedThemes[`${minister}-${theme}`] && (
                        <div className="px-8 pb-4 space-y-3">
                          {Object.entries(styles).map(([style, items]) => (
                            <div key={style} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                              {/* Style Header */}
                              <button
                                onClick={() => toggleStyle(minister, theme, style)}
                                className="w-full flex items-center justify-between mb-3"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded">
                                    <i className="fas fa-music text-green-600 dark:text-green-400 text-xs"></i>
                                  </div>
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {style}
                                  </span>
                                  <span className="text-sm text-slate-500 dark:text-slate-400">
                                    ({items.length} execuções)
                                  </span>
                                </div>
                                <i className={`fas fa-chevron-${expandedStyles[`${minister}-${theme}-${style}`] ? 'up' : 'down'} text-slate-400 text-sm`}></i>
                              </button>

                              {/* Songs List */}
                              {expandedStyles[`${minister}-${theme}-${style}`] && (
                                <div className="space-y-2">
                                  {items.map((item, index) => (
                                    <div key={`${item.id}-${index}`} className="bg-white dark:bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="font-medium text-slate-900 dark:text-white">
                                          {item.song}
                                        </div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                          {item.singer && `Cantor: ${item.singer}`}
                                          {item.singer && item.key && ' • '}
                                          {item.key && `Tom: ${item.key}`}
                                          {item.date && ` • ${item.date}`}
                                        </div>
                                      </div>
                                      <div className="text-xs text-slate-400 dark:text-slate-500">
                                        #{index + 1}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
