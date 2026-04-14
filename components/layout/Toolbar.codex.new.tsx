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
  const { activeMinisterio, canAccessModule, isGlobalAdminOrLeader, loading } = useMinistryContext();

  if (loading || currentView === 'dashboard') {
    return null;
  }

  const targetModule = getModuleForView(currentView);

  if (targetModule === 'tools' && !isGlobalAdminOrLeader) {
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

  return (
    <div className="mb-8 animate-fade-in pt-4">
      <div className="flex flex-col items-center gap-6 border-b border-slate-100 pb-6 dark:border-slate-800">
        <div className="w-full text-center">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-brand">
            {activeMinisterio?.nome || 'Ministerio'}
          </p>
          <h2 className="text-4xl font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
            {getTitle()}
          </h2>
        </div>

        <div className="flex w-full items-center justify-center">
          <div className="mx-auto flex items-center justify-center overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm no-scrollbar dark:border-slate-700 dark:bg-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.view}
                onClick={() => onViewChange(tab.view)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                  currentView === tab.view
                    ? 'bg-brand text-white shadow-lg shadow-brand/20'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon && <i className={tab.icon} />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
