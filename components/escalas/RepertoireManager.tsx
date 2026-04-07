import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { RepertoireItem } from '../../types';
import { Song } from '../../types-supabase';

interface RepertoireManagerProps {
  eventId: string;
  repertoire: RepertoireItem[];
  allSongs: Song[];
  tones: string[];
  singersInEvent: { id: string; name: string }[];
  isMember: boolean;
  onSongAdded: () => void;
}

const RepertoireManager: React.FC<RepertoireManagerProps> = ({
  eventId,
  repertoire,
  allSongs,
  tones,
  singersInEvent,
  isMember,
  onSongAdded
}) => {
  console.log('RepertoireManager - allSongs:', allSongs);
  console.log('RepertoireManager - allSongs.length:', allSongs?.length);
  const [showAddSong, setShowAddSong] = useState(false);
  const [editingSongId, setEditingSongId] = useState<{ eventId: string, songId: string } | null>(null);
  const [isSavingSong, setIsSavingSong] = useState(false);
  const [newSongData, setNewSongData] = useState({ song: '', singer: '', key: '' });

  const handleSaveSong = async () => {
    if (!isMember) {
      showError('Apenas membros podem adicionar músicas.');
      return;
    }
    
    if (!newSongData.song || !newSongData.singer) return;

    // Prevenir cliques duplos
    if (isSavingSong) return;
    setIsSavingSong(true);

    try {
      // Find existing music by ID
      const { data: musicData, error: musicError } = await supabase.from('musicas').select('*').eq('id', newSongData.song).single();
      
      if (musicError || !musicData) {
        logger.error('Erro ao buscar música:', musicError, 'database');
        showError('Música não encontrada.');
        setIsSavingSong(false);
        return;
      }

      let musicId = musicData.id;
      logger.info('Música encontrada:', { musicId, musicData }, 'database');

      // Get tone ID (opcional)
      let toneId = null;
      if (newSongData.key) {
        const { data: toneData, error: toneError } = await supabase.from('tons').select('id').eq('nome_tons', newSongData.key).single();
        if (toneError) {
          logger.warn('Tom não encontrado:', toneError, 'database');
        } else if (toneData) {
          toneId = toneData.id;
        }
      }

      // Validate singer ID if provided
      if (newSongData.singer) {
        const { data: singerData, error: singerError } = await supabase.from('membros').select('id').eq('id', newSongData.singer).single();
        if (singerError || !singerData) {
          logger.error('Cantor não encontrado:', singerError, 'database');
          showError('Cantor não encontrado na base de dados.');
          setIsSavingSong(false);
          return;
        }
      }

      if (editingSongId) {
        // Update existing song in repertoire
        const updateData: {
          id_musicas: string;
          id_tons: string;
          id_membros?: string;
        } = {
          id_musicas: musicId,
          id_tons: toneId
        };
        
        if (newSongData.singer) {
          updateData.id_membros = newSongData.singer;
        }

        const { error } = await supabase
          .from('repertorio')
          .update(updateData)
          .eq('id', editingSongId.songId);

        if (error) throw error;
      } else {
        // Insert new song
        const repertoireData: {
          id_culto: string;
          id_musicas: string;
          id_tons?: string;
          id_membros?: string;
        } = {
          id_culto: eventId,
          id_musicas: musicId
        };
        
        if (toneId) {
          repertoireData.id_tons = toneId;
        }
        
        if (newSongData.singer) {
          repertoireData.id_membros = newSongData.singer;
        }

        logger.info('Enviando dados para repertorio:', repertoireData, 'database');
        
        // Primeiro, vamos verificar se o usuário tem permissão para inserir
        const { data: testData, error: testError } = await supabase
          .from('repertorio')
          .select('id')
          .limit(1);
          
        if (testError) {
          logger.error('Erro de permissão ao acessar repertorio:', testError, 'database');
          throw new Error(`Sem permissão para acessar a tabela repertorio: ${testError.message}`);
        }
        
        logger.info('Permissão verificada, inserindo dados...', 'database');
        
        const { data, error } = await supabase
          .from('repertorio')
          .insert(repertoireData)
          .select(); // Adiciona .select() para retornar os dados inseridos
        logger.info('Resposta do Supabase:', { data, error }, 'database');
        
        if (error) {
          logger.error('Erro específico do Supabase:', error, 'database');
          throw error;
        }
        
        // Se não houver erro mas data for null, a inserção funcionou mas não retornou dados
        if (!data) {
          logger.info('Inserção bem-sucedida mas sem retorno de dados', 'database');
        }
      }

      setShowAddSong(false);
      setEditingSongId(null);
      setNewSongData({ song: '', singer: '', key: '' });
      onSongAdded();
      
      // Toast de sucesso
      if (editingSongId) {
        showSuccess('Música atualizada com sucesso!');
      } else {
        showSuccess('Música adicionada ao repertório com sucesso!');
      }
    } catch (err) {
      logger.error('Error saving song to repertoire:', err, 'database');
      logger.error('Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      }, 'database');
      showError(`Erro ao salvar música no repertório: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSavingSong(false);
    }
  };

  const handleEditSong = async (song: RepertoireItem) => {
    // Buscar dados completos da música no repertório
    const { data: repertoireData } = await supabase
      .from('repertorio')
      .select(`
        id,
        id_musicas,
        id_membros,
        id_tons,
        musicas (id, musica, cantor),
        tons (nome_tons),
        membros (nome)
      `)
      .eq('id', song.id)
      .single();

    if (repertoireData) {
      const musicData = Array.isArray(repertoireData.musicas) ? repertoireData.musicas[0] : repertoireData.musicas;
      const toneData = Array.isArray(repertoireData.tons) ? repertoireData.tons[0] : repertoireData.tons;
      
      setEditingSongId({ eventId, songId: song.id });
      setNewSongData({
        song: musicData?.id || '',
        singer: repertoireData.id_membros || '',
        key: toneData?.nome_tons || ''
      });
      setShowAddSong(true);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!isMember) {
      showError('Apenas membros podem remover músicas.');
      return;
    }

    // Criar modal de confirmação personalizado
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50';
    confirmModal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-red-500"></i>
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">Confirmar Exclusão</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-300 mb-6">Tem certeza que deseja remover esta música do repertório?</p>
        <div class="flex gap-3">
          <button id="cancelDelete" class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button id="confirmDelete" class="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors">
            Remover
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Adicionar eventos aos botões
    const cancelBtn = confirmModal.querySelector('#cancelDelete');
    const confirmBtn = confirmModal.querySelector('#confirmDelete');
    
    const closeModal = () => {
      document.body.removeChild(confirmModal);
    };
    
    cancelBtn?.addEventListener('click', closeModal);
    
    confirmBtn?.addEventListener('click', async () => {
      try {
        closeModal();
        
        const { error } = await supabase
          .from('repertorio')
          .delete()
          .eq('id', songId);

        if (error) throw error;
        
        showSuccess('Música removida do repertório com sucesso!');
        onSongAdded();
      } catch (error) {
        logger.error('Error removing song from repertoire:', error, 'database');
        showError('Erro ao remover música do repertório.');
      }
    });
    
    // Fechar ao clicar fora
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        closeModal();
      }
    });
  };

  return (
    <div>
      {/* Add Song Button */}
      {!showAddSong && isMember && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { 
              setShowAddSong(true); 
              setEditingSongId(null); 
              setNewSongData({ song: '', singer: '', key: '' }); 
            }}
            className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all"
          >
            <i className="fas fa-plus text-[8px]"></i> Nova Música
          </button>
        </div>
      )}

      {/* Add Song Form */}
      {showAddSong && (
        <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            {editingSongId ? 'EDITAR MÚSICA' : 'ADICIONAR MÚSICA'}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Música</label>
              <select
                value={newSongData.song}
                onChange={(e) => {
                  const selectedSong = allSongs.find(s => s.id === e.target.value);
                  setNewSongData({ 
                    ...newSongData, 
                    song: e.target.value,
                    singer: selectedSong?.cantor || ''
                  });
                }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none appearance-none"
              >
                <option value="">Selecionar Música... *</option>
                {allSongs.map(m => (
                  <option key={m.id} value={m.id}>{m.musica} - {m.cantor}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={newSongData.singer}
                onChange={(e) => setNewSongData({ ...newSongData, singer: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none appearance-none"
              >
                <option value="">Cantor... *</option>
                {singersInEvent.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                value={newSongData.key}
                onChange={(e) => setNewSongData({ ...newSongData, key: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none appearance-none"
              >
                <option value="">Tom (opcional)...</option>
                {tones.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {isMember && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddSong(false)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
              <button 
                onClick={handleSaveSong} 
                disabled={isSavingSong}
                className="flex-1 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingSong ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-[8px]"></i>
                    Salvando...
                  </>
                ) : (
                  editingSongId ? 'Atualizar' : 'Salvar'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Song List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {repertoire.map((item, index) => (
          <div key={`${eventId}-rep-${index}`} className="group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* Header com Tom e Informações da Música */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 relative">
              <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                {item.key || 'Ñ'}
              </div>
              <div className="flex-1 ml-3">
                <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{item.musica} - {item.cantor}</h5>
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">
                  Ministro: <span className="text-brand">{item.minister || 'Sem ministro'}</span>
                </p>
              </div>
              {isMember && (
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button 
                    onClick={() => handleEditSong(item)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-500 text-white shadow-md hover:bg-blue-600 transition-all duration-300"
                    title="Editar música"
                  >
                    <i className="fas fa-edit text-[8px]"></i>
                  </button>
                  <button 
                    onClick={() => handleDeleteSong(item.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500 text-white shadow-md hover:bg-red-600 transition-all duration-300"
                    title="Excluir música"
                  >
                    <i className="fas fa-trash-alt text-[8px]"></i>
                  </button>
                </div>
              )}
            </div>
            
            {/* Botões de Links */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-4 gap-1">
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.musica} ${item.cantor}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                <a href={`https://open.spotify.com/search/${encodeURIComponent(`${item.musica} ${item.cantor}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-green-600 hover:bg-green-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(`${item.musica} ${item.cantor} cifra`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[10px]"></i></a>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(`${item.musica} ${item.cantor} letra`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-purple-600 hover:bg-purple-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-microphone-alt text-[10px]"></i></a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RepertoireManager;
