
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Member, ViewType, ScheduleEvent, SongHistoryItem } from '../types';
import AttendanceView from './AttendanceView';

interface TeamViewProps {
  currentView: ViewType;
}

const TeamView: React.FC<TeamViewProps> = ({ currentView }) => {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const genderChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  // Mock de eventos para navegação
  const allEvents: ScheduleEvent[] = [];

  // Monitora modais para travar scroll
  useEffect(() => {
    if (selectedMember || viewingEvent) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [selectedMember, viewingEvent]);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membros')
        .select('*')
        .order('nome');

      if (error) throw error;

      if (data) {
        const mappedMembers: Member[] = data.map(m => ({
          id: m.id,
          name: m.nome,
          role: Array.isArray(m.funcoes) ? m.funcoes.join(', ') : (m.funcoes || ''),
          gender: m.genero === 'Homem' ? 'M' : 'F',
          status: m.ativo ? 'confirmed' : 'absent',
          avatar: m.foto || (m.genero === 'Homem'
            ? 'https://img.freepik.com/fotos-gratis/homem-bonito-sorrindo-no-fundo-branco_23-2148213426.jpg' // Default Man
            : 'https://img.freepik.com/fotos-gratis/jovem-mulher-bonita-com-exibicao-natural-de-maquiagem_23-2148810238.jpg'), // Default Woman
          upcomingScales: [], // To be implemented later or in another query
          songHistory: []
        }));
        setMembers(mappedMembers);
      }
    } catch (error) {
      console.error('Erro ao buscar membros:', error);
    } finally {
      setLoading(false);
    }
  };

  // Realtime Subscription
  useEffect(() => {
    const channels = supabase.channel('team-view-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membros' },
        () => fetchMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  const kpis = [
    { label: 'Ministro', role: 'Ministro', icon: 'fa-crown' },
    { label: 'Vocal', role: 'Vocal', icon: 'fa-microphone-lines' },
    { label: 'Violão', role: 'Violão', icon: 'fa-guitar' },
    { label: 'Teclado', role: 'Teclado', icon: 'fa-keyboard' },
    { label: 'Guitarra', role: 'Guitarra', icon: 'fa-bolt' },
    { label: 'Baixo', role: 'Baixo', icon: 'fa-music' },
    { label: 'Bateria', role: 'Bateria', icon: 'fa-drum' },
  ];

  const maleCount = members.filter(m => m.gender === 'M').length;
  const femaleCount = members.filter(m => m.gender === 'F').length;

  useEffect(() => {
    if (currentView === 'team' && genderChartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      chartInstance.current = new (window as any).Chart(genderChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['M', 'F'],
          datasets: [{
            data: [maleCount, femaleCount],
            backgroundColor: [getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#1e3a8a', '#f472b6'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          cutout: '75%',
          maintainAspectRatio: false
        }
      });
    }
  }, [currentView, maleCount, femaleCount, members]);

  const handleFilter = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const filteredMembers = members.filter(m => {
    if (!activeFilter) return true;
    if (activeFilter.startsWith('gender-')) return m.gender === activeFilter.split('-')[1];
    return m.role.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const openScaleDetail = (eventId: string) => {
    const event = allEvents.find(e => e.id === eventId);
    if (event) setViewingEvent(event);
  };

  return (
    <div className="animate-fade-in">
      {currentView === 'team' ? (
        <div className="space-y-6 pb-20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando Equipe...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div onClick={() => setActiveFilter(null)} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative group cursor-pointer">
                  <h3 className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2 absolute top-4">Gênero</h3>
                  <div className="h-24 w-full relative">
                    <canvas ref={genderChartRef}></canvas>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{members.length}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {kpis.map(kpi => (
                    <button key={kpi.role} onClick={() => handleFilter(kpi.role)} className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${activeFilter === kpi.role ? 'bg-brand text-white border-brand shadow-lg scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-brand/40'}`}>
                      <div className={`w-7 h-7 ${activeFilter === kpi.role ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'} rounded-lg flex items-center justify-center mb-1.5`}>
                        <i className={`fas ${kpi.icon} text-[10px] ${activeFilter === kpi.role ? 'text-white' : 'text-brand'}`}></i>
                      </div>
                      <span className="text-sm font-black tracking-tighter leading-none">{members.filter(m => m.role.includes(kpi.role)).length}</span>
                      <span className="text-[6px] font-black uppercase tracking-widest mt-1 opacity-60">{kpi.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredMembers.map(member => (
                  <div key={member.id} onClick={() => setSelectedMember(member)} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group cursor-pointer hover:shadow-xl hover:border-brand/30 transition-all relative">
                    <div className="relative mb-3">
                      <img src={member.avatar} alt={member.name} className="w-14 h-14 rounded-full border-2 border-slate-50 dark:border-slate-800 shadow-lg group-hover:scale-110 transition-transform" />
                      <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${member.gender === 'M' ? 'bg-brand' : 'bg-pink-500'} flex items-center justify-center text-[6px] text-white`}><i className={`fas ${member.gender === 'M' ? 'fa-mars' : 'fa-venus'}`}></i></div>
                    </div>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight leading-tight truncate w-full">{member.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <i className={`fas ${kpis.find(k => member.role.includes(k.label))?.icon || 'fa-user'} text-[8px] text-slate-300`}></i>
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">{member.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <AttendanceView />
      )}

      {/* Modal de Membro - AJUSTADO PARA MOBILE (py-20 e max-h) */}
      {selectedMember && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-10 py-20 lg:py-10 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/70 dark:bg-slate-950/90 backdrop-blur-md" onClick={() => setSelectedMember(null)}></div>

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-100 dark:border-slate-800 max-h-[75vh] lg:max-h-[85vh] flex flex-col my-auto">
            <div className="p-6 pb-2 flex justify-between items-center bg-white dark:bg-slate-900 z-10 shrink-0">
              <span className="text-[8px] font-black text-brand uppercase tracking-widest bg-brand/5 px-3 py-1 rounded-full">Perfil do Membro</span>
              <button onClick={() => setSelectedMember(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
            </div>

            <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar flex-grow space-y-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img src={selectedMember.avatar} className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-2xl" />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${selectedMember.gender === 'M' ? 'bg-brand' : 'bg-pink-500'} flex items-center justify-center text-[10px] text-white`}>
                    <i className={`fas ${selectedMember.gender === 'M' ? 'fa-mars' : 'fa-venus'}`}></i>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">{selectedMember.name}</h3>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {selectedMember.role.split(',').map(r => (
                    <span key={r} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-full">{r.trim()}</span>
                  ))}
                </div>
              </div>

              {/* Próximas Escalas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-brand rounded-full"></div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Próximas Escalas</h4>
                </div>
                <div className="space-y-2.5">
                  {selectedMember.upcomingScales && selectedMember.upcomingScales.length > 0 ? (
                    selectedMember.upcomingScales.map((s, idx) => (
                      <button key={idx} onClick={() => openScaleDetail(s.id)} className="w-full bg-slate-50 dark:bg-slate-800/50 px-5 py-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center group transition-all hover:border-brand/40 active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-600 shadow-sm">
                            <span className="text-[7px] font-black text-slate-400 leading-none">{s.date.split('/')[1]}</span>
                            <span className="text-sm font-black text-brand leading-none mt-0.5">{s.date.split('/')[0]}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase block">{s.event}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{s.role}</span>
                          </div>
                        </div>
                        <i className="fas fa-arrow-right text-[10px] text-slate-200 group-hover:text-brand transition-colors"></i>
                      </button>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold uppercase py-4 text-center">Nenhuma escala programada</p>
                  )}
                </div>
              </div>

              {/* Repertório Recente */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-3.5 bg-brand-gold rounded-full"></div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Repertório Recente</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {selectedMember.songHistory && selectedMember.songHistory.length > 0 ? (
                    selectedMember.songHistory.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-50 dark:border-slate-800">
                        <div className="w-8 h-8 bg-slate-50 dark:bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center text-[8px]"><i className="fas fa-music"></i></div>
                        <div className="flex-1 min-w-0 text-left">
                          <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 truncate block">{h.song}</span>
                        </div>
                        <div className="w-8 h-8 bg-brand/5 border border-brand/10 text-brand rounded-lg flex items-center justify-center font-black text-[9px] shrink-0">{h.key}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 font-bold uppercase py-4 text-center">Nenhum registro de música</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"><i className="fab fa-whatsapp"></i> WhatsApp</button>
              <button className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px]">Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Detalhes do Evento (z-[800] para ficar sobre o outro) */}
      {viewingEvent && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 lg:p-6 py-20 lg:py-10 overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setViewingEvent(null)}></div>
          <div className="relative w-full max-w-2xl bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[75vh] lg:max-h-[85vh] border border-slate-100 dark:border-slate-800 my-auto">

            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand text-white flex flex-col items-center justify-center font-black">
                  <span className="text-[9px] uppercase leading-none mb-1">{viewingEvent.dayOfWeek}</span>
                  <span className="text-lg leading-none">{viewingEvent.date.split('/')[0]}</span>
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase leading-none tracking-tighter">{viewingEvent.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{viewingEvent.time} • Detalhes do Culto</span>
                </div>
              </div>
              <button onClick={() => setViewingEvent(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-slate-800 shadow-sm"><i className="fas fa-times"></i></button>
            </div>

            <div className="p-8 pt-4 overflow-y-auto no-scrollbar flex-grow space-y-8">
              {/* Seção Equipe */}
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Equipe Escalada</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewingEvent.members.map(m => (
                    <div key={m.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                      <img src={m.avatar} className="w-8 h-8 rounded-full" />
                      <div className="min-w-0 text-left">
                        <p className="text-[10px] font-black text-slate-800 dark:text-white truncate leading-none mb-1">{m.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção Músicas */}
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Repertório</h4>
                <div className="space-y-3">
                  {viewingEvent.repertoire.map(song => (
                    <div key={song.id} className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-brand/5 text-brand rounded-lg flex items-center justify-center"><i className="fas fa-play text-[8px]"></i></div>
                        <div className="min-w-0 text-left">
                          <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase leading-none mb-1.5">{song.song}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{song.singer}</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-brand text-white rounded-lg font-black text-[10px]">{song.key}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
              <button onClick={() => setViewingEvent(null)} className="flex-1 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand/20">Ok, entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
