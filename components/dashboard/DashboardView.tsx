import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ChartInstance, MemberStat } from '../../types-supabase';
import DashboardService, { ProximaEscala, FrequenciaMembro } from '../../services/DashboardService';

const DashboardView: React.FC = () => {
  const escalaChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);
  const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
  const [devocionalInput, setDevocionalInput] = useState('');
  const [currentDevocional, setCurrentDevocional] = useState('Porque, onde estiverem dois ou três reunidos em meu nome, ali estou eu no meio deles. (Mateus 18:20)');

  // Estados para os KPIs
  const [totalCultos, setTotalCultos] = useState<number>(0);
  const [totalMusicas, setTotalMusicas] = useState<number>(0);
  const [proximaEscalaData, setProximaEscalaData] = useState<ProximaEscala | null>(null);
  const [frequenciaMembros, setFrequenciaMembros] = useState<FrequenciaMembro[]>([]);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Carregar dados do dashboard apenas uma vez ao montar
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Buscar usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }

      // Carregar dados em paralelo
      const [totalCultosData, totalMusicasData, proximaEscalaData, frequenciaData, niverData] = await Promise.all([
        DashboardService.getTotalCultos(),
        DashboardService.getTotalMusicas(),
        user ? DashboardService.getProximaEscala(user.id) : Promise.resolve(null),
        DashboardService.getFrequenciaPorMembro(),
        DashboardService.getAniversariantesDoMes()
      ]);

      setTotalCultos(totalCultosData);
      setAniversariantes(niverData);

      if (proximaEscalaData) {
        setProximaEscalaData(proximaEscalaData);
      } else {
        setProximaEscalaData(null);
      }

      // Ordenar frequencia por quantidade
      const sortedFrequencia = [...frequenciaData].sort((a, b) => b.quantidade - a.quantidade);
      setFrequenciaMembros(sortedFrequencia);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      setLoading(false);
    }
  };

  // Helper para renderizar os nomes dos aniversariantes
  const renderBirthdayNames = () => {
    if (aniversariantes.length === 0) return 'Nenhum este mês';

    const names = aniversariantes.map(n => n.nome.split(' ')[0]); // Apenas primeiro nome
    if (names.length <= 3) {
      return names.join(', ');
    }
    return `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}`;
  };

  // Função isolada para atualizar o gráfico
  const updateChart = () => {
    if (!escalaChartRef.current || frequenciaMembros.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#1e3a8a';

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Função helper para converter hexa em rgba
    const hexToRgba = (hex: string, alpha: number) => {
      let r = 0, g = 0, b = 0;
      if (hex.startsWith('#')) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
      } else {
        return `rgba(30, 58, 138, ${alpha})`;
      }
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const backgroundColors = frequenciaMembros.map((_, index) => {
      const opacity = Math.max(0.2, 1 - (index * 0.15));
      return hexToRgba(primaryColor, opacity);
    });

    chartInstance.current = new window.Chart(escalaChartRef.current, {
      type: 'bar',
      data: {
        labels: frequenciaMembros.map(m => m.nome),
        datasets: [{
          label: 'Cultos Participados',
          data: frequenciaMembros.map(m => m.quantidade),
          backgroundColor: backgroundColors,
          borderColor: hexToRgba(primaryColor, 1),
          borderWidth: 1,
          borderRadius: 12,
          maxBarThickness: 40,
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
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
  };

  // Hook separado para observar mudanças no tema (sem refresh e sem afetar dados)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Pequeno debounce para evitar disparos excessivos do Chart.js
      updateChart();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => observer.disconnect();
  }, [frequenciaMembros]); // Atualiza quando os dados estiverem prontos ou o tema mudar

  useEffect(() => {
    updateChart();
  }, [frequenciaMembros]);

  const handleSaveDevocional = () => {
    if (devocionalInput.trim()) {
      setCurrentDevocional(devocionalInput);
      setIsDevocionalModalOpen(false);
      setDevocionalInput('');
    }
  };

  return (
    <div className="pb-20 fade-in max-w-7xl mx-auto space-y-8">
      {/* Grid de KPIs - 3 Colunas com Destaque Central */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* KPI 1 - Total de Cultos (Normal) */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all duration-300">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-church"></i>
          </div>
          <span className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-3">{loading ? '...' : totalCultos}</span>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cultos Realizados</p>
        </div>

        {/* KPI 2 - Próxima Escala (ESTILO MANTIDO, INFO REORGANIZADA) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-brand via-brand/90 to-brand-dark p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-brand/30 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all duration-500 border border-white/10 ring-4 ring-brand/5 dark:ring-white/5">
          {/* Efeitos de Fundo */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>

          <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-md text-white rounded-[1.5rem] flex items-center justify-center text-2xl md:text-3xl mb-6 border border-white/30 shadow-inner group-hover:rotate-6 transition-transform">
            <i className="fas fa-calendar-check"></i>
          </div>

          <div className="relative z-10 w-full px-2">
            <h3 className="text-[10px] md:text-[11px] font-black text-white/70 uppercase tracking-[0.3em] mb-4">Sua Próxima Escala</h3>

            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                {loading ? '...' : (proximaEscalaData?.culto || 'Livre')}
              </span>
              <span className="text-xl md:text-2xl font-bold text-white/90 tracking-tight drop-shadow-sm mb-4">
                ({loading ? '...' : (proximaEscalaData ? new Date(proximaEscalaData.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--')})
              </span>
            </div>

            <div className="mt-2 text-[11px] md:text-xs font-bold text-white/60 tracking-wider bg-black/10 px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/5">
              <span className="uppercase opacity-70">Função:</span>
              <span className="text-white drop-shadow-sm">
                {loading ? '...' : (proximaEscalaData?.funcoes.join(', ') || 'Nênuma')}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3 - Aniversariantes (Com Nomes) */}
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center group hover:shadow-xl transition-all duration-300">
          <div className="w-14 h-14 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fas fa-birthday-cake"></i>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight mb-3 px-4 capitalize">
              {loading ? '...' : renderBirthdayNames()}
            </span>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aniversariantes do Mês</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* Gráfico de Frequência */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 h-[450px]">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-1.5 h-6 bg-brand rounded-full transition-colors"></div>
              <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Frequência por Membro</h3>
            </div>
            <div className="h-[320px] w-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : frequenciaMembros.length > 0 ? (
                <canvas ref={escalaChartRef}></canvas>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <i className="fas fa-chart-bar text-4xl mb-4"></i>
                    <p className="text-sm">Nenhum dado de frequência disponível</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          {/* Card Devocional (Glassmorphism Premium) */}
          <div className="relative group overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/5 h-[450px]">
            {/* Background Dinâmico com Blur */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#111827] to-[#020617]"></div>
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-brand/20 rounded-full blur-[80px] group-hover:bg-brand/30 transition-all duration-1000"></div>
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-brand-accent/10 rounded-full blur-[80px] group-hover:bg-brand-accent/20 transition-all duration-1000"></div>

            {/* Efeito Glassmorphism Content */}
            <div className="relative h-full w-full backdrop-blur-md bg-white/5 p-10 text-white flex flex-col items-center justify-center text-center">
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
        </div>
      </div>

      {isDevocionalModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">
              Atualizar Versículo
            </h3>
            <textarea
              value={devocionalInput}
              onChange={(e) => setDevocionalInput(e.target.value)}
              placeholder="Digite o versículo ou mensagem de edificação..."
              className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsDevocionalModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[9px] border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDevocional}
                className="flex-1 py-3 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
