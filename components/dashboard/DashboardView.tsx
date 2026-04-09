import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ChartInstance } from '../../types-supabase';
import DashboardService, { ProximaEscala, FrequenciaMembro } from '../../services/DashboardService';

const DashboardView: React.FC = () => {
  const escalaChartRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);
  const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
  const [devocionalInput, setDevocionalInput] = useState('');
  const [currentDevocional, setCurrentDevocional] = useState('Porque, onde estiverem dois ou três reunidos em meu nome, ali estou eu no meio deles. (Mateus 18:20)');

  // Estados para os KPIs
  const [totalCultos, setTotalCultos] = useState<number>(0);
  const [totalMusicas, setTotalMusicas] = useState<number>(0);
  const [totalMembrosAtivos, setTotalMembrosAtivos] = useState<number>(0);
  const [proximaEscalaData, setProximaEscalaData] = useState<ProximaEscala | null>(null);
  const [frequenciaMembros, setFrequenciaMembros] = useState<FrequenciaMembro[]>([]);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados do dashboard apenas uma vez ao montar
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      let userId: string | null = null;
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id ?? null;

      // Se offline, pular busca do usuário
      if (!userId && navigator.onLine) {
        // Buscar usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user?.id ?? null;
        }
      }

      // Carregar dados em paralelo incluindo versículo diário
      const [totalCultosData, totalMusicasData, totalMembrosData, proximaEscalaData, frequenciaData, niverData, versiculoData] = await Promise.all([
        DashboardService.getTotalCultos(),
        DashboardService.getTotalMusicas(),
        DashboardService.getTotalMembrosAtivos(),
        userId ? DashboardService.getProximaEscala(userId) : Promise.resolve(null),
        DashboardService.getFrequenciaPorMembro(),
        DashboardService.getAniversariantesDoMes(),
        DashboardService.getVersiculoDiario() // Buscar versículo automático
      ]);

      setTotalCultos(totalCultosData);
      setTotalMusicas(totalMusicasData);
      setTotalMembrosAtivos(totalMembrosData);

      if (proximaEscalaData) {
        setProximaEscalaData(proximaEscalaData);
      } else {
        setProximaEscalaData(null);
      }

      // Ordenar frequencia por quantidade
      const sortedFrequencia = [...frequenciaData].sort((a, b) => b.quantidade - a.quantidade);
      setFrequenciaMembros(sortedFrequencia);
      
      // Atualizar versículo diário (automático)
      if (versiculoData) {
        setCurrentDevocional(versiculoData);
      }
      
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
  const updateChart = useCallback(() => {
    if (!escalaChartRef.current || frequenciaMembros.length === 0) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      return;
    }

    if (!chartContainerRef.current || chartContainerRef.current.clientWidth === 0 || chartContainerRef.current.clientHeight === 0) {
      return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#1e3a8a';

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
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

    // Função para ajustar cor (HSL)
    const adjustColor = (hex: string, degrees: number): string => {
      let r = 0, g = 0, b = 0;
      if (hex.startsWith('#')) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
      } else {
        return hex; // Retorna original se não for hex
      }
      
      // Converter para HSL
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      // Ajustar matiz
      h = (h * 360 + degrees) / 360;
      if (h < 0) h += 1;
      if (h > 1) h -= 1;

      // Converter de volta para RGB
      let newR, newG, newB;
      if (s === 0) {
        newR = newG = newB = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        newR = hue2rgb(p, q, h + 1/3);
        newG = hue2rgb(p, q, h);
        newB = hue2rgb(p, q, h - 1/3);
      }

      // Converter para hex
      const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };

      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    };

    // Gradientes mais bonitos e variados - baseados na cor do tema
    const backgroundColors = frequenciaMembros.map((_, index) => {
      // Gerar cores complementares baseadas na cor primária
      const baseColors = [
        hexToRgba(primaryColor, 0.8), // Cor primária do tema
        hexToRgba(adjustColor(primaryColor, 120), 0.8), // Complementar 1
        hexToRgba(adjustColor(primaryColor, 60), 0.8),  // Complementar 2
        hexToRgba(adjustColor(primaryColor, 180), 0.8), // Complementar 3
        hexToRgba(adjustColor(primaryColor, 30), 0.8),  // Variação 1
        hexToRgba(adjustColor(primaryColor, -30), 0.8), // Variação 2
        hexToRgba(adjustColor(primaryColor, 90), 0.8),  // Variação 3
        hexToRgba(adjustColor(primaryColor, -60), 0.8), // Variação 4
      ];
      return baseColors[index % baseColors.length];
    });

    // Gradientes mais suaves para as bordas - baseados na cor do tema
    const borderColors = frequenciaMembros.map((_, index) => {
      const baseColors = [
        hexToRgba(primaryColor, 1), // Cor primária do tema
        hexToRgba(adjustColor(primaryColor, 120), 1), // Complementar 1
        hexToRgba(adjustColor(primaryColor, 60), 1),  // Complementar 2
        hexToRgba(adjustColor(primaryColor, 180), 1), // Complementar 3
        hexToRgba(adjustColor(primaryColor, 30), 1),  // Variação 1
        hexToRgba(adjustColor(primaryColor, -30), 1), // Variação 2
        hexToRgba(adjustColor(primaryColor, 90), 1),  // Variação 3
        hexToRgba(adjustColor(primaryColor, -60), 1), // Variação 4
      ];
      return baseColors[index % baseColors.length];
    });

    chartInstance.current = new window.Chart(escalaChartRef.current, {
      type: 'bar',
      data: {
        labels: frequenciaMembros.map(m => m.nome),
        datasets: [{
          label: 'Cultos Participados',
          data: frequenciaMembros.map(m => m.quantidade),
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 8,
          maxBarThickness: 60,
          // Efeito de sombra
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { 
            display: false 
          },
          // Tooltip melhorado
          tooltip: {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#f1f5f9' : '#1e293b',
            bodyColor: isDark ? '#cbd5e1' : '#475569',
            borderColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return [
                  `${label}: ${value}`,
                  `${percentage}% do total`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            grid: { 
              display: false,
              drawBorder: false
            },
            ticks: {
              font: { 
                weight: '600', 
                size: 11,
                family: 'Inter, system-ui, sans-serif'
              },
              color: isDark ? '#94a3b8' : '#64748b',
              padding: 8,
              // Rotação para nomes longos
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: { 
              color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
              drawBorder: false,
              borderDash: [8, 4]
            },
            ticks: { 
              stepSize: 1,
              color: isDark ? '#94a3b8' : '#64748b',
              font: { 
                weight: '500', 
                size: 10,
                family: 'Inter, system-ui, sans-serif'
              },
              padding: 8
            },
            // Linha de grade mais suave
            border: {
              display: false
            }
          }
        },
        // Animações mais suaves
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart',
          delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 50;
            }
            return delay;
          }
        },
        // Interação melhorada
        interaction: {
          intersect: false,
          mode: 'index',
        },
        // Layout otimizado
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 10,
            left: 10
          }
        }
      }
    });
  }, [frequenciaMembros]);

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
  }, [updateChart]); // Atualiza quando os dados estiverem prontos ou o tema mudar

  useEffect(() => {
    updateChart();
  }, [updateChart]);

  // Hook adicional para observar mudanças na cor do tema
  useEffect(() => {
    const handleResize = () => {
      const chart = chartInstance.current;
      // Sempre atualiza quando há dados para garantir sincronização
      if (chart?.resize) {
        chart.resize();
        chart.update();
        return;
      }

      updateChart();
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined' && chartContainerRef.current
      ? new ResizeObserver(handleResize)
      : null;

    if (chartContainerRef.current && resizeObserver) {
      resizeObserver.observe(chartContainerRef.current);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateChart]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  const handleSaveDevocional = () => {
    if (devocionalInput.trim()) {
      setCurrentDevocional(devocionalInput);
      setIsDevocionalModalOpen(false);
      setDevocionalInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
      {/* Header Hero Section */}
      <div className="relative overflow-hidden bg-brand dark:bg-brand">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand/20 rounded-full blur-[100px]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
              Bem-vindo ao <span className="relative">
                <span className="relative z-10 text-brand-accent font-black">Louvor</span>
                <span className="absolute inset-0 bg-brand-accent/20 blur-xl scale-110"></span>
                <span className="absolute inset-0 bg-brand-accent/10 blur-2xl scale-125"></span>
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 h-[calc(100vh-8rem)] overflow-y-auto lg:overflow-hidden">
        {/* Próximo Culto Card - Compacto em Uma Linha */}
        <div className="mb-6">
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              {/* Ícone e Título */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-calendar-star text-lg"></i>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-white">Próximo Culto</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {loading ? '...' : (proximaEscalaData?.culto || 'Livre')} • {loading ? '...' : (proximaEscalaData ? new Date(proximaEscalaData.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----')}
                  </p>
                </div>
              </div>

              {/* Funções */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <i className="fas fa-music text-brand/70 text-sm"></i>
                  {loading ? (
                    <div className="w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                  ) : proximaEscalaData?.funcoes.length ? (
                    <div className="flex gap-1">
                      {proximaEscalaData.funcoes.slice(0, 2).map((funcao, index) => (
                        <span key={index} className="px-2 py-1 bg-brand/10 text-brand text-xs font-semibold rounded-lg">
                          {funcao}
                        </span>
                      ))}
                      {proximaEscalaData.funcoes.length > 2 && (
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-lg">
                          +{proximaEscalaData.funcoes.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 italic">Sem funções</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Total de Cultos</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-brand transition-colors">
                  {loading ? '...' : totalCultos}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fas fa-church text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Membros Ativos</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-brand transition-colors">
                  {loading ? '...' : totalMembrosAtivos}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fas fa-users text-lg"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Aniversariantes</p>
                <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-brand transition-colors">
                  {loading ? '...' : renderBirthdayNames()}
                </p>
              </div>
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <i className="fas fa-birthday-cake text-lg"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Frequência - Maior e Principal */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-brand rounded-full"></div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Frequência por Membro</h3>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Últimos 10 meses
                </div>
              </div>
              
              <div ref={chartContainerRef} className="h-[320px] w-full">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-600 dark:text-slate-400">Carregando dados...</p>
                    </div>
                  </div>
                ) : frequenciaMembros.length > 0 ? (
                  <canvas ref={escalaChartRef}></canvas>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <i className="fas fa-chart-bar text-6xl mb-4 opacity-50"></i>
                      <p className="text-lg">Nenhum dado de frequência disponível</p>
                      <p className="text-sm mt-2">Os dados aparecerão aqui após os primeiros cultos</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Devocional */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-xl p-6 h-[420px] relative overflow-hidden group border border-gray-100 dark:border-gray-700">
              {/* Efeitos de Fundo - Modo Claro (Modelo 5) / Modo Escuro (Modelo 4) */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 dark:bg-brand/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-accent/20 dark:bg-brand-accent/30 rounded-full blur-3xl"></div>
              
              {/* Gradiente adicional para modo escuro */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 dark:from-brand/10 via-transparent to-brand-accent/3 dark:to-brand-accent/5 opacity-60 dark:opacity-80"></div>
              
              <div className="relative h-full flex flex-col">
                <div className="text-center">
                  {/* Ícone - Adapta entre Modelo 5 (claro) e Modelo 4 (escuro) */}
                  <div className="w-16 h-16 bg-white/80 dark:bg-gray-800 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand/20 dark:border-brand/30 shadow-lg dark:shadow-xl">
                    <i className="fas fa-dove text-2xl text-[var(--brand-primary)] dark:text-[var(--brand-accent)]"></i>
                  </div>
                  
                  {/* Título - Adapta cores entre modo claro e escuro */}
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">
                    Edificação do Dia
                  </h3>
                  
                  {/* Versículo - Container adaptativo com tamanho dinâmico */}
                  <div className="flex-1 flex items-center justify-center py-6">
                    <div className="relative max-w-full">
                      {/* Efeito de luz de fundo - sutil no claro, mais forte no escuro */}
                      <div className="absolute -inset-6 bg-brand/5 dark:bg-brand/10 rounded-2xl blur-2xl opacity-50 dark:opacity-70"></div>
                      
                      {/* Container do versículo - mais translúcido no claro, mais opaco no escuro */}
                      <div className="relative bg-white/60 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-brand/10 dark:border-brand/20 shadow-lg dark:shadow-xl">
                        <p className="relative text-xl text-gray-700 dark:text-gray-200 font-medium leading-relaxed italic font-serif text-center transition-all duration-300" 
                           style={{
                             fontSize: currentDevocional.length > 150 ? '0.875rem' : 
                                     currentDevocional.length > 100 ? '1rem' : 
                                     currentDevocional.length > 80 ? '1.125rem' : '1.25rem',
                             lineHeight: currentDevocional.length > 150 ? '1.4' : '1.5'
                           }}>
                          "{currentDevocional}"
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separador - Adapta cores */}
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <div className="h-px w-10 bg-brand/20 dark:bg-brand/30"></div>
                    <div className="w-8 h-8 bg-brand/10 dark:bg-brand/20 rounded-full flex items-center justify-center border border-brand/20 dark:border-brand/30">
                      <i className="fas fa-cross text-[var(--brand-primary)] dark:text-[var(--brand-accent)] text-sm"></i>
                    </div>
                    <div className="h-px w-10 bg-brand/20 dark:bg-brand/30"></div>
                  </div>
                  
                  {/* Botão de Editar - Oculto (versículo automático) */}
                  {/* 
                  <button
                    onClick={() => setIsDevocionalModalOpen(true)}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/80 dark:bg-gray-800/80 hover:bg-white/90 dark:hover:bg-gray-800/90 backdrop-blur-sm rounded-xl flex items-center justify-center border border-brand/20 dark:border-brand/30 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-edit text-[var(--brand-primary)] dark:text-[var(--brand-accent)] text-sm"></i>
                  </button>
                  */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Devocional */}
      {isDevocionalModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">
              Atualizar Versículo
            </h3>
            <textarea
              value={devocionalInput}
              onChange={(e) => setDevocionalInput(e.target.value)}
              placeholder="Digite o versículo ou mensagem de edificação..."
              className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsDevocionalModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-xs border border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDevocional}
                className="flex-1 py-3 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all"
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
