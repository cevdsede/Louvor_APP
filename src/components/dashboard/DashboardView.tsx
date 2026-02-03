import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ChartInstance } from '../../types-supabase';

export const DashboardView: React.FC = () => {
  const escalaChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);
  const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
  const [devocionalInput, setDevocionalInput] = useState('');
  const [currentDevocional, setCurrentDevocional] = useState('Porque, onde estiverem dois ou três reunidos em meu nome, ali estou eu no meio deles. (Mateus 18:20)');

  // States para dados reais
  const [memberStats, setMemberStats] = useState<{
    total: number;
    ativos: number;
    inativos: number;
    porPerfil: Record<string, number>;
  } | null>(null);
  const [totalUserAtivos, setTotalUserAtivos] = useState(0);
  const [totalCultos, setTotalCultos] = useState(0);
  const [proximaEscala, setProximaEscala] = useState('Nenhuma escala');
  const [loading, setLoading] = useState(true);

  // Buscar dados do Supabase
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Buscar estatísticas de membros (calculado a partir das tabelas reais)
        const { data: membersData, error: membersError } = await supabase
          .from('membros')
          .select('id, nome, perfil, ativo, created_at');
          
        if (membersError) throw membersError;
        
        // Calcular estatísticas de membros
        const memberStats = {
          total: membersData?.length || 0,
          ativos: membersData?.filter(m => m.ativo).length || 0,
          inativos: membersData?.filter(m => !m.ativo).length || 0,
          porPerfil: membersData?.reduce((acc, member) => {
            const perfil = member.perfil || 'member';
            acc[perfil] = (acc[perfil] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };
        
        setMemberStats(memberStats);
        
        // Buscar total de cultos programados
        const { count: cultosCount, error: cultosError } = await supabase
          .from('cultos')
          .select('*', { count: 'exact', head: true })
          .gte('data_culto', new Date().toISOString().split('T')[0]);
          
        if (cultosError) throw cultosError;
        setTotalCultos(cultosCount || 0);
        
        // Buscar próxima escala do usuário
        const { data: nextScale, error: scaleError } = await supabase
          .from('escalas')
          .select(`
            id,
            data_ensaio,
            horario_ensaio,
            cultos!inner(
              data_culto,
              horario,
              nome_cultos!inner(
                nome_culto
              )
            ),
            membros!inner(
              nome
            ),
            funcao!inner(
              nome_funcao
            )
          `)
          .eq('id_membros', supabase.auth.getUser().then(({ data }) => data.user?.id))
          .gte('data_ensaio', new Date().toISOString().split('T')[0])
          .order('data_ensaio', { ascending: true })
          .limit(1)
          .single();
          
        if (scaleError && scaleError.code !== 'PGRST116') {
          throw scaleError;
        }
        
        if (nextScale && nextScale.cultos && nextScale.cultos[0]) {
          const culto = nextScale.cultos[0];
          const nomeCulto = culto.nome_cultos && culto.nome_cultos[0] ? culto.nome_cultos[0].nome_culto : 'Culto';
          const data = new Date(culto.data_culto).toLocaleDateString('pt-BR');
          const horario = culto.horario || '';
          setProximaEscala(`${nomeCulto} - ${data} ${horario}`);
        }
        
        // Calcular usuários ativos (membros com escalas futuras)
        const { data: activeUsers, error: activeUsersError } = await supabase
          .from('escalas')
          .select('id_membros')
          .gte('data_ensaio', new Date().toISOString().split('T')[0]);
          
        if (activeUsersError) throw activeUsersError;
        
        const uniqueUsers = new Set(activeUsers?.map(u => u.id_membros));
        setTotalUserAtivos(uniqueUsers.size);
        
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (escalaChartRef.current && memberStats && memberStats.porPerfil) {
      const isDark = document.documentElement.classList.contains('dark');
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#1e3a8a';
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Preparar dados para o gráfico
      const labels = Object.keys(memberStats.porPerfil);
      const data = Object.values(memberStats.porPerfil);
      
      if (labels.length === 0) {
        // Se não houver dados, mostrar mensagem
        return;
      }

      chartInstance.current = new window.Chart(escalaChartRef.current, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Membros por Perfil',
            data: data,
            backgroundColor: primaryColor + 'cc',
            borderColor: primaryColor,
            borderWidth: 2,
            borderRadius: 8,
          }]
        },
        options: {
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.label}: ${context.parsed.y} membros`;
                }
              }
            }
          },
          scales: {
            x: { 
              grid: { display: false }, 
              ticks: { 
                font: { weight: 'bold', size: 11 },
                color: isDark ? '#94a3b8' : '#64748b',
              } 
            },
            y: { 
              grid: { color: isDark ? '#1e293b' : '#f1f5f9', borderDash: [5, 5] }, 
              beginAtZero: true,
              ticks: { stepSize: 1, color: isDark ? '#94a3b8' : '#64748b' }
            }
          }
        }
      });
    }
  }, [memberStats]);

  const handleSaveDevocional = () => {
    if (devocionalInput.trim()) {
      setCurrentDevocional(devocionalInput);
      setIsDevocionalModalOpen(false);
      setDevocionalInput('');
    }
  };

  return (
    <div className="pb-20 fade-in max-w-7xl mx-auto space-y-8">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-12 h-12 border-[6px] border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando dados...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* KPI 1 - Usuários Ativos */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800 flex flex-row md:flex-col items-center md:items-start group hover:shadow-xl transition-all">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 dark:bg-blue-900/20 text-brand rounded-2xl flex items-center justify-center text-xl md:text-2xl mr-4 md:mr-0 md:mb-6">
                <i className="fas fa-users"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{totalUserAtivos}</span>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 md:mt-4">Usuários Ativos</p>
              </div>
            </div>

            {/* KPI 2 - Cultos */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800 flex flex-row md:flex-col items-center md:items-start group hover:shadow-xl transition-all">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-xl md:text-2xl mr-4 md:mr-0 md:mb-6">
                <i className="fas fa-church"></i>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">0{totalCultos}</span>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 md:mt-4">Cultos</p>
              </div>
            </div>

            {/* KPI 3 - Próxima Escala */}
            <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800 flex flex-row md:flex-col items-center md:items-start group hover:shadow-xl transition-all overflow-hidden">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-50 dark:bg-amber-900/20 text-brand-accent rounded-2xl flex items-center justify-center text-xl md:text-2xl mr-4 md:mr-0 md:mb-6">
                <i className="fas fa-star"></i>
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-lg md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none md:mt-2 truncate">{proximaEscala}</span>
                <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 md:mt-4">Minha Próxima Escala</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 min-h-[450px]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-1.5 h-6 bg-brand rounded-full transition-colors"></div>
                <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Frequência por Membro</h3>
              </div>
              <div className="h-[320px] w-full">
                <canvas ref={escalaChartRef}></canvas>
              </div>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-br from-[#1e3a8a] via-[#111827] to-[#020617] rounded-[2.5rem] p-10 text-white flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-2xl border border-brand-accent/20">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <i className="fas fa-scroll text-[12rem]"></i>
              </div>
              
              <div className="relative z-10 w-full">
                <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-accent/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                  <i className="fas fa-pray text-3xl text-brand-accent"></i>
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-accent mb-6">
                  Edificação do Dia
                </h3>
                <div className="relative">
                  <p className="text-xl md:text-2xl text-slate-50 font-bold leading-relaxed px-4 italic font-serif">
                    "{currentDevocional}"
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 mt-10">
                  <div className="h-px w-8 bg-brand-accent/30"></div>
                  <i className="fas fa-cross text-brand-accent/30 text-xs"></i>
                  <div className="h-px w-8 bg-brand-accent/30"></div>
                </div>
              </div>
            </div>
          </div>

          {isDevocionalModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md" onClick={() => setIsDevocionalModalOpen(false)}></div>
              <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800">
                 <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                     <i className="fas fa-feather-alt text-brand-accent text-xl"></i>
                     <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Devocional</h3>
                   </div>
                   <button onClick={() => setIsDevocionalModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-times text-lg"></i></button>
                 </div>
                 <textarea 
                   value={devocionalInput}
                   onChange={(e) => setDevocionalInput(e.target.value)}
                   placeholder="Escreva a palavra de hoje..."
                   className="w-full h-40 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 text-slate-700 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand transition-all resize-none font-bold text-lg mb-8"
                 ></textarea>
                 <div className="flex gap-4">
                    <button onClick={() => setIsDevocionalModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold uppercase tracking-widest text-[9px]">Cancelar</button>
                    <button onClick={handleSaveDevocional} className="flex-1 py-4 bg-brand text-white rounded-2xl font-bold uppercase tracking-widest text-[9px] shadow-lg shadow-brand/20">Publicar</button>
                 </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardView;
