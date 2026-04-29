import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { confirmDelete } from '../../utils/confirmModal';
import { AttendanceEvent, AttendanceStatus, Member } from '../../types';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { ImageCache } from './ImageCache';
import { buildLocalAvatar } from '../../utils/avatar';

const AttendanceView: React.FC = () => {
  const [view, setView] = useState<'list' | 'marking'>('list');
  const [selectedEvent, setSelectedEvent] = useState<AttendanceEvent | null>(null);
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [justifyingMemberId, setJustifyingMemberId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');

  const [events, setEvents] = useState<AttendanceEvent[]>([]);

  const { data: members } = useLocalStorageFirst<Member>({ table: 'membros' });

  const [currentAttendance, setCurrentAttendance] = useState<Record<string, AttendanceStatus>>({});

  const startMarking = (event: AttendanceEvent) => {
    setSelectedEvent(event);
    setView('marking');
    const initial: Record<string, AttendanceStatus> = {};
    members.forEach(m => initial[m.id] = 'present');
    setCurrentAttendance(initial);
  };

  const updateStatus = (memberId: string, status: AttendanceStatus) => {
    if (status === 'justified') {
      setJustifyingMemberId(memberId);
      setIsJustifyModalOpen(true);
      return;
    }
    setCurrentAttendance(prev => ({ ...prev, [memberId]: status }));
  };

  const confirmJustify = () => {
    if (justifyingMemberId) {
      setCurrentAttendance(prev => ({ ...prev, [justifyingMemberId]: 'justified' }));
      setIsJustifyModalOpen(false);
      setJustificationText('');
      setJustifyingMemberId(null);
    }
  };

  const finalizeAttendance = () => {
    showSuccess('Chamada finalizada com sucesso!');
    setView('list');
  };

  const handleDeleteEvent = async (id: string) => {
    const confirmed = await confirmDelete('este evento de chamada');
    if (confirmed) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const counts = {
    present: Object.values(currentAttendance).filter(v => v === 'present').length,
    absent: Object.values(currentAttendance).filter(v => v === 'absent').length,
    justified: Object.values(currentAttendance).filter(v => v === 'justified').length,
  };

  if (view === 'marking' && selectedEvent) {
    return (
      <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <button 
            onClick={() => setView('list')}
            className="absolute top-8 left-8 w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          
          <div className="text-center pt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{selectedEvent.theme}</h3>
            <p className="text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-widest text-[10px]">
              {new Date(selectedEvent.date).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
            <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black text-xs flex items-center gap-2 border border-emerald-100 dark:border-emerald-800">
              <i className="fas fa-check"></i> {counts.present} PRESENTE
            </div>
            <div className="px-6 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl font-black text-xs flex items-center gap-2 border border-red-100 dark:border-red-800">
              <i className="fas fa-times"></i> {counts.absent} FALTA
            </div>
            <div className="px-6 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl font-black text-xs flex items-center gap-2 border border-amber-100 dark:border-amber-800">
              <i className="fas fa-file-alt"></i> {counts.justified} JUSTIFICADA
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {members.map(member => (
            <div key={member.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-900 transition-all">
              <div className="flex items-center gap-4">
                <ImageCache
                  src={member.avatar || buildLocalAvatar(member.name)}
                  fallbackSrc={buildLocalAvatar(member.name)}
                  alt={member.name}
                  className="w-12 h-12 rounded-full border-2 border-slate-50 dark:border-slate-800"
                />
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{member.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{member.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl">
                <button 
                  onClick={() => updateStatus(member.id, 'present')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentAttendance[member.id] === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
                >
                  <i className="fas fa-check"></i>
                </button>
                <button 
                  onClick={() => updateStatus(member.id, 'absent')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentAttendance[member.id] === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
                >
                  <i className="fas fa-times"></i>
                </button>
                <button 
                  onClick={() => updateStatus(member.id, 'justified')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentAttendance[member.id] === 'justified' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
                >
                  <i className="fas fa-file-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={finalizeAttendance}
          className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all"
        >
          <i className="fas fa-cloud-upload-alt mr-2"></i> Finalizar Chamada
        </button>

        {isJustifyModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setIsJustifyModalOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter mb-4 uppercase">Justificativa</h3>
              <textarea 
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                placeholder="Descreva brevemente o motivo..."
                className="w-full h-32 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-6 resize-none"
              ></textarea>
              <div className="flex gap-3">
                <button onClick={() => setIsJustifyModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-widest">Cancelar</button>
                <button onClick={confirmJustify} className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-200">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col group relative">
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand transition-all"><i className="fas fa-edit text-xs"></i></button>
                <button onClick={() => handleDeleteEvent(event.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${event.status === 'open' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                <i className={`fas ${event.status === 'open' ? 'fa-door-open' : 'fa-lock'}`}></i>
              </div>
              <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                {new Date(event.date).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <h4 className="text-lg font-black text-slate-800 dark:text-white tracking-tight leading-tight mb-2 uppercase pr-10">{event.theme}</h4>
            
            <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-50 dark:border-slate-800">
              <span className={`text-[10px] font-black uppercase tracking-widest ${event.status === 'open' ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600'}`}>
                {event.status === 'open' ? 'Aguardando' : 'Finalizada'}
              </span>
              <button 
                onClick={() => startMarking(event)}
                className="w-10 h-10 bg-slate-900 dark:bg-slate-800 text-white rounded-xl flex items-center justify-center hover:bg-brand transition-all shadow-md"
              >
                <i className="fas fa-edit text-xs"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceView;
