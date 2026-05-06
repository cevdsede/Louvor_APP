import React, { useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useMinistryContext } from '../../contexts/MinistryContext';
import ChurchAgenda from './ChurchAgenda';
import ChurchDashboard from './ChurchDashboard';
import ChurchMembers from './ChurchMembers';

type ChurchView = 'dashboard' | 'agenda' | 'members' | 'admin';

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const ChurchShell: React.FC<{ onOpenMinistry: () => void }> = ({ onOpenMinistry }) => {
  const [currentView, setCurrentView] = useState<ChurchView>('dashboard');
  const { currentMember, userMinisterios, isGlobalAdmin } = useMinistryContext();

  const canOpenAdmin = useMemo(() => {
    const profile = normalize(currentMember?.perfil);
    return isGlobalAdmin || profile.includes('pastor') || profile.includes('admin');
  }, [currentMember?.perfil, isGlobalAdmin]);

  const menuItems: Array<{ id: ChurchView; label: string; icon: string; visible: boolean }> = [
    { id: 'dashboard', label: 'Inicio', icon: 'fas fa-house', visible: true },
    { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-days', visible: true },
    { id: 'members', label: 'Membros', icon: 'fas fa-users', visible: true },
    { id: 'admin', label: 'Admin', icon: 'fas fa-sliders', visible: canOpenAdmin }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white transition-colors duration-300 dark:from-slate-900 dark:to-slate-800">
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

        <nav className="flex w-full flex-1 items-center justify-center gap-1 px-1.5 lg:w-auto lg:flex-col lg:items-stretch lg:justify-start lg:gap-1.5 lg:overflow-y-auto lg:px-4 lg:py-2">
          {menuItems
            .filter((item) => item.visible)
            .map((item) => (
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

          {(userMinisterios.length > 0 || isGlobalAdmin) && (
            <button
              type="button"
              onClick={onOpenMinistry}
              className="flex min-w-0 flex-1 max-w-none flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-400 transition-all hover:text-slate-600 dark:hover:text-slate-200 lg:flex-none lg:flex-row lg:justify-start lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 lg:hover:bg-slate-50 lg:dark:hover:bg-slate-800/50"
            >
              <i className="fas fa-layer-group w-5 text-center text-base lg:w-6 lg:text-lg" />
              <span className="w-full max-w-full whitespace-normal break-words text-center text-[8px] font-bold uppercase leading-[1.05] tracking-normal lg:w-auto lg:break-normal lg:text-sm lg:capitalize">
                Ministerios
              </span>
            </button>
          )}
        </nav>

        <div className="mt-auto hidden flex-col gap-3 border-t border-slate-50 px-4 pb-6 pt-4 dark:border-slate-800 lg:flex">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
              {(currentMember?.nome || 'US').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-black text-slate-800 dark:text-white">
                {currentMember?.nome || 'Membro'}
              </p>
              <p className="text-[7px] font-bold uppercase tracking-widest text-brand">{currentMember?.perfil || 'user'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 text-[9px] font-black uppercase tracking-widest text-red-500 transition-all hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <i className="fas fa-sign-out-alt" />
            Sair
          </button>
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50 pb-28 dark:bg-slate-800 sm:pb-32 lg:ml-[280px] lg:pb-0">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {currentView === 'dashboard' && <ChurchDashboard />}
          {currentView === 'agenda' && <ChurchAgenda />}
          {currentView === 'members' && <ChurchMembers />}
          {currentView === 'admin' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Administracao de agenda e cards sera carregada nesta area.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChurchShell;
