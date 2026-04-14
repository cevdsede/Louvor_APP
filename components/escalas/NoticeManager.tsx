import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { logger } from '../../utils/logger';

interface Notice {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface NoticeManagerProps {
  eventId: string;
  notices: Notice[];
  currentUser: { id: string, name: string } | null;
  isMember: boolean;
  ministerioId?: string | null;
  onNoticesUpdated: () => void;
}

const NoticeManager: React.FC<NoticeManagerProps> = ({
  eventId,
  notices,
  currentUser,
  isMember,
  ministerioId,
  onNoticesUpdated
}) => {
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<{ eventId: string, noticeId: string } | null>(null);
  const [noticeText, setNoticeText] = useState('');

  const handleSaveNotice = async () => {
    if (!noticeText.trim()) return;

    // Verifica se é membro válido
    if (!isMember || !currentUser) {
      showError('Apenas membros cadastrados podem criar avisos.');
      return;
    }

    try {
      const noticeData = {
        id_cultos: eventId,
        info: noticeText.trim(),
        id_membros: currentUser.id,
        ministerio_id: ministerioId
      };

      if (editingNoticeId) {
        // Update existing notice
        const { error } = await supabase
          .from('avisos_cultos')
          .update({ info: noticeText.trim() })
          .eq('id_lembrete', editingNoticeId.noticeId);

        if (error) throw error;

        // Update local state
        // This will be handled by parent component refresh
      } else {
        // Insert new notice
        const { error } = await supabase
          .from('avisos_cultos')
          .insert(noticeData);

        if (error) throw error;
      }

      setNoticeText('');
      setEditingNoticeId(null);
      setShowAddNotice(false);
      
      // Toast de sucesso
      if (editingNoticeId) {
        showSuccess('Aviso atualizado com sucesso!');
      } else {
        showSuccess('Aviso postado com sucesso!');
      }
      
      onNoticesUpdated();
    } catch (error) {
      logger.error('Error saving notice:', error, 'database');
      showError('Erro ao salvar aviso.');
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
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
        <p class="text-slate-600 dark:text-slate-300 mb-6">Tem certeza que deseja remover este aviso?</p>
        <div class="flex gap-3">
          <button id="cancelDeleteNotice" class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button id="confirmDeleteNotice" class="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors">
            Remover
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Adicionar eventos aos botões
    const cancelBtn = confirmModal.querySelector('#cancelDeleteNotice');
    const confirmBtn = confirmModal.querySelector('#confirmDeleteNotice');
    
    const closeModal = () => {
      document.body.removeChild(confirmModal);
    };
    
    cancelBtn?.addEventListener('click', closeModal);
    
    confirmBtn?.addEventListener('click', async () => {
      try {
        closeModal();
        
        const { error } = await supabase
          .from('avisos_cultos')
          .delete()
          .eq('id_lembrete', noticeId);

        if (error) throw error;
        
        showSuccess('Aviso removido com sucesso!');
        onNoticesUpdated();
      } catch (error) {
        logger.error('Error deleting notice:', error, 'database');
        showError('Erro ao deletar aviso.');
      }
    });
    
    // Fechar ao clicar fora
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        closeModal();
      }
    });
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNoticeId({ eventId, noticeId: notice.id });
    setNoticeText(notice.text);
    setShowAddNotice(true);
  };

  return (
    <div>
      {/* Add Notice Button */}
      {!showAddNotice && isMember && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { 
              setShowAddNotice(true); 
              setEditingNoticeId(null); 
              setNoticeText(''); 
            }}
            className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all"
          >
            <i className="fas fa-plus text-[8px]"></i> Novo Aviso
          </button>
        </div>
      )}

      {/* Add Notice Form */}
      {showAddNotice && (
        <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            {editingNoticeId ? 'EDITAR AVISO' : 'NOVO AVISO'}
          </h4>
          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="Digite seu aviso aqui..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-brand outline-none resize-none"
            rows={3}
          />
          {isMember && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddNotice(false)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
              <button 
                onClick={handleSaveNotice}
                className="flex-1 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-brand/90 transition-colors"
              >
                {editingNoticeId ? 'Atualizar' : 'Postar'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notices List */}
      {notices.length > 0 ? (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice.id} className="group p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[8px] font-black text-brand uppercase tracking-widest">{notice.sender}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[7px] font-bold text-slate-400 uppercase">{notice.time}</span>
                  {isMember && (
                    <>
                      <button 
                        onClick={() => handleEditNotice(notice)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        title="Editar aviso"
                      >
                        <i className="fas fa-edit text-[8px]"></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                        title="Deletar aviso"
                      >
                        <i className="fas fa-trash-alt text-[8px]"></i>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{notice.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-bell-slash text-slate-400 text-lg"></i>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aviso ainda</p>
          {isMember && (
            <p className="text-[8px] text-slate-500 mt-2">Clique em "Novo Aviso" para adicionar um comunicado</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NoticeManager;
