import React, { useState } from 'react';
import { Music } from '../../../models/music';
import { logger } from '../../../utils/logger';

interface SongListProps {
  songs: Music[];
  loading?: boolean;
  onEdit?: (song: Music) => void;
  onDelete?: (songId: string) => void;
}

export const SongList: React.FC<SongListProps> = ({ 
  songs, 
  loading = false,
  onEdit,
  onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStyle, setFilterStyle] = useState<string>('all');
  const [filterTheme, setFilterTheme] = useState<string>('all');

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.musica.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (song.cantor && song.cantor.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStyle = filterStyle === 'all' || song.estilo === filterStyle;
    const matchesTheme = filterTheme === 'all' || 
                         (song.temas && song.temas.some(t => t.nome_tema === filterTheme));
    
    return matchesSearch && matchesStyle && matchesTheme;
  });

  const uniqueThemes = Array.from(new Set(
    songs.flatMap(song => song.temas?.map(t => t.nome_tema) || [])
  ));

  const handleEdit = (song: Music) => {
    if (onEdit) {
      onEdit(song);
    }
  };

  const handleDelete = async (songId: string) => {
    if (onDelete) {
      onDelete(songId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Pesquisar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar música ou cantor..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Estilo
            </label>
            <select
              value={filterStyle}
              onChange={(e) => setFilterStyle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="Adoração">Adoração</option>
              <option value="Celebração">Celebração</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tema
            </label>
            <select
              value={filterTheme}
              onChange={(e) => setFilterTheme(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
            >
              <option value="all">Todos</option>
              {uniqueThemes.map(theme => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Músicas ({filteredSongs.length})
          </h3>
        </div>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredSongs.length === 0 ? (
            <div className="p-8 text-center">
              <i className="fas fa-music text-4xl text-slate-300 dark:text-slate-600 mb-4"></i>
              <p className="text-slate-500 dark:text-slate-400">
                {searchTerm || filterStyle !== 'all' || filterTheme !== 'all' 
                  ? 'Nenhuma música encontrada com os filtros aplicados'
                  : 'Nenhuma música cadastrada'
                }
              </p>
            </div>
          ) : (
            filteredSongs.map((song) => (
              <div key={song.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-xl">
                      <i className="fas fa-music text-blue-600 dark:text-blue-400"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {song.musica}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {song.cantor && `Cantor: ${song.cantor}`}
                        {song.cantor && song.estilo && ' • '}
                        {song.estilo && `Estilo: ${song.estilo}`}
                      </p>
                      {song.temas && song.temas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {song.temas.map((theme, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                            >
                              {theme.nome_tema}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => handleEdit(song)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar música"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => handleDelete(song.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Excluir música"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
