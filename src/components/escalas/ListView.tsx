import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ScheduleEvent, Member, RepertoireItem } from '../../types';
import { Song, SupabaseCulto, SupabaseEscala, SupabaseRepertorio, SupabaseAviso, CultoComRelacionamentos } from '../../types-supabase';
import { showSuccess, showError, showWarning } from '../../utils/toast';
import { logger } from '../../utils/logger';

// Import new components
import EventCard from './EventCard';
import RepertoireManager from './RepertoireManager';
import NoticeManager from './NoticeManager';
import TeamManager from './TeamManager';

interface ListViewProps {
  onReportAbsence: (id: string) => void;
}

type SubTab = 'team' | 'repertoire' | 'notices';

interface Notice {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface NomeCulto {
  id: string;
  nome_culto: string;
}

export const ListView: React.FC<ListViewProps> = ({ onReportAbsence }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, SubTab>>({});
  const [showScaleModal, setShowScaleModal] = useState<{ mode: 'add' | 'edit', eventId?: string } | null>(null);

  // User logged state - exige membro válido
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
  const [isMember, setIsMember] = useState(false);

  // Data states
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});
  const [cultoTypes, setCultoTypes] = useState<NomeCulto[]>([]);
  const [singers, setSingers] = useState<Member[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [scaleFormData, setScaleFormData] = useState({ title: '', date: '', time: '' });

  // Trava scroll quando o modal de escala está aberto
  useEffect(() => {
    if (showScaleModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showScaleModal]);

  // Buscar usuário logado do Supabase Auth e verificar se é membro
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          // Verificar se é membro válido usando email (case-insensitive)
          const { data: memberData, error: memberError } = await supabase
            .from('membros')
            .select('id, nome, perfil')
            .ilike('email', user.email)
            .limit(1)
            .single();
          
          if (memberData && !memberError) {
            setCurrentUser({ id: memberData.id, name: memberData.nome });
            
            // Verificar se é admin ou líder baseado no perfil
            const isAdmin = memberData.perfil && (
              memberData.perfil.toLowerCase().includes('admin') || 
              memberData.perfil.toLowerCase().includes('líder') ||
              memberData.perfil.toLowerCase().includes('lider')
            );
            
            setIsMember(true);
            
            logger.auth('ListView - Usuário autenticado:', { email: user.email, perfil: memberData.perfil, isMember: true });
          } else {
            // Não é membro - limpa estado
            setCurrentUser(null);
            setIsMember(false);
            logger.auth('ListView - Membro não encontrado pelo email:', { email: user.email });
          }
        } else {
          setCurrentUser(null);
          setIsMember(false);
        }
      } catch (error) {
        logger.error('Erro ao buscar usuário:', error, 'auth');
        setCurrentUser(null);
        setIsMember(false);
      }
    };

    getCurrentUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getCurrentUser();
      } else {
        setCurrentUser(null);
        setIsMember(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Culto Types (Names)
      const { data: cultoTypesData } = await supabase.from('nome_cultos').select('*');
      if (cultoTypesData) setCultoTypes(cultoTypesData);

      // 2. Fetch Members
      const { data: membersData } = await supabase.from('membros').select('*').order('nome');
      if (membersData) {
        const mappedMembers: Member[] = membersData.map(m => ({
          id: m.id,
          name: m.nome,
          role: 'Membro', // Será atualizado posteriormente se necessário
          gender: m.genero === 'Homem' ? 'M' : 'F',
          status: m.ativo ? 'confirmed' : 'absent',
          avatar: m.foto,
          upcomingScales: [],
          songHistory: []
        }));
        setAllRegisteredMembers(mappedMembers);
        setSingers([]); // Será preenchido dinamicamente baseado nas escalas de cada evento
      }

      // 3. Fetch Events (Cultos) and Notices
      fetchEvents();
      fetchNotices();
      
      // 4. Fetch all songs for repertoire selection
      const { data: songsData } = await supabase.from('musicas').select('*').order('musica');
      if (songsData) setAllSongs(songsData);
      
      // 5. Fetch all tones for selection
      const { data: tonesData } = await supabase.from('tons').select('*').order('nome_tons');
      if (tonesData) {
        setTones(tonesData.map(t => t.nome_tons).filter(Boolean));
      }

    } catch (error) {
      logger.error('Error fetching initial data:', error, 'database');
    }
  };

  const fetchNotices = async () => {
    try {
      // Agora com a estrutura correta: id_lembrete, id_cultos, info, id_membros
      const { data: noticesData, error: noticesError } = await supabase
        .from('avisos_cultos')
        .select(`
          id_lembrete,
          id_cultos,
          id_membros,
          info,
          created_at,
          membros ( nome )
        `)
        .order('created_at', { ascending: false });

      if (noticesError) {
        logger.error('Error fetching notices:', noticesError, 'database');
        setEventNotices({});
        return;
      }

      if (noticesData && noticesData.length > 0) {
        const noticesByEvent: Record<string, Notice[]> = {};

        noticesData.forEach((n: SupabaseAviso) => {
          if (n.id_cultos && !noticesByEvent[n.id_cultos]) {
            noticesByEvent[n.id_cultos] = [];
          }
          if (n.id_cultos) {
            noticesByEvent[n.id_cultos].push({
              id: n.id_lembrete,
              sender: n.membros?.[0]?.nome || 'Admin', // Acessa o primeiro item do array
              text: n.info || 'Sem texto',
              time: n.created_at ? new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
          }
        });

        setEventNotices(noticesByEvent);
      } else {
        setEventNotices({});
      }
    } catch (error) {
      logger.error('Error fetching notices:', error, 'database');
      setEventNotices({});
    }
  };

  // Realtime Subscription
  useEffect(() => {
    const channels = supabase.channel('list-view-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escalas' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avisos_cultos' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repertorio' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: cultosData, error } = await supabase
        .from('cultos')
        .select(`
                id,
                data_culto,
                horario,
                nome_cultos ( id, nome_culto ),
                escalas (
                    id,
                    membros ( id, nome, foto, genero ),
                    funcao ( nome_funcao )
                ),
                repertorio (
                    id,
                    musicas ( musica, cantor ),
                    tons ( nome_tons ),
                    membros ( nome )
                )
            `)
        .order('data_culto', { ascending: true });

      if (error) throw error;

      const mappedEvents: ScheduleEvent[] = (cultosData || []).map((c: CultoComRelacionamentos) => {
        const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dateObj = new Date(c.data_culto + 'T00:00:00');
        const dayOfWeek = weekDays[dateObj.getUTCDay()];
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        return {
          id: c.id,
          title: c.nome_cultos?.[0]?.nome_culto || 'CULTO',
          date: formattedDate,
          dayOfWeek: dayOfWeek,
          time: c.horario ? c.horario.substring(0, 5) : '19:00',
          members: (c.escalas || []).map((e) => ({
            id: e.membros?.[0]?.id || '',
            name: e.membros?.[0]?.nome || 'Sem nome',
            role: e.funcao?.[0]?.nome_funcao || 'Membro',
            gender: e.membros?.[0]?.genero === 'Homem' ? 'M' : 'F',
            avatar: e.membros?.[0]?.foto || `https://ui-avatars.com/api/?name=${e.membros?.[0]?.nome || 'Sem nome'}&background=random`,
            status: 'confirmed',
            upcomingScales: [], songHistory: []
          })),
          repertoire: (c.repertorio || []).map((r) => ({
            id: r.id,
            song: r.musicas?.[0]?.musica,
            singer: r.musicas?.[0]?.cantor,
            key: r.tons?.[0]?.nome_tons || '',
            minister: r.membros?.[0]?.nome || ''
          }))
        };
      });
      
      setEvents(mappedEvents);
    } catch (err) {
      logger.error('Error fetching events:', err, 'database');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    if (!activeSubTabs[id]) {
      setActiveSubTabs(prev => ({ ...prev, [id]: 'team' }));
    }
  };

  const setSubTab = (eventId: string, tab: SubTab) => {
    setActiveSubTabs(prev => ({ ...prev, [eventId]: tab }));
  };

  const handleSaveScale = async () => {
    if (!scaleFormData.title || !scaleFormData.date) return;

    try {
      // Find Nome Culto ID or create? For now assume valid selection or text match existing
      // We'll try to find an existing name
      let nomeCultoId = cultoTypes.find(c => c.nome_culto.toUpperCase() === scaleFormData.title.toUpperCase())?.id;

      if (!nomeCultoId) {
        // Basic fallback: if user typed something new, maybe we need to insert into nome_cultos first
        // For simplicity, let's insert new type
        const { data: newType } = await supabase.from('nome_cultos').insert({ nome_culto: scaleFormData.title.toUpperCase() }).select().single();
        if (newType) nomeCultoId = newType.id;
      }

      if (showScaleModal?.mode === 'add') {
        await supabase.from('cultos').insert({
          data_culto: scaleFormData.date,
          horario: scaleFormData.time || '19:00:00',
          id_nome_cultos: nomeCultoId
        });
      } else if (showScaleModal?.mode === 'edit' && showScaleModal.eventId) {
        await supabase.from('cultos').update({
          data_culto: scaleFormData.date,
          horario: scaleFormData.time,
          id_nome_cultos: nomeCultoId
        }).eq('id', showScaleModal.eventId);
      }

      setShowScaleModal(null);
      setScaleFormData({ title: '', date: '', time: '' });
      fetchEvents();
    } catch (err) {
      logger.error('Error saving scale:', err, 'database');
      showError('Erro ao salvar escala.');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      <div className="flex justify-center mb-10">
        <button
          onClick={() => setShowScaleModal({ mode: 'add' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand hover:border-brand transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
        >
          <i className="fas fa-plus text-[8px]"></i>
          Nova Escala
        </button>
      </div>

      <div className="space-y-6">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isExpanded={expandedId === event.id}
            onToggle={() => toggleExpand(event.id)}
            activeSubTab={activeSubTabs[event.id] || 'team'}
            onSubTabChange={(tab) => setSubTab(event.id, tab)}
          >
            {activeSubTabs[event.id] === 'team' && (
              <TeamManager
                eventId={event.id}
                members={event.members}
                allRegisteredMembers={allRegisteredMembers}
                isMember={isMember}
                onTeamUpdated={fetchEvents}
              />
            )}
            
            {activeSubTabs[event.id] === 'repertoire' && (
              <RepertoireManager
                eventId={event.id}
                repertoire={event.repertoire}
                allSongs={allSongs}
                tones={tones}
                singersInEvent={event.members.filter(m => 
                  m.role.toLowerCase().includes('ministro') || 
                  m.role.toLowerCase().includes('vocal') ||
                  m.role.toLowerCase().includes('cantor')
                )}
                isMember={isMember}
                onSongAdded={fetchEvents}
              />
            )}
            
            {activeSubTabs[event.id] === 'notices' && (
              <NoticeManager
                eventId={event.id}
                notices={eventNotices[event.id] || []}
                currentUser={currentUser}
                isMember={isMember}
                onNoticesUpdated={fetchNotices}
              />
            )}
          </EventCard>
        ))}
      </div>

      {/* Modal de Escala */}
      {showScaleModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setShowScaleModal(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Escala</h3>
              <button onClick={() => setShowScaleModal(null)} className="text-slate-400 hover:text-red-500"><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Culto</label>
                <input value={scaleFormData.title} onChange={(e) => setScaleFormData({ ...scaleFormData, title: e.target.value })} type="text" placeholder="Ex: SANTA CEIA" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" list="culto-options" />
                <datalist id="culto-options">
                  {cultoTypes.map(c => <option key={c.id} value={c.nome_culto} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Data</label>
                  <input value={scaleFormData.date} onChange={(e) => setScaleFormData({ ...scaleFormData, date: e.target.value })} type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Hora</label>
                  <input value={scaleFormData.time} onChange={(e) => setScaleFormData({ ...scaleFormData, time: e.target.value })} type="time" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowScaleModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
              <button onClick={handleSaveScale} className="flex-1 py-3 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-brand/90 transition-colors">
                {showScaleModal.mode === 'add' ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
