import React from 'react';
import { useMinistryContext } from '../../contexts/MinistryContext';
import MinistrySwitcher from './MinistrySwitcher';
import NotificationButton from './NotificationButton';

interface HeaderProps {
  onSync: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSync, onOpenProfile, onOpenNotifications }) => {
  const { userMinisterios } = useMinistryContext();

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 z-[90] px-6 flex items-center justify-between transition-colors">
      <h1 className="text-lg font-black tracking-tighter uppercase text-slate-800 dark:text-white">
        Valentes <span className="text-brand">Hub</span>
      </h1>
      <div className="flex items-center gap-2">
        <div className="relative">
          <NotificationButton
            onClick={onOpenNotifications}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 shadow-sm transition-all hover:text-brand dark:bg-slate-800"
          />
        </div>

        <button 
          onClick={onSync}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand transition-all shadow-sm"
          title="Sincronizar"
        >
          <i className="fas fa-sync-alt text-sm"></i>
        </button>

        {/* Seletor de Ministério no Mobile Header */}
        {userMinisterios.length > 1 && <MinistrySwitcher variant="mobile" />}

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
