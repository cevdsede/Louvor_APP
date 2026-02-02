import React from 'react';
import { ScheduleEvent } from '../../types';

interface EventCardProps {
  event: ScheduleEvent;
  isExpanded: boolean;
  onToggle: () => void;
  activeSubTab: 'team' | 'repertoire' | 'notices';
  onSubTabChange: (tab: 'team' | 'repertoire' | 'notices') => void;
  children: React.ReactNode;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  isExpanded,
  onToggle,
  activeSubTab,
  onSubTabChange,
  children
}) => {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border ${isExpanded ? 'border-brand/40 ring-4 ring-brand/5' : 'border-slate-100 dark:border-slate-800'} overflow-hidden transition-all duration-300 h-fit mb-6`}>
      {/* Header */}
      <div
        onClick={onToggle}
        className="px-8 py-6 cursor-pointer flex justify-between items-center group hover:bg-slate-50 dark:hover:bg-slate-800/20"
      >
        <div className="flex items-center gap-5">
          <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${isExpanded ? 'bg-brand text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
            <span className="text-[9px] font-black uppercase leading-none">{event.dayOfWeek}</span>
            <span className="text-lg font-black leading-none mt-1">{event.date.split('/')[0]}</span>
          </div>
          <div>
            <h3 className={`text-lg font-black tracking-tight uppercase leading-none ${isExpanded ? 'text-brand' : 'text-slate-800 dark:text-white'}`}>{event.title}</h3>
            <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 font-bold text-[10px] mt-2 uppercase tracking-widest">
              <span><i className="far fa-clock text-brand mr-1 opacity-70"></i> {event.time}</span>
              <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
              <span>{event.members.length} MEMBROS</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 transition-all ${isExpanded ? 'rotate-180 bg-brand/10 text-brand' : 'group-hover:text-brand'}`}>
            <i className="fas fa-chevron-down text-[10px]"></i>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10 animate-fade-in">
          <div className="px-6 pt-6 pb-4">
            <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 w-full overflow-hidden">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSubTabChange('team');
                }} 
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'team' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}
              >
                Equipe
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSubTabChange('repertoire');
                }} 
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'repertoire' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}
              >
                Músicas
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSubTabChange('notices');
                }} 
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'notices' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}
              >
                Avisos
              </button>
            </div>
          </div>

          <div className="px-8 pb-10 fade-in min-h-[150px]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventCard;
