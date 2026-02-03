import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../utils/logger';
import { ScheduleEvent, Member, RepertoireItem, Notice } from '../types';

interface ScaleData {
  events: ScheduleEvent[];
  allRegisteredMembers: Member[];
  eventNotices: Record<string, Notice[]>;
  cultoTypes: Array<{ id: string; nome_culto: string }>;
  singers: Member[];
  allSongs: Array<{ id: string; musica: string; cantor: string }>;
  tones: string[];
  loading: boolean;
  error: string | null;
  currentUser: { id: string; name: string } | null;
  isMember: boolean;
  refetch: () => void;
}

export const useScaleData = (): ScaleData => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [allRegisteredMembers, setAllRegisteredMembers] = useState<Member[]>([]);
  const [eventNotices, setEventNotices] = useState<Record<string, Notice[]>>({});
  const [cultoTypes, setCultoTypes] = useState<Array<{ id: string; nome_culto: string }>>([]);
  const [singers, setSingers] = useState<Member[]>([]);
  const [allSongs, setAllSongs] = useState<Array<{ id: string; musica: string; cantor: string }>>([]);
  const [tones, setTones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string, name: string } | null>(null);
  const [isMember, setIsMember] = useState(false);

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
          
          logger.auth('ScaleData - Usuário autenticado:', { email: user.email, perfil: memberData.perfil, isMember: true });
        } else {
          // Não é membro - limpa estado
          setCurrentUser(null);
          setIsMember(false);
          logger.auth('ScaleData - Membro não encontrado pelo email:', { email: user.email });
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

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

      // 3. Fetch Events and Notices
      await fetchEvents();
      await fetchNotices();
      
      // 4. Fetch all songs for repertoire selection
      const { data: songsData } = await supabase.from('musicas').select('*').order('musica');
      if (songsData) setAllSongs(songsData);
      
      // 5. Fetch all tones for selection
      const { data: tonesData } = await supabase.from('tons').select('*').order('nome_tons');
      if (tonesData) {
        setTones(tonesData.map(t => t.nome_tons).filter(Boolean));
      }

    } catch (error) {
      logger.error('Error fetching scale data:', error, 'database');
      setError('Falha ao carregar dados das escalas');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotices = async () => {
    try {
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

        noticesData.forEach((n: any) => {
          if (n.id_cultos && !noticesByEvent[n.id_cultos]) {
            noticesByEvent[n.id_cultos] = [];
          }
          if (n.id_cultos) {
            noticesByEvent[n.id_cultos].push({
              id: n.id_lembrete,
              sender: n.membros?.[0]?.nome || 'Admin',
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

      const mappedEvents: ScheduleEvent[] = (cultosData || []).map((c: any) => {
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
          members: (c.escalas || []).map((e: any) => ({
            id: e.membros?.[0]?.id || '',
            name: e.membros?.[0]?.nome || 'Sem nome',
            role: e.funcao?.[0]?.nome_funcao || 'Membro',
            gender: e.membros?.[0]?.genero === 'Homem' ? 'M' : 'F',
            avatar: e.membros?.[0]?.foto || `https://ui-avatars.com/api/?name=${e.membros?.[0]?.nome || 'Sem nome'}&background=random`,
            status: 'confirmed',
            upcomingScales: [], 
            songHistory: []
          })),
          repertoire: (c.repertorio || []).map((r: any) => ({
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
      throw err;
    }
  };

  useEffect(() => {
    getCurrentUser();
    fetchData();

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

  // Realtime Subscription
  useEffect(() => {
    const channels = supabase.channel('scale-data-channel')
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

  return {
    events,
    allRegisteredMembers,
    eventNotices,
    cultoTypes,
    singers,
    allSongs,
    tones,
    loading,
    error,
    currentUser,
    isMember,
    refetch: fetchData
  };
};
