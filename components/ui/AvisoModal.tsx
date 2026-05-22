import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

interface AvisoModalProps {
  eventId: string | null;
  onClose: () => void;
}

const AvisoModal: React.FC<AvisoModalProps> = ({ eventId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (!navigator.onLine) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const handleSend = async () => {
    if (!message.trim() || !eventId || !currentUser) return;

    setLoading(true);
    try {
      const novoAviso = {
        id: `local-${Date.now()}`,
        id_culto: eventId,
        texto: message.trim(),
        id_membros: currentUser.id,
        created_at: new Date().toISOString()
      };

      // Salvar via LocalStorageFirstService (será sincronizado depois)
      LocalStorageFirstService.add('avisos_cultos', novoAviso);
      
      showSuccess('Seu aviso foi enviado com sucesso à liderança.');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar aviso:', error);
      showError('Ocorreu um erro ao enviar o aviso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="bg-app-surface border-app relative w-full max-w-md overflow-hidden rounded-[2.5rem] border shadow-2xl animate-fade-in">
        <div className="p-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-app text-2xl font-black tracking-tighter uppercase">Aviso de Culto</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <p className="text-app-muted mb-6 font-medium leading-relaxed">
            Se você não puder comparecer ou tiver algum imprevisto, informe o motivo para que a liderança possa se organizar.
          </p>

          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva o motivo (ex: não poderei ir, chegarei atrasado...)"
            className="bg-app-surface-strong border-app text-app placeholder:text-app-muted mb-8 h-40 w-full resize-none rounded-3xl border p-6 font-medium transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          ></textarea>

          <button 
            disabled={loading || !message.trim() || !currentUser}
            onClick={handleSend}
            className={`
              w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3
              ${loading || !message.trim() || !currentUser ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0'}
            `}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <i className="fas fa-paper-plane"></i>
                Enviar Aviso
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvisoModal;
