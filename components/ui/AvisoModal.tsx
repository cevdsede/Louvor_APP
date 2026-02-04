
import React, { useState } from 'react';
import { showSuccess } from '../../utils/toast';

interface AvisoModalProps {
  eventId: string | null;
  onClose: () => void;
}

const AvisoModal: React.FC<AvisoModalProps> = ({ eventId, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onClose();
      showSuccess('Seu aviso foi enviado com sucesso à liderança.');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Aviso de Culto</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <p className="text-slate-500 mb-6 font-medium leading-relaxed">
            Se você não puder comparecer ou tiver algum imprevisto, informe o motivo para que a liderança possa se organizar.
          </p>

          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva o motivo (ex: não poderei ir, chegarei atrasado...)"
            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium mb-8"
          ></textarea>

          <button 
            disabled={loading || !message.trim()}
            onClick={handleSend}
            className={`
              w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3
              ${loading || !message.trim() ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0'}
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
