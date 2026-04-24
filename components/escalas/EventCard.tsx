import React from 'react';
import { ScheduleEvent } from '../../types';

interface EventCardProps {
  event: ScheduleEvent;
  isExpanded: boolean;
  onToggle: () => void;
  activeSubTab: 'team' | 'repertoire' | 'notices';
  onSubTabChange: (tab: 'team' | 'repertoire' | 'notices') => void;
  onDelete?: (eventId: string, eventTitle: string) => void;
  canDeleteEvent?: boolean;
  showRepertoire?: boolean;
  children: React.ReactNode;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  isExpanded,
  onToggle,
  activeSubTab,
  onSubTabChange,
  onDelete,
  canDeleteEvent = false,
  showRepertoire = true,
  children
}) => {
  return (
    <div
      className={`mb-6 h-fit overflow-hidden rounded-[2.5rem] border bg-white shadow-sm transition-all duration-150 dark:bg-slate-900 ${
        isExpanded ? 'border-brand/40 ring-4 ring-brand/5' : 'border-slate-100 dark:border-slate-800'
      }`}
    >
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between px-8 py-6 hover:bg-slate-50 dark:hover:bg-slate-800/20"
      >
        <div className="flex items-center gap-5">
          <div
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-2xl transition-all ${
              isExpanded ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400 dark:bg-slate-800'
            }`}
          >
            <span className="text-[9px] font-black uppercase leading-none">{event.dayOfWeek}</span>
            <span className="mt-1 text-lg font-black leading-none">{event.date.split('/')[0]}</span>
          </div>

          <div>
            <h3
              className={`text-lg font-black uppercase leading-none tracking-tight ${
                isExpanded ? 'text-brand' : 'text-slate-800 dark:text-white'
              }`}
            >
              {event.title}
            </h3>
            <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <span>
                <i className="far fa-clock mr-1 text-brand opacity-70" /> {event.time}
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              <span>{event.members.length} membros</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canDeleteEvent && onDelete && (
            <button
              onClick={(eventClick) => {
                eventClick.stopPropagation();
                onDelete(event.id, event.title);
              }}
              className="group flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/20"
              title="Excluir escala"
            >
              <i className="fas fa-trash text-[10px]" />
            </button>
          )}

          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all dark:bg-slate-800 ${
              isExpanded ? 'rotate-180 bg-brand/10 text-brand' : 'group-hover:text-brand'
            }`}
          >
            <i className="fas fa-chevron-down text-[10px]" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-50 bg-slate-50/20 dark:border-slate-800 dark:bg-slate-800/10">
          <div className="px-6 pb-4 pt-6">
            <div className="flex w-full items-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                  onSubTabChange('team');
                }}
                className={`flex-1 rounded-xl py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === 'team' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'
                }`}
              >
                Equipe
              </button>

              {showRepertoire && (
                <button
                  onClick={(eventClick) => {
                    eventClick.stopPropagation();
                    onSubTabChange('repertoire');
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeSubTab === 'repertoire' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'
                  }`}
                >
                  Musicas
                </button>
              )}

              <button
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                  onSubTabChange('notices');
                }}
                className={`flex-1 rounded-xl py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === 'notices' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'
                }`}
              >
                Avisos
              </button>
            </div>
          </div>

          <div className="min-h-[150px] px-8 pb-10">{children}</div>
        </div>
      )}
    </div>
  );
};

export default EventCard;
