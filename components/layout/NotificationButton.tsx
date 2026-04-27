import React, { useEffect, useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { AvisoGeral } from '../../services/AvisoGeralService';
import { buildWeeklyScaleItems } from '../../utils/weeklyScale';

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
  const { data: avisosRaw, loadData } = useLocalStorageFirst<AvisoGeral>({
    table: 'aviso_geral',
    refreshInterval: 15000
  });
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });
  const [scaleReadVersion, setScaleReadVersion] = useState(0);

  useEffect(() => {
    const handleUpdated = () => {
      loadData();
      setScaleReadVersion((version) => version + 1);
    };

    window.addEventListener('aviso-geral-updated', handleUpdated);
    return () => {
      window.removeEventListener('aviso-geral-updated', handleUpdated);
    };
  }, [loadData]);

  const unreadCount = useMemo(() => {
    if (!currentMember?.id) {
      return 0;
    }

    const unreadStoredCount = (avisosRaw || []).filter(
      (aviso) =>
        aviso.id_membro === currentMember.id &&
        !aviso.lida &&
        (!activeMinisterioId || !aviso.ministerio_id || aviso.ministerio_id === activeMinisterioId)
    ).length;

    const readScaleNotifications = JSON.parse(localStorage.getItem('louvor_read_scale_notifications') || '{}');
    const weeklyScaleCount = buildWeeklyScaleItems({
      userId: currentMember.id,
      escalas: escalasRaw || [],
      cultos: cultosRaw || [],
      nomeCultos: nomeCultosRaw || [],
      funcoes: funcoesRaw || [],
      ministerioId: activeMinisterioId
    }).filter((item) => !readScaleNotifications[`scale:${activeMinisterioId || 'all'}:${item.idCulto}:${item.data}`]).length;

    return unreadStoredCount + weeklyScaleCount;
  }, [activeMinisterioId, avisosRaw, cultosRaw, currentMember?.id, escalasRaw, funcoesRaw, nomeCultosRaw, scaleReadVersion]);

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
