import React, { useState } from 'react';
import ChurchAgenda from './ChurchAgenda';
import ChurchDashboard from './ChurchDashboard';

type PublicChurchView = 'dashboard' | 'agenda';

interface PublicChurchShellProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLoginClick: () => void;
}

const menuItems: Array<{ id: PublicChurchView; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Inicio', icon: 'fas fa-house' },
  { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-days' }
];

const PublicChurchShell: React.FC<PublicChurchShellProps> = ({ isDarkMode, onToggleTheme, onLoginClick }) => {
  const [currentView, setCurrentView] = useState<PublicChurchView>('dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white transition-colors duration-300 dark:from-slate-900 dark:to-slate-800">
      <header className="fixed inset-x-0 top-0 z-[90] flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#0f172a]/95 lg:hidden">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.28em] text-brand">Valentes</p>
          <p className="truncate text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Connected</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLoginClick}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20"
          >
            <i className="fas fa-right-to-bracket" />
            Entrar
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Alternar tema"
          >
            <i className={isDarkMode ? 'fas fa-sun text-brand-gold' : 'fas fa-moon text-brand'} />
          </button>
        </div>
      </header>

      <aside className="fixed inset-x-0 bottom-2 z-[100] mx-auto flex min-h-16 w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] rounded-2xl border border-slate-100 bg-white shadow-xl transition-all dark:border-slate-800 dark:bg-[#0f172a] sm:bottom-3 sm:w-[calc(100%-1.5rem)] sm:max-w-[720px] lg:inset-x-auto lg:bottom-0 lg:left-0 lg:mx-0 lg:h-full lg:w-[280px] lg:max-w-none lg:flex-col lg:rounded-none lg:border-r lg:border-b-0 lg:border-l-0 lg:border-t-0 lg:shadow-none">
        <div className="hidden flex-col items-center px-6 py-10 lg:flex">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 shadow-md dark:bg-brand/20">
              <i className="fa-solid fa-shield text-5xl text-transparent [-webkit-text-stroke:2px_var(--brand-primary)]" />
              <i className="fa-solid fa-crown absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] text-base text-brand-gold" />
            </div>
            <h2 className="mt-2 text-center text-xl font-extrabold uppercase leading-none tracking-tighter text-slate-800 dark:text-white">
              Valentes <span className="text-brand">Connected</span>
            </h2>
          </div>
        </div>

        <nav className="flex w-full flex-1 items-center justify-center gap-1 px-1.5 no-scrollbar lg:w-auto lg:flex-col lg:items-stretch lg:justify-start lg:gap-1.5 lg:overflow-y-auto lg:px-4 lg:py-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`flex min-w-0 flex-1 max-w-none flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all lg:flex-none lg:flex-row lg:justify-start lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 ${
                currentView === item.id
                  ? 'bg-brand text-white shadow-xl shadow-brand/20'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hover:bg-slate-50 lg:dark:hover:bg-slate-800/50'
              }`}
            >
              <i className={`${item.icon} w-5 text-center text-base lg:w-6 lg:text-lg`} />
              <span className="w-full max-w-full whitespace-normal break-words text-center text-[8px] font-bold uppercase leading-[1.05] tracking-normal lg:w-auto lg:break-normal lg:text-sm lg:capitalize">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden flex-col gap-3 border-t border-slate-50 px-4 pb-6 pt-4 dark:border-slate-800 lg:flex">
          <button
            type="button"
            onClick={onLoginClick}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
          >
            <i className="fas fa-right-to-bracket" />
            Entrar no sistema
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-brand dark:border-slate-700 dark:bg-slate-800"
          >
            <i className={isDarkMode ? 'fas fa-sun text-brand-gold' : 'fas fa-moon text-brand'} />
            {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50 pb-28 pt-16 dark:bg-slate-800 sm:pb-32 lg:ml-[280px] lg:pb-0 lg:pt-0">
        <div className="container mx-auto px-3 py-5 sm:px-6 lg:px-8">
          {currentView === 'dashboard' && <ChurchDashboard publicMode />}
          {currentView === 'agenda' && <ChurchAgenda publicMode />}
        </div>
      </main>
    </div>
  );
};

export default PublicChurchShell;
