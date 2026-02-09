
import React from 'react';
import { ViewType } from '../../types';

interface ToolbarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ currentView, onViewChange }) => {
  const isScaleMode = ['list', 'calendar', 'cleaning'].includes(currentView);
  const isMusicMode = ['music-stats', 'music-list', 'music-repertoire', 'music-create', 'music-history'].includes(currentView);
  const isTeamMode = ['team', 'attendance', 'approvals'].includes(currentView);
  const isToolsMode = ['tools-admin', 'tools-users', 'tools-approvals', 'tools-performance'].includes(currentView);

  if (currentView === 'dashboard') return null;

  const getTitle = () => {
    if (isTeamMode) return 'Equipe';
    if (isMusicMode) return 'Músicas';
    if (isToolsMode) return 'Ferramentas';
    return 'Escalas';
  };

  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
            {getTitle()}
          </h2>
        </div>

        <div className="flex items-center">
          {/* Scale Selectors */}
          {isScaleMode && (
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => onViewChange('list')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentView === 'list' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Lista
              </button>
              <button 
                onClick={() => onViewChange('calendar')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentView === 'calendar' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Calendário
              </button>
              <button 
                onClick={() => onViewChange('cleaning')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${currentView === 'cleaning' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Limpeza
              </button>
            </div>
          )}

          {/* Music Selectors */}
          {isMusicMode && (
            <div className="bg-white dark:bg-slate-800 p-1 lg:p-1.5 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar w-full max-w-full">
              <button 
                onClick={() => onViewChange('music-list')}
                className={`px-2 lg:px-6 py-1.5 lg:py-2.5 rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 text-center ${currentView === 'music-list' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Lista
              </button>
              <button 
                onClick={() => onViewChange('music-repertoire')}
                className={`px-2 lg:px-6 py-1.5 lg:py-2.5 rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 text-center ${currentView === 'music-repertoire' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Repertórios
              </button>
              <button 
                onClick={() => onViewChange('music-history')}
                className={`px-2 lg:px-6 py-1.5 lg:py-2.5 rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 text-center ${currentView === 'music-history' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Histórico
              </button>
            </div>
          )}

          {/* Team Selectors */}
          {isTeamMode && (
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => onViewChange('team')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'team' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-users"></i> Equipe
              </button>
              <button 
                onClick={() => onViewChange('attendance')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'attendance' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-clipboard-check"></i> Chamada
              </button>
              <button 
                onClick={() => onViewChange('approvals')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'approvals' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-user-check"></i> Aprovações
              </button>
            </div>
          )}

          {/* Tools Selectors */}
          {isToolsMode && (
            <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => onViewChange('tools-admin')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'tools-admin' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-cog"></i> Admin
              </button>
              <button 
                onClick={() => onViewChange('tools-users')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'tools-users' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-user-cog"></i> Usuários
              </button>
              <button 
                onClick={() => onViewChange('tools-approvals')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'tools-approvals' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-shield-alt"></i> Aprovações
              </button>
              <button 
                onClick={() => onViewChange('tools-performance')}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${currentView === 'tools-performance' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-chart-line"></i> Desempenho
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
