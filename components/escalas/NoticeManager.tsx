import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { logger } from '../../utils/logger';
import AvisoGeralService from '../../services/AvisoGeralService';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { showConfirmModal } from '../../utils/confirmModal';

interface Notice {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  time: string;
}

interface NoticeManagerProps {
  eventId: string;
  notices: Notice[];
  currentUser: { id: string, name: string } | null;
  canManageNotices: boolean;
  isAdmin: boolean;
  ministerioId?: string | null;
  onNoticesUpdated: () => void;
}

const NoticeManager: React.FC<NoticeManagerProps> = ({
  eventId,
  notices,
  currentUser,
  canManageNotices,
  isAdmin,
  ministerioId,
  onNoticesUpdated
}) => {
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<{ eventId: string, noticeId: string } | null>(null);
  const [noticeText, setNoticeText] = useState('');

  const handleSaveNotice = async () => {
    if (!noticeText.trim()) return;

    // Verifica se é membro válido
    if (!canManageNotices || !currentUser) {
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

      const isEditing = Boolean(editingNoticeId);

      if (isEditing) {
        LocalStorageFirstService.update('avisos_cultos', editingNoticeId.noticeId, {
          info: noticeText.trim()
        });
      } else {
        LocalStorageFirstService.add('avisos_cultos', noticeData);
      }

      setNoticeText('');
      setEditingNoticeId(null);
      setShowAddNotice(false);

      if (!isEditing && currentUser?.id) {
        await AvisoGeralService.notifyScaleMembers({
          cultoId: eventId,
          ministerioId,
          senderId: currentUser.id,
          tipo: 'escala_aviso',
          texto: `${currentUser.name} adicionou um aviso nesta escala: ${noticeText.trim()}`
        });
      }
      
      // Toast de sucesso
      if (isEditing) {
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
    const confirmed = await showConfirmModal({
      title: 'Excluir aviso',
      message: 'Este aviso sera removido desta escala.',
      confirmText: 'Excluir',
      cancelText: 'Manter',
      type: 'danger',
      icon: 'fa-trash-alt'
    });

    if (!confirmed) {
      return;
    }

    try {
      LocalStorageFirstService.remove('avisos_cultos', noticeId);
      showSuccess('Aviso removido com sucesso!');
      onNoticesUpdated();
    } catch (error) {
      logger.error('Error deleting notice:', error, 'database');
      showError('Erro ao deletar aviso.');
    }
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNoticeId({ eventId, noticeId: notice.id });
    setNoticeText(notice.text);
    setShowAddNotice(true);
  };

  const canEditOrDeleteNotice = (notice: Notice) =>
    isAdmin || (Boolean(currentUser?.id) && currentUser?.id === notice.senderId);

  return (
    <div>
      {/* Add Notice Button */}
      {!showAddNotice && canManageNotices && (
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
          {canManageNotices && (
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
                  {canManageNotices && canEditOrDeleteNotice(notice) && (
                    <>
                      <button 
                        onClick={() => handleEditNotice(notice)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40"
                        title="Editar aviso"
                      >
                        <i className="fas fa-edit text-[8px]"></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
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
          {canManageNotices && (
            <p className="text-[8px] text-slate-500 mt-2">Clique em "Novo Aviso" para adicionar um comunicado</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NoticeManager;
