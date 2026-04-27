import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useMinistryContext } from '../contexts/MinistryContext';
import { logger } from '../utils/logger';
import { Member, ViewType, ScheduleEvent } from '../types';
import { ChartInstance } from '../types-supabase';
import LocalStorageFirstService from '../services/LocalStorageFirstService';
import {
  getMemberIdsForMinisterio,
  getMembershipForMemberInMinisterio,
  isMemberActiveInMinisterio
} from '../utils/memberMinistry';
import { getDisplayName } from '../utils/displayName';

interface UseTeamDataProps {
  currentView: ViewType;
}

export const useTeamData = ({ currentView }: UseTeamDataProps) => {
  const { activeMinisterioId, activeModules } = useMinistryContext();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduleEvent | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const genderChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);
  const allEvents: ScheduleEvent[] = [];

  useEffect(() => {
    if (selectedMember || viewingEvent || editingMember) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [selectedMember, viewingEvent, editingMember]);

  const fetchMembers = async () => {
    try {
      setLoading(true);

      const membrosData = LocalStorageFirstService.get<any>('membros') || [];
      const membrosMinisteriosData = LocalStorageFirstService.get<any>('membros_ministerios') || [];
      const membrosFuncoesData = LocalStorageFirstService.get<any>('membros_funcoes') || [];
      const funcoesData = LocalStorageFirstService.get<any>('funcao') || [];
      const escalasData = LocalStorageFirstService.get<any>('escalas') || [];
      const cultosData = LocalStorageFirstService.get<any>('cultos') || [];
      const nomeCultosData = LocalStorageFirstService.get<any>('nome_cultos') || [];
      const historicoData = LocalStorageFirstService.get<any>('historico_musicas') || [];
      const musicasData = LocalStorageFirstService.get<any>('musicas') || [];
      const tonsData = LocalStorageFirstService.get<any>('tons') || [];

      const linkedMemberIdsInMinisterio = getMemberIdsForMinisterio(
        membrosMinisteriosData,
        activeMinisterioId,
        true
      );

      const scopedMembersData = activeMinisterioId
        ? membrosData.filter((member: any) => linkedMemberIdsInMinisterio.has(member.id))
        : membrosData;

      const scopedFuncoesData = activeMinisterioId
        ? funcoesData.filter((funcao: any) => funcao.ministerio_id === activeMinisterioId)
        : funcoesData;

      const scopedFuncaoIds = new Set(scopedFuncoesData.map((funcao: any) => funcao.id));

      const scopedEscalasData = activeMinisterioId
        ? escalasData.filter((escala: any) => escala.ministerio_id === activeMinisterioId)
        : escalasData;

      const { data } = await supabase.auth.getUser();
      const user = data.user;

      const mappedMembers: Member[] = scopedMembersData.map((member: any) => {
        const memberFuncaoIds = membrosFuncoesData
          .filter((membership: any) => membership.id_membro === member.id && scopedFuncaoIds.has(membership.id_funcao))
          .map((membership: any) => membership.id_funcao);

        const memberFuncoes = scopedFuncoesData
          .filter((funcao: any) => memberFuncaoIds.includes(funcao.id))
          .map((funcao: any) => funcao.nome_funcao);

        const today = new Date().toISOString().split('T')[0];
        const memberScales = scopedEscalasData
          .filter((escala: any) => escala.id_membros === member.id)
          .map((escala: any) => {
            const culto = cultosData.find((item: any) => item.id === escala.id_culto);
            if (!culto || culto.data_culto < today) return null;

            const nomeCulto = nomeCultosData.find((item: any) => item.id === culto.id_nome_cultos)?.nome_culto || 'Culto';
            const funcao = scopedFuncoesData.find((item: any) => item.id === escala.id_funcao)?.nome_funcao || 'Sem funcao';

            return {
              id: escala.id_culto,
              date: new Date(`${culto.data_culto}T12:00:00`).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit'
              }),
              event: nomeCulto,
              role: funcao,
              time: culto.horario,
              rawDate: culto.data_culto
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => a.rawDate.localeCompare(b.rawDate))
          .slice(0, 5);

        const groupedScales = memberScales.reduce((acc: any, scale: any) => {
          if (!acc[scale.id]) {
            acc[scale.id] = { ...scale, roles: [scale.role] };
          } else {
            acc[scale.id].roles.push(scale.role);
          }
          return acc;
        }, {});

        const finalScales = Object.values(groupedScales).map((scale: any) => ({
          ...scale,
          role: scale.roles.join(', ')
        }));

        const memberHistory = activeModules.includes('music')
          ? historicoData
              .filter((history: any) => history.id_membros === member.id)
              .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
              .slice(0, 5)
              .map((history: any) => {
                const musica = musicasData.find((song: any) => song.id === history.id_musica);
                const tom = tonsData.find((tone: any) => tone.id === history.id_tons)?.nome_tons || 'N/A';

                return {
                  id: history.id,
                  song: musica ? `${musica.musica} - ${musica.cantor}` : history.musica || 'Sem musica',
                  singer: musica?.cantor || '',
                  key: tom,
                  date: history.created_at ? new Date(history.created_at).toLocaleDateString('pt-BR') : 'Sem data',
                  event: 'Culto'
                };
              })
          : [];

        const displayName =
          user && member.id === user.id
            ? user.user_metadata?.display_name || getDisplayName(member)
            : getDisplayName(member);
        const authDisplayName =
          user && member.id === user.id ? user.user_metadata?.display_name || member.display_name || '' : member.display_name || '';
        const memberMembership = activeMinisterioId
          ? getMembershipForMemberInMinisterio(membrosMinisteriosData, member.id, activeMinisterioId, true)
          : null;
        const isActiveInCurrentMinisterio = activeMinisterioId
          ? isMemberActiveInMinisterio(member, memberMembership)
          : member.ativo !== false;

        return {
          id: member.id,
          name: displayName,
          nome: member.nome,
          display_name: member.display_name,
          displayName: authDisplayName,
          nome_planilha: member.nome_planilha,
          role: memberFuncoes.length > 0 ? memberFuncoes.join(', ') : 'Sem funcao',
          funcaoIds: memberFuncaoIds.map((id: string | number) => String(id)),
          activeMinisterioMembershipId: memberMembership?.id,
          activeMinisterioStatus: memberMembership?.ativo !== false,
          gender: member.genero === 'Homem' ? 'M' : 'F',
          status: isActiveInCurrentMinisterio ? 'confirmed' : 'absent',
          avatar: member.foto || '',
          telefone: member.telefone,
          email: member.email,
          data_nasc: member.data_nasc,
          perfil: member.perfil,
          upcomingScales: finalScales as any[],
          songHistory: memberHistory as any[]
        };
      });

      setMembers(mappedMembers);
      LocalStorageFirstService.forceSync('membros').catch(() => {});
    } catch (error) {
      logger.error('Erro ao buscar membros no cache/local:', error, 'database');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberUpcomingScales = async (memberId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('escalas')
        .select(
          `
          id,
          id_culto,
          id_funcao,
          cultos!inner(
            id,
            data_culto,
            horario,
            nome_cultos(nome_culto)
          ),
          funcao(nome_funcao)
        `
        )
        .eq('id_membros', memberId)
        .gte('cultos.data_culto', today)
        .limit(5);

      if (activeMinisterioId) {
        query = query.eq('ministerio_id', activeMinisterioId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const sortedData =
        data?.sort(
          (a: any, b: any) => new Date(a.cultos?.data_culto).getTime() - new Date(b.cultos?.data_culto).getTime()
        ) || [];

      const mappedData = sortedData.map((scale: any) => ({
        id_culto: scale.id_culto,
        date: new Date(scale.cultos?.data_culto).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        event: scale.cultos?.nome_cultos?.nome_culto || 'Culto',
        role: scale.funcao?.nome_funcao || 'Sem funcao',
        time: scale.cultos?.horario
      }));

      const groupedScales = mappedData.reduce((acc: any, scale: any) => {
        const key = scale.id_culto;
        if (!acc[key]) {
          acc[key] = {
            id: scale.id_culto,
            date: scale.date,
            event: scale.event,
            time: scale.time,
            roles: []
          };
        }

        acc[key].roles.push(scale.role);
        return acc;
      }, {});

      return Object.values(groupedScales).map((scale: any) => ({
        id: scale.id,
        date: scale.date,
        event: scale.event,
        role: scale.roles.join(', '),
        time: scale.time
      }));
    } catch (error) {
      logger.error('Erro ao buscar escalas do membro:', error, 'database');
      return [];
    }
  };

  const fetchMemberSongHistory = async (memberId: string) => {
    try {
      if (!activeModules.includes('music')) {
        return [];
      }

      const { data, error } = await supabase
        .from('historico_musicas')
        .select(
          `
          id,
          id_musica,
          id_tons,
          created_at,
          musicas(musica, cantor),
          tons(nome_tons)
        `
        )
        .eq('id_membros', memberId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map((song: any) => {
        const musica = song.musicas?.musica || 'Sem musica';
        const cantor = song.musicas?.cantor || 'Sem cantor';
        return {
          id: song.id,
          song: cantor !== 'Sem cantor' ? `${musica} - ${cantor}` : musica,
          singer: cantor,
          key: song.tons?.nome_tons || 'N/A',
          date: new Date(song.created_at).toLocaleDateString('pt-BR'),
          event: 'Culto'
        };
      });
    } catch (error) {
      logger.error('Erro ao buscar historico de musicas:', error, 'database');
      return [];
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('team-view-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membros' }, () => fetchMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMinisterioId]);

  useEffect(() => {
    fetchMembers();
  }, [activeMinisterioId, currentView]);

  return {
    selectedMember,
    editingMember,
    viewingEvent,
    activeFilter,
    members,
    loading,
    genderChartRef,
    chartInstance,
    allEvents,
    setSelectedMember,
    setEditingMember,
    setViewingEvent,
    setActiveFilter,
    setMembers,
    fetchMembers,
    fetchMemberUpcomingScales,
    fetchMemberSongHistory
  };
};
