
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ScheduleEvent, Member, RepertoireItem } from '../types';

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

const ListView: React.FC<ListViewProps> = ({ onReportAbsence }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeSubTabs, setActiveSubTabs] = useState<Record<string, SubTab>>({});

  // States for visibility
  const [showAddSong, setShowAddSong] = useState<string | null>(null);
  const [showAddNotice, setShowAddNotice] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState<string | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<{ eventId: string, noticeId: string } | null>(null);
  const [showScaleModal, setShowScaleModal] = useState<{ mode: 'add' | 'edit', eventId?: string } | null>(null);

  // Trava scroll quando o modal de escala está aberto
  useEffect(() => {
    if (showScaleModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [showScaleModal]);

  // Role icons mapping
  const roleIcons = [
    { label: 'Ministro', role: 'Ministro', icon: 'fa-crown' },
    { label: 'Vocal', role: 'Vocal', icon: 'fa-microphone-lines' },
    { label: 'Violão', role: 'Violão', icon: 'fa-guitar' },
    { label: 'Teclado', role: 'Teclado', icon: 'fa-keyboard' },
    { label: 'Guitarra', role: 'Guitarra', icon: 'fa-bolt' },
    { label: 'Baixo', role: 'Baixo', icon: 'fa-music' },
    { label: 'Bateria', role: 'Bateria', icon: 'fa-drum' },
  ];

  // Form states
  const [newSongData, setNewSongData] = useState({ song: '', singer: '', key: '' });
  const [noticeText, setNoticeText] = useState('');
  const [scaleFormData, setScaleFormData] = useState({ title: '', date: '', time: '' });
  const [newMemberFormData, setNewMemberFormData] = useState({ memberId: '', role: '' });

  // User logged state - exige membro válido
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
  const [isMember, setIsMember] = useState(false);

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
            
            console.log('ListView - Usuário:', user.email, 'Perfil:', memberData.perfil, 'É membro:', true);
          } else {
            // Não é membro - limpa estado
            setCurrentUser(null);
            setIsMember(false);
            console.log('ListView - Membro não encontrado pelo email:', user.email);
          }
        } else {
          setCurrentUser(null);
          setIsMember(false);
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
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

  // Data
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});
  const [cultoTypes, setCultoTypes] = useState<NomeCulto[]>([]);
  const [singers, setSingers] = useState<Member[]>([]);

  const availableRoles = ['Ministro', 'Vocal', 'Violão', 'Guitarra', 'Baixo', 'Teclado', 'Bateria', 'Sonoplastia', 'Projeção'];
  const tones = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

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
          role: Array.isArray(m.funcoes) ? m.funcoes.join(', ') : (m.funcoes || ''),
          gender: m.genero === 'Homem' ? 'M' : 'F',
          status: m.ativo ? 'confirmed' : 'absent',
          avatar: m.foto,
          upcomingScales: [],
          songHistory: []
        }));
        setAllRegisteredMembers(mappedMembers);
        setSingers(mappedMembers.filter(m => m.role.toLowerCase().includes('ministro') || m.role.toLowerCase().includes('vocal')));
      }

      // 3. Fetch Events (Cultos) and Notices
      fetchEvents();
      fetchNotices();

    } catch (error) {
      console.error('Error fetching initial data:', error);
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
        console.error('Error fetching notices:', noticesError);
        setEventNotices({});
        return;
      }

      if (noticesData && noticesData.length > 0) {
        const noticesByEvent: Record<string, Notice[]> = {};

        noticesData.forEach((n: any) => {
          if (n.id_cultos && !noticesByEvent[n.id_cultos]) {
            noticesByEvent[n.id_cultos] = [];
          }
          if (n.id_cultos) {
            noticesByEvent[n.id_cultos].push({
              id: n.id_lembrete,
              sender: n.membros?.nome || 'Admin', // Mostra nome do membro ou Admin
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
      console.error('Error fetching notices:', error);
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
                    membros ( id, nome, foto, genero, funcoes ),
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

      const mappedEvents: ScheduleEvent[] = (cultosData || []).map((c: any) => {
        const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
        const dateObj = new Date(c.data_culto + 'T00:00:00');
        const dayOfWeek = weekDays[dateObj.getUTCDay()];
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        return {
          id: c.id,
          title: c.nome_cultos?.nome_culto || 'CULTO',
          date: formattedDate,
          dayOfWeek: dayOfWeek,
          time: c.horario ? c.horario.substring(0, 5) : '19:00',
          members: (c.escalas || []).map((e: any) => ({
            id: e.membros?.id,
            name: e.membros?.nome,
            role: e.funcao?.nome_funcao || 'Membro',
            gender: e.membros?.genero === 'Homem' ? 'M' : 'F',
            avatar: e.membros?.foto || `https://ui-avatars.com/api/?name=${e.membros?.nome}&background=random`,
            status: 'confirmed',
            upcomingScales: [], songHistory: []
          })),
          repertoire: (c.repertorio || []).map((r: any) => ({
            id: r.id,
            song: r.musicas?.musica,
            singer: r.musicas?.cantor,
            key: r.tons?.nome_tons || '',
            minister: r.membros?.nome || ''
          }))
        };
      });
      
      setEvents(mappedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
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
    setShowAddSong(null);
    setShowAddNotice(null);
    setShowAddMember(null);
    setEditingNoticeId(null);
  };

  const handleSaveScale = async () => {
    if (!scaleFormData.title || !scaleFormData.date) return;

    try {
      // Find Nome Culto ID or create? For now assume valid selection or text match existing
      // We'll try to find an existing name
      let nomeCultoId = cultoTypes.find(c => c.nome_culto.toUpperCase() === scaleFormData.title.toUpperCase())?.id;

      if (!nomeCultoId) {
        // Basic fallback: if user typed something new, maybe we need to insert into nome_cultos first
        // For simplicity, let's pick the first one or alert. Or insert.
        // Let's insert new type
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
      console.error('Error saving scale:', err);
      alert('Erro ao salvar escala.');
    }
  };

  const handleSaveSong = async (eventId: string) => {
    if (!newSongData.song || !newSongData.singer || !newSongData.key) return;

    try {
      // Find existing music by name/singer or insert? 
      // For existing music logic
      const { data: musicData } = await supabase.from('musicas').select('id').eq('musica', newSongData.song.split(' - ')[0]).single(); // simplistic match
      let musicId = musicData?.id;

      if (!musicId) {
        // Need to create music? Or alert? Let's alert for now or try to match
        alert('Música não encontrada no banco. Adicione na aba Músicas primeiro.');
        return;
      }

      // Get tone ID
      const { data: toneData } = await supabase.from('tons').select('id').eq('nome_tons', newSongData.key).single();
      if (!toneData) return;

      await supabase.from('repertorio').insert({
        id_culto: eventId,
        id_musicas: musicId,
        id_tons: toneData.id
        // minister?
      });

      setShowAddSong(null);
      setNewSongData({ song: '', singer: '', key: '' });
      fetchEvents();
    } catch (err) {
      console.error('Error adding song to repertoire:', err);
    }
  };

  const handleAddMemberToScale = async (eventId: string) => {
    if (!newMemberFormData.memberId || !newMemberFormData.role) return;

    try {
      // Get Function ID
      const { data: funcData } = await supabase.from('funcao').select('id').eq('nome_funcao', newMemberFormData.role).single();
      if (!funcData) {
        // Try to map or insert? Assuming 'funcao' table is pre-populated
        alert('Função inválida');
        return;
      }

      await supabase.from('escalas').insert({
        id_culto: eventId,
        id_membro: newMemberFormData.memberId,
        id_funcao: funcData.id
      });

      setShowAddMember(null);
      setNewMemberFormData({ memberId: '', role: '' });
      fetchEvents();
    } catch (err) {
      console.error('Error adding member to scale:', err);
    }
  };

  // NOTICES (AVISOS) - Using 'avisos_cultos' if available or local state if not ready
  // Assuming 'avisos_cultos' table exists from Step 151
  const validNotice = async (eventId: string) => {
    // Implementation pending correct schema for notices linked to events
    // For now keeping local state specifically for this demo to avoid breaking if schema differs
    // Or use a simple placeholder if desired.
    // Let's implement local logic masked as persistent for now to ensure stability
    // unless we check 'avisos_cultos' columns.
  };

  // ... (Keep handleSaveNotice primarily local for now but linked to ID)
  // Updating to use state for now as notices schema wasn't fully detailed in plan
  const handleDeleteNotice = async (eventId: string, noticeId: string) => {
    try {
      const { error } = await supabase
        .from('avisos_cultos')
        .delete()
        .eq('id_lembrete', noticeId);

      if (error) throw error;

      // Update local state
      setEventNotices(prev => ({
        ...prev,
        [eventId]: prev[eventId].filter(n => n.id !== noticeId)
      }));
    } catch (error) {
      console.error('Error deleting notice:', error);
      alert('Erro ao deletar aviso.');
    }
  };

  const handleSaveNotice = async (eventId: string) => {
    if (!noticeText.trim()) return;

    // Verifica se é membro válido
    if (!isMember || !currentUser) {
      alert('Apenas membros cadastrados podem criar avisos.');
      return;
    }

    try {
      const noticeData = {
        id_cultos: eventId,
        info: noticeText.trim(),
        id_membros: currentUser.id // Usa ID do membro válido
      };

      if (editingNoticeId) {
        // Update existing notice
        const { error } = await supabase
          .from('avisos_cultos')
          .update({ info: noticeText.trim() })
          .eq('id_lembrete', editingNoticeId.noticeId);

        if (error) throw error;

        // Update local state
        setEventNotices(prev => ({
          ...prev,
          [eventId]: prev[eventId].map(n => n.id === editingNoticeId.noticeId ? { ...n, text: noticeText.trim() } : n)
        }));
      } else {
        // Insert new notice
        const { data, error } = await supabase
          .from('avisos_cultos')
          .insert(noticeData)
          .select();

        if (error) throw error;

        // Refresh notices to get the new data
        await fetchNotices();
      }

      // Reset form
      setNoticeText('');
      setEditingNoticeId(null);
      setShowAddNotice(null);
    } catch (error) {
      console.error('Error saving notice:', error);
      alert('Erro ao salvar aviso.');
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      <div className="flex justify-center mb-10">
        <button
          onClick={() => setShowScaleModal({ mode: 'add' })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-brand hover:border-brand transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
        >
          <i className="fas fa-plus-circle text-xs"></i>
          Nova Escala
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map(event => {
          const currentSubTab = activeSubTabs[event.id] || 'team';
          const isExpanded = expandedId === event.id;
          const notices = eventNotices[event.id] || [];
          const singersInEvent = event.members.filter(m => m.role.includes('Ministro') || m.role.includes('Vocal'));

          const membersNotScaleed = allRegisteredMembers.filter(m =>
            !event.members.some(em => em.id === m.id)
          );

          return (
            <div key={event.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border ${isExpanded ? 'border-brand/40 ring-4 ring-brand/5' : 'border-slate-100 dark:border-slate-800'} overflow-hidden transition-all duration-300 h-fit`}>
              <div
                onClick={() => toggleExpand(event.id)}
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

              {isExpanded && (
                <div className="border-t border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/10 animate-fade-in">
                  <div className="px-6 pt-6 pb-4">
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-2xl flex items-center shadow-sm border border-slate-100 dark:border-slate-700 w-full overflow-hidden">
                      <button onClick={() => setSubTab(event.id, 'team')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentSubTab === 'team' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}>Equipe</button>
                      <button onClick={() => setSubTab(event.id, 'repertoire')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentSubTab === 'repertoire' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}>Músicas</button>
                      <button onClick={() => setSubTab(event.id, 'notices')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentSubTab === 'notices' ? 'bg-brand text-white shadow-md' : 'text-slate-400 hover:text-brand'}`}>Avisos</button>
                    </div>
                  </div>

                  <div className="px-8 pb-10 fade-in min-h-[150px]">
                    {currentSubTab === 'team' && (
                      <div className="space-y-3 pt-4">
                        {!showAddMember && (
                          <div className="flex justify-end mb-4">
                            <button
                              onClick={() => setShowAddMember(event.id)}
                              className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all"
                            >
                              <i className="fas fa-plus-circle text-[8px]"></i> Escalar Membro
                            </button>
                          </div>
                        )}

                        {showAddMember === event.id && (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-brand/20 shadow-xl mb-4 animate-fade-in space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Membro</label>
                                <select
                                  value={newMemberFormData.memberId}
                                  onChange={(e) => setNewMemberFormData({ ...newMemberFormData, memberId: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand appearance-none"
                                >
                                  <option value="">Selecionar da Base...</option>
                                  {membersNotScaleed.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Função</label>
                                <select
                                  value={newMemberFormData.role}
                                  onChange={(e) => setNewMemberFormData({ ...newMemberFormData, role: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand appearance-none"
                                >
                                  <option value="">Selecionar Função...</option>
                                  {availableRoles.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setShowAddMember(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
                              <button onClick={() => handleAddMemberToScale(event.id)} className="flex-1 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Adicionar</button>
                            </div>
                          </div>
                        )}

                        {event.members.map((member, index) => (
                          <div key={`${event.id}-mem-${index}`} className="bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group/member hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img 
                                  src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=random`} 
                                  alt={member.name} 
                                  className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-sm group-hover/member:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand rounded-full border border-white dark:border-slate-700 flex items-center justify-center">
                                  <i className={`fas ${roleIcons.find(r => member.role.includes(r.label))?.icon || 'fa-user'} text-[6px] text-white`}></i>
                                </div>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-slate-800 dark:text-white leading-none truncate">{member.name}</span>
                                <span className="text-[8px] font-bold text-brand uppercase tracking-widest mt-0.5 truncate">{member.role}</span>
                              </div>
                            </div>
                            <button className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 opacity-0 group-hover/member:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/40">
                              <i className="fas fa-trash-alt text-[8px]"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentSubTab === 'repertoire' && (
                      <div className="space-y-3 pt-4">
                        {!showAddSong && (
                          <div className="flex justify-end mb-4">
                            <button
                              onClick={() => setShowAddSong(event.id)}
                              className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all"
                            >
                              <i className="fas fa-plus text-[8px]"></i> Nova Música
                            </button>
                          </div>
                        )}

                        {showAddSong === event.id && (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-brand/20 shadow-xl mb-4 animate-fade-in space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <input
                                type="text"
                                value={newSongData.song}
                                onChange={(e) => setNewSongData({ ...newSongData, song: e.target.value })}
                                placeholder="Música - Cantor"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none"
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <select
                                  value={newSongData.singer}
                                  onChange={(e) => setNewSongData({ ...newSongData, singer: e.target.options[e.target.selectedIndex].text })}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none appearance-none"
                                >
                                  <option value="">Ministro...</option>
                                  {singersInEvent.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                                </select>
                                <select
                                  value={newSongData.key}
                                  onChange={(e) => setNewSongData({ ...newSongData, key: e.target.value })}
                                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-brand outline-none appearance-none"
                                >
                                  <option value="">Tom...</option>
                                  {tones.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setShowAddSong(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
                              <button onClick={() => handleSaveSong(event.id)} className="flex-1 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Salvar</button>
                            </div>
                          </div>
                        )}

                        {event.repertoire.map((item, index) => (
                          <div key={`${event.id}-rep-${index}`} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                                {item.key || 'Ñ'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{item.song} - {item.singer}</h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                  MINISTRO: <span className="text-brand">{item.minister || 'Sem ministro'}</span>
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-red-600 hover:bg-red-600 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Youtube"><i className="fab fa-youtube text-[10px]"></i></a>
                              <a href={`https://open.spotify.com/search/${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-emerald-500 hover:bg-emerald-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Spotify"><i className="fab fa-spotify text-[10px]"></i></a>
                              <a href={`https://www.letras.mus.br/?q=${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-blue-500 hover:bg-blue-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Letra"><i className="fas fa-align-left text-[9px]"></i></a>
                              <a href={`https://www.cifraclub.com.br/?q=${encodeURIComponent(`${item.song} ${item.singer}`)}`} target="_blank" className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-amber-500 hover:bg-amber-500 hover:text-white border border-slate-100 dark:border-slate-700 transition-all duration-300 transform hover:scale-110 hover:shadow-lg" title="Cifra"><i className="fas fa-guitar text-[10px]"></i></a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {currentSubTab === 'notices' && (
                      <div className="pt-4 space-y-3">
                        {!showAddNotice && isMember && (
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={() => { setShowAddNotice(event.id); setEditingNoticeId(null); setNoticeText(''); }}
                              className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all"
                            >
                              <i className="fas fa-plus text-[8px]"></i> Novo Aviso
                            </button>
                          </div>
                        )}

                        {!isMember && (
                          <div className="flex justify-center mb-4">
                            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                              <i className="fas fa-lock text-amber-500 text-sm mb-2"></i>
                              <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                                Apenas membros cadastrados podem criar avisos
                              </p>
                            </div>
                          </div>
                        )}

                        {showAddNotice === event.id && (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-brand/20 shadow-xl mb-4 animate-fade-in">
                            <textarea
                              value={noticeText}
                              onChange={(e) => setNoticeText(e.target.value)}
                              placeholder={editingNoticeId ? "Edite o aviso..." : "Digite o aviso..."}
                              className="w-full h-20 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-brand transition-all resize-none mb-4"
                            ></textarea>
                            <div className="flex gap-2">
                              <button onClick={() => { setShowAddNotice(null); setEditingNoticeId(null); setNoticeText(''); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelar</button>
                              <button onClick={() => handleSaveNotice(event.id)} className="flex-1 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">
                                {editingNoticeId ? 'Atualizar' : 'Postar'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          {notices.map((notice, index) => (
                            <div key={`${event.id}-not-${index}`} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 relative animate-fade-in group">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[8px] font-black text-brand uppercase tracking-widest">{notice.sender}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[7px] font-bold text-slate-400 uppercase">{notice.time}</span>
                                  <button 
                                    onClick={() => {
                                      setEditingNoticeId({ eventId: event.id, noticeId: notice.id });
                                      setNoticeText(notice.text);
                                      setShowAddNotice(event.id);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                    title="Editar aviso"
                                  >
                                    <i className="fas fa-edit text-[8px]"></i>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteNotice(event.id, notice.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                                    title="Deletar aviso"
                                  >
                                    <i className="fas fa-trash-alt text-[8px]"></i>
                                  </button>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{notice.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
              <button onClick={() => setShowScaleModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px]">Cancelar</button>
              <button onClick={handleSaveScale} className="flex-1 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand/20">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListView;
