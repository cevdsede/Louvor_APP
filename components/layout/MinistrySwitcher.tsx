import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMinistryContext } from '../../contexts/MinistryContext';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { buildWeeklyScaleItems, getWeeklyScaleCountsByMinisterio } from '../../utils/weeklyScale';

interface MinistrySwitcherProps {
  variant?: 'mobile' | 'desktop';
}

const MinistrySwitcher: React.FC<MinistrySwitcherProps> = ({ variant = 'desktop' }) => {
  const {
    activeMinisterio,
    activeMinisterioId,
    currentMember,
    setActiveMinisterioId,
    userMinisterios
  } = useMinistryContext();
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const weeklyCountsByMinisterio = useMemo(() => {
    if (!currentMember?.id) {
      return {};
    }

    const weeklyItems = buildWeeklyScaleItems({
      userId: currentMember.id,
      escalas: escalasRaw || [],
      cultos: cultosRaw || [],
      nomeCultos: nomeCultosRaw || [],
      funcoes: funcoesRaw || []
    });

    return getWeeklyScaleCountsByMinisterio(weeklyItems);
  }, [cultosRaw, currentMember?.id, escalasRaw, funcoesRaw, nomeCultosRaw]);

  const activeWeeklyCount = activeMinisterioId ? weeklyCountsByMinisterio[activeMinisterioId] || 0 : 0;
  const hasWeeklyAlert = Object.values(weeklyCountsByMinisterio).some((count) => count > 0);
  const isMobile = variant === 'mobile';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (userMinisterios.length <= 1) {
    return null;
  }

  return (
    <div ref={containerRef} className={`relative ${isMobile ? 'max-w-[148px]' : 'w-full'}`}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className={`relative flex items-center justify-between gap-2 rounded-xl text-left font-black uppercase shadow-sm transition-all ${
          isMobile
            ? 'h-10 w-full bg-slate-50 px-3 text-[9px] tracking-tight text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            : 'w-full border border-slate-100 bg-white px-4 py-3 text-[10px] tracking-widest text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
        }`}
        title={hasWeeklyAlert ? 'Existe escala nesta semana em um dos seus ministerios.' : 'Trocar ministerio'}
      >
        <span className="truncate">{activeMinisterio?.nome || 'Ministerio'}</span>
        <div className="flex items-center gap-2">
          {activeWeeklyCount > 0 && (
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-white">
              {activeWeeklyCount}
            </span>
          )}
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[10px] text-slate-400`} />
        </div>

        {hasWeeklyAlert && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border border-white bg-amber-500" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute z-[130] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
            isMobile ? 'right-0 w-[220px]' : 'left-0 w-full'
          }`}
        >
          <div className="border-b border-slate-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:border-slate-800">
            Ministerios
          </div>

          <div className="max-h-72 overflow-y-auto py-2">
            {userMinisterios.map((ministerio) => {
              const weeklyCount = weeklyCountsByMinisterio[ministerio.id] || 0;
              const isActive = activeMinisterioId === ministerio.id;

              return (
                <button
                  key={ministerio.id}
                  type="button"
                  onClick={() => {
                    setActiveMinisterioId(ministerio.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{ministerio.nome}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                      {weeklyCount > 0 ? `${weeklyCount} escala${weeklyCount === 1 ? '' : 's'} na semana` : 'Sem escala na semana'}
                    </p>
                  </div>

                  {weeklyCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">
                      <i className="fas fa-bell text-[9px]" />
                      Alerta
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistrySwitcher;
