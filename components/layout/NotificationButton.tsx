import React, { useMemo } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { AvisoGeral } from '../../services/AvisoGeralService';

interface NotificationButtonProps {
  onClick: () => void;
  className: string;
  iconClassName?: string;
  title?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  onClick,
  className,
  iconClassName = 'text-sm',
  title = 'Notificacoes'
}) => {
  const { currentMember, activeMinisterioId } = useMinistryContext();
  const { data: avisosRaw } = useLocalStorageFirst<AvisoGeral>({
    table: 'aviso_geral',
    refreshInterval: 15000
  });

  const unreadCount = useMemo(() => {
    if (!currentMember?.id) {
      return 0;
    }

    return (avisosRaw || []).filter(
      (aviso) =>
        aviso.id_membro === currentMember.id &&
        !aviso.lida &&
        (!activeMinisterioId || !aviso.ministerio_id || aviso.ministerio_id === activeMinisterioId)
    ).length;
  }, [activeMinisterioId, avisosRaw, currentMember?.id]);

  return (
    <button onClick={onClick} className={className} title={title}>
      <i className={`fas fa-bell ${iconClassName}`}></i>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[9px] font-black leading-none text-white shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationButton;
