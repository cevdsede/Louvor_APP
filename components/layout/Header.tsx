import React from 'react';
import { useMinistryContext } from '../../contexts/MinistryContext';

interface HeaderProps {
  onSync: () => void;
  onOpenProfile: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSync, onOpenProfile }) => {
  const { activeMinisterioId, setActiveMinisterioId, userMinisterios } = useMinistryContext();

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 z-[90] px-6 flex items-center justify-between transition-colors">
      <h1 className="text-lg font-black tracking-tighter uppercase text-slate-800 dark:text-white">
        Cloud <span className="text-brand">Worship</span>
      </h1>
      <div className="flex items-center gap-2">
        <button 
          onClick={onSync}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand transition-all shadow-sm"
          title="Sincronizar"
        >
          <i className="fas fa-sync-alt text-sm"></i>
        </button>

        {/* Seletor de Ministério no Mobile Header */}
        {userMinisterios.length > 1 && (
          <select
            value={activeMinisterioId || ''}
            onChange={(e) => setActiveMinisterioId(e.target.value)}
            className="h-10 px-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-brand max-w-[110px] shadow-sm appearance-none text-center"
          >
            {userMinisterios.map((ministerio) => (
              <option key={ministerio.id} value={ministerio.id}>
                {ministerio.nome}
              </option>
            ))}
          </select>
        )}

        <button 
          onClick={onOpenProfile}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand text-white shadow-md hover:scale-105 active:scale-95 transition-all"
          title="Perfil e Ajustes"
        >
          <i className="fas fa-user text-sm"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;
