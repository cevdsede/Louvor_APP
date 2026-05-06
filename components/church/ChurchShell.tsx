import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useMinistryContext } from '../../contexts/MinistryContext';
import ChurchAgenda from './ChurchAgenda';
import ChurchDashboard from './ChurchDashboard';
import ChurchMembers from './ChurchMembers';

type ChurchView = 'dashboard' | 'agenda' | 'members';

const menuItems: Array<{ id: ChurchView; label: string; icon: string }> = [
  { id: 'dashboard', label: 'Início', icon: 'fas fa-house' },
  { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-days' },
  { id: 'members', label: 'Membros', icon: 'fas fa-users' }
];

const ChurchShell: React.FC<{ onOpenMinistry: () => void }> = ({ onOpenMinistry }) => {
  const [currentView, setCurrentView] = useState<ChurchView>('dashboard');
  const { currentMember, userMinisterios, isGlobalAdmin } = useMinistryContext();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-x-0 bottom-2 z-[100] mx-auto flex min-h-16 w-[calc(100%-1rem)] max-w-[720px] rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 lg:inset-x-auto lg:bottom-0 lg:left-0 lg:h-full lg:w-[280px] lg:max-w-none lg:flex-col lg:rounded-none lg:border-r lg:border-b-0 lg:shadow-none">
        <div className="hidden px-6 py-8 lg:block">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Valentes</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Connected</h2>
          <p className="mt-2 text-xs font-bold text-slate-400">{currentMember?.nome || 'Membro'}</p>
        </div>

        <nav className="flex flex-1 items-center justify-center gap-1 px-2 lg:flex-col lg:items-stretch lg:justify-start lg:px-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-left ${
                currentView === item.id
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              <i className={`${item.icon} text-base`} />
              <span className="text-[9px] font-black uppercase tracking-tight lg:text-xs lg:tracking-widest">{item.label}</span>
            </button>
          ))}

          {(userMinisterios.length > 0 || isGlobalAdmin) && (
            <button
              type="button"
              onClick={onOpenMinistry}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:py-3 lg:text-left"
            >
              <i className="fas fa-layer-group text-base" />
              <span className="text-[9px] font-black uppercase tracking-tight lg:text-xs lg:tracking-widest">Ministérios</span>
            </button>
          )}
        </nav>

        <div className="hidden border-t border-slate-100 p-4 dark:border-slate-800 lg:block">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-500 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300"
          >
            <i className="fas fa-sign-out-alt" />
            Sair
          </button>
        </div>
      </aside>

      <main className="min-h-screen pb-24 lg:ml-[280px] lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {currentView === 'dashboard' && <ChurchDashboard />}
          {currentView === 'agenda' && <ChurchAgenda />}
          {currentView === 'members' && <ChurchMembers />}
        </div>
      </main>
    </div>
  );
};

export default ChurchShell;
