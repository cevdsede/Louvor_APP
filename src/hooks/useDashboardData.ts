import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MemberStat } from '../types-supabase';

interface DashboardData {
  memberStats: MemberStat[];
  totalUserAtivos: number;
  totalCultos: number;
  proximaEscala: string;
  loading: boolean;
  error: string | null;
}

export const useDashboardData = (): DashboardData => {
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [totalUserAtivos, setTotalUserAtivos] = useState(0);
  const [totalCultos, setTotalCultos] = useState(0);
  const [proximaEscala, setProximaEscala] = useState('Nenhuma escala');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Buscar estatísticas de membros
        const { data: memberData, error: memberError } = await supabase
          .from('member_stats')
          .select('*');
          
        if (memberError) throw memberError;
        setMemberStats(memberData || []);
        
        // Buscar total de cultos programados
        const { count: cultosCount, error: cultosError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .gte('date', new Date().toISOString());
          
        if (cultosError) throw cultosError;
        setTotalCultos(cultosCount || 0);
        
        // Buscar próxima escala do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: nextScale, error: scaleError } = await supabase
            .from('event_assignments')
            .select(`
              events!inner(
                date,
                title
              )
            `)
            .eq('user_id', user.id)
            .gte('events.date', new Date().toISOString())
            .order('events.date', { ascending: true })
            .limit(1)
            .single();
            
          if (scaleError && scaleError.code !== 'PGRST116') {
            throw scaleError;
          }
          
          if (nextScale && nextScale.events && nextScale.events[0]) {
            setProximaEscala(nextScale.events[0].title);
          }
        }
        
        // Calcular usuários ativos
        const { data: activeUsers, error: activeUsersError } = await supabase
          .from('event_assignments')
          .select('user_id')
          .gte('events.date', new Date().toISOString());
          
        if (activeUsersError) throw activeUsersError;
        
        const uniqueUsers = new Set(activeUsers?.map(u => u.user_id));
        setTotalUserAtivos(uniqueUsers.size);
        
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setError('Falha ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return {
    memberStats,
    totalUserAtivos,
    totalCultos,
    proximaEscala,
    loading,
    error
  };
};
