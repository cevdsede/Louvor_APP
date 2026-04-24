import React from 'react';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { ViewType } from '../../types';
import { getModuleForView } from '../../utils/ministry';

interface ToolbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface ToolbarTab {
  view: ViewType;
  label: string;
  icon?: string;
}

const SCALE_TABS: ToolbarTab[] = [
  { view: 'list', label: 'Lista' },
  { view: 'calendar', label: 'Calendario' },
  { view: 'cleaning', label: 'Limpeza' }
];

const MUSIC_TABS: ToolbarTab[] = [
  { view: 'music-list', label: 'Lista' },
  { view: 'music-repertoire', label: 'Repertorios' },
  { view: 'music-history', label: 'Historico' }
];

const TEAM_TABS: ToolbarTab[] = [
  { view: 'team', label: 'Equipe', icon: 'fas fa-users' },
  { view: 'attendance', label: 'Chamada', icon: 'fas fa-clipboard-check' }
];

const TOOLS_TABS: ToolbarTab[] = [
  { view: 'tools-admin', label: 'Admin', icon: 'fas fa-cog' },
  { view: 'tools-users', label: 'Usuarios', icon: 'fas fa-user-cog' },
  { view: 'tools-approvals', label: 'Aprovacoes', icon: 'fas fa-shield-alt' },
  { view: 'tools-performance', label: 'Desempenho', icon: 'fas fa-chart-line' }
];

const isScaleMode = (view: ViewType) => ['list', 'calendar', 'cleaning'].includes(view);
const isMusicMode = (view: ViewType) =>
  ['music-stats', 'music-list', 'music-repertoire', 'music-create', 'music-history', 'music-escalas'].includes(view);
const isTeamMode = (view: ViewType) => ['team', 'attendance'].includes(view);
const isToolsMode = (view: ViewType) =>
  ['tools-admin', 'tools-users', 'tools-approvals', 'tools-performance'].includes(view);

const Toolbar: React.FC<ToolbarProps> = ({ currentView, onViewChange }) => {
  const {
    activeMinisterio,
    canAccessModule,
    isGlobalAdmin,
    loading
  } = useMinistryContext();

  if (loading || currentView === 'dashboard') {
    return null;
  }

  const targetModule = getModuleForView(currentView);

  if (targetModule === 'tools' && !isGlobalAdmin) {
    return null;
  }

  if (targetModule !== 'tools' && !canAccessModule(targetModule)) {
    return null;
  }

  const getTitle = () => {
    if (isTeamMode(currentView)) return 'Equipe';
    if (isMusicMode(currentView)) return 'Musicas';
    if (isToolsMode(currentView)) return 'Ferramentas';
    return 'Escalas';
  };

  const tabs = isScaleMode(currentView)
    ? SCALE_TABS
    : isMusicMode(currentView)
      ? MUSIC_TABS
      : isTeamMode(currentView)
        ? TEAM_TABS
        : TOOLS_TABS;
  const isToolsToolbar = isToolsMode(currentView);

  return (
    <div className="mb-6 animate-fade-in pt-4 sm:mb-8">
      <div className="flex flex-col items-center gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:gap-6 sm:pb-6">
        <div className="w-full text-center">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-brand">
            {activeMinisterio?.nome || 'Ministerio'}
          </p>
          <h2 className="text-3xl font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white sm:text-4xl">
            {getTitle()}
          </h2>
        </div>

        <div className="flex w-full items-center justify-center">
          <div className={`w-full pb-1 sm:w-auto sm:pb-0 ${isToolsToolbar ? '' : 'flex justify-center'} ${isToolsToolbar ? '' : 'sm:no-scrollbar'}`}>
            <div
              className={`rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
                isToolsToolbar
                  ? 'grid w-full grid-cols-4 gap-1.5'
                  : 'mx-auto inline-flex min-w-max items-center justify-center gap-1.5'
              }`}
            >
            {tabs.map((tab) => (
              <button
                key={tab.view}
                onClick={() => onViewChange(tab.view)}
                className={`flex items-center justify-center rounded-xl font-black uppercase transition-all ${
                  isToolsToolbar
                    ? 'min-w-0 flex-col gap-1 px-2 py-3 text-[9px] tracking-[0.12em]'
                    : 'shrink-0 gap-2 px-4 py-3 text-[10px] tracking-[0.18em]'
                } sm:whitespace-nowrap sm:px-6 sm:py-2.5 sm:text-[10px] sm:tracking-widest ${
                  currentView === tab.view
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon && <i className={`${tab.icon} shrink-0 text-[11px] sm:text-sm`} />}
                <span className={isToolsToolbar ? 'w-full text-center leading-tight break-words' : 'truncate'}>
                  {tab.label}
                </span>
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
