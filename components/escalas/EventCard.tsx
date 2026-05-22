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
      className={`bg-app-surface border-app shadow-app mb-6 h-fit overflow-hidden rounded-[2.5rem] border transition-all duration-150 ${
        isExpanded ? 'border-brand/40 ring-4 ring-brand/5' : ''
      }`}
    >
      <div
        onClick={onToggle}
        className="group flex cursor-pointer items-center justify-between px-8 py-6 hover:bg-app-surface-strong"
      >
        <div className="flex items-center gap-5">
          <div
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-2xl transition-all ${
              isExpanded ? 'bg-brand text-white' : 'bg-app-surface-strong text-app-muted'
            }`}
          >
            <span className="text-[9px] font-black uppercase leading-none">{event.dayOfWeek}</span>
            <span className="mt-1 text-lg font-black leading-none">{event.date.split('/')[0]}</span>
          </div>

          <div>
            <h3
              className={`text-lg font-black uppercase leading-none tracking-tight ${
                isExpanded ? 'text-brand' : 'text-app'
              }`}
            >
              {event.title}
            </h3>
            <div className="text-app-muted mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
              <span>
                <i className="far fa-clock mr-1 text-brand opacity-70" /> {event.time}
              </span>
              <span className="border-app h-1 w-1 rounded-full border" />
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
              className="bg-app-surface-strong text-app-muted group flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              title="Excluir escala"
            >
              <i className="fas fa-trash text-[10px]" />
            </button>
          )}

          <div
            className={`bg-app-surface-strong text-app-muted flex h-8 w-8 items-center justify-center rounded-full transition-all ${
              isExpanded ? 'rotate-180 bg-brand/10 text-brand' : 'group-hover:text-brand'
            }`}
          >
            <i className="fas fa-chevron-down text-[10px]" />
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="bg-app-surface-muted border-app border-t">
          <div className="px-6 pb-4 pt-6">
            <div className="bg-app-surface border-app shadow-sm flex w-full items-center overflow-hidden rounded-2xl border p-1">
              <button
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                  onSubTabChange('team');
                }}
                className={`flex-1 rounded-xl py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeSubTab === 'team' ? 'bg-brand text-white shadow-md' : 'text-app-muted hover:text-brand'
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
                    activeSubTab === 'repertoire' ? 'bg-brand text-white shadow-md' : 'text-app-muted hover:text-brand'
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
                  activeSubTab === 'notices' ? 'bg-brand text-white shadow-md' : 'text-app-muted hover:text-brand'
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
