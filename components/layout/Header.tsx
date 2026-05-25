import React from 'react';
import { useMinistryContext } from '../../contexts/MinistryContext';
import MinistrySwitcher from './MinistrySwitcher';
import NotificationButton from './NotificationButton';
import { ImageCache } from '../ui/ImageCache';
import { buildLocalAvatar } from '../../utils/avatar';

interface HeaderProps {
  onSync: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSync, onOpenProfile, onOpenNotifications, onOpenSearch }) => {
  const { userMinisterios, currentMember } = useMinistryContext();
  const memberPhoto = (currentMember as any)?.foto || buildLocalAvatar(currentMember?.nome || 'Usuario');

  return (
    <header className="bg-app-surface border-app fixed left-0 right-0 top-0 z-[90] flex h-16 items-center justify-between border-b px-6 backdrop-blur-xl transition-colors lg:hidden">
      <h1 className="text-app text-lg font-black uppercase tracking-tighter">
        Valentes <span className="text-brand">Connected</span>
      </h1>
      <div className="flex items-center gap-2">
        <div className="relative">
          <NotificationButton
            onClick={onOpenNotifications}
            className="app-icon-button"
          />
        </div>

        <button
          onClick={onOpenSearch}
          className="app-icon-button"
          title="Busca global"
        >
          <i className="fas fa-search text-sm"></i>
        </button>

        <button 
          onClick={onSync}
          className="app-icon-button"
          title="Sincronizar"
        >
          <i className="fas fa-sync-alt text-sm"></i>
        </button>

        {/* Seletor de Ministerio no Mobile Header */}
        {userMinisterios.length > 1 && <MinistrySwitcher variant="mobile" />}

        <button 
          onClick={onOpenProfile}
          className="app-panel flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl p-0 shadow-md transition-all hover:scale-105 active:scale-95"
          title="Perfil e Ajustes"
        >
          <ImageCache
            src={memberPhoto}
            fallbackSrc={buildLocalAvatar(currentMember?.nome || 'Usuario')}
            alt={currentMember?.nome || 'Usuario'}
            className="h-full w-full object-cover"
            disableCompression
          />
        </button>
      </div>
    </header>
  );
};

export default Header;
