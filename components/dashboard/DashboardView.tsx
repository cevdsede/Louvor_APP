import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useMinistryContext } from '../../contexts/MinistryContext';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { ChartInstance } from '../../types-supabase';
import DashboardService, { EscalaSemanaResumo, FrequenciaMembro } from '../../services/DashboardService';
import { Member, Notice, ScheduleEvent } from '../../types';
import EventCard from '../escalas/EventCard';
import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';
import { getDisplayName } from '../../utils/displayName';
import { getMemberIdsForMinisterio } from '../../utils/memberMinistry';
import { buildLocalAvatar } from '../../utils/avatar';
import { ImageCache } from '../ui/ImageCache';

const DashboardView: React.FC = () => {
  const { activeMinisterio, activeMinisterioId, activeModules } = useMinistryContext();
  const { data: membrosMinisteriosRaw } = useLocalStorageFirst<any>({ table: 'membros_ministerios' });
  const escalaChartRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<ChartInstance | null>(null);
  const [chartAvailable, setChartAvailable] = useState(() => typeof window !== 'undefined' && Boolean(window.Chart));
  const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
  const [devocionalInput, setDevocionalInput] = useState('');
  const [currentDevocional, setCurrentDevocional] = useState('Porque, onde estiverem dois ou três reunidos em meu nome, ali estou eu no meio deles. (Mateus 18:20)');

  // Estados para os KPIs
  const [totalCultos, setTotalCultos] = useState<number>(0);
  const [totalMusicas, setTotalMusicas] = useState<number>(0);
  const [totalMembrosAtivos, setTotalMembrosAtivos] = useState<number>(0);
  const [escalaSemana, setEscalaSemana] = useState<EscalaSemanaResumo | null>(null);
  const [frequenciaMembros, setFrequenciaMembros] = useState<FrequenciaMembro[]>([]);
  const [aniversariantes, setAniversariantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeekEvents, setSelectedWeekEvents] = useState<ScheduleEvent[] | null>(null);
  const [expandedWeekEventId, setExpandedWeekEventId] = useState<string | null>(null);
  const [activeWeekSubTabs, setActiveWeekSubTabs] = useState<Record<string, 'team' | 'repertoire' | 'notices'>>({});
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: repertorioRaw } = useLocalStorageFirst<any>({ table: 'repertorio' });
  const { data: musicasRaw } = useLocalStorageFirst<any>({ table: 'musicas' });
  const { data: tonsRaw } = useLocalStorageFirst<any>({ table: 'tons' });
  const { data: avisosRaw } = useLocalStorageFirst<any>({ table: 'avisos_cultos' });
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });
  const memberIds = (membrosMinisteriosRaw || [])
    .filter((membership: any) => membership.ministerio_id === activeMinisterioId && membership.ativo !== false)
    .map((membership: any) => membership.membro_id);
  const linkedMemberIdsInMinisterio = useMemo(
    () => getMemberIdsForMinisterio(membrosMinisteriosRaw, activeMinisterioId, true),
    [activeMinisterioId, membrosMinisteriosRaw]
  );
  const scopedMembros = useMemo(
    () =>
      activeMinisterioId
        ? (membrosRaw || []).filter((member: any) => linkedMemberIdsInMinisterio.has(member.id))
        : membrosRaw || [],
    [activeMinisterioId, linkedMemberIdsInMinisterio, membrosRaw]
  );
  const scopedEscalas = useMemo(
    () =>
      activeMinisterioId
        ? (escalasRaw || []).filter((escala: any) => escala.ministerio_id === activeMinisterioId)
        : escalasRaw || [],
    [activeMinisterioId, escalasRaw]
  );
  const scopedAvisos = useMemo(
    () =>
      activeMinisterioId
        ? (avisosRaw || []).filter((aviso: any) => aviso.ministerio_id === activeMinisterioId)
        : avisosRaw || [],
    [activeMinisterioId, avisosRaw]
  );
  const scopedFuncoes = useMemo(
    () =>
      activeMinisterioId
        ? (funcoesRaw || []).filter((funcao: any) => funcao.ministerio_id === activeMinisterioId)
        : funcoesRaw || [],
    [activeMinisterioId, funcoesRaw]
  );
  const canManageRepertoire = activeModules.includes('music');
  const activeModulesKey = activeModules.join('|');
  const activeMinisterioSlug = activeMinisterio?.slug
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const canViewRepertoire = canManageRepertoire || activeMinisterioSlug === 'midia' || activeMinisterioSlug === 'media';
  const maxFrequenciaQuantidade = Math.max(...frequenciaMembros.map((member) => member.quantidade), 1);

  const getCachedUserId = (): string | null => {
    try {
      const cachedSession = localStorage.getItem('supabase_session_cache');
      if (!cachedSession) return null;
      const parsedSession = JSON.parse(cachedSession);
      return parsedSession?.user?.id || null;
    } catch {
      return null;
    }
  };

  // Carregar dados do dashboard apenas uma vez ao montar
  useEffect(() => {
    loadDashboardData();
  }, [activeMinisterioId, activeModulesKey, memberIds.join('|')]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const scope = {
        ministerioId: activeMinisterioId,
        memberIds,
        canAccessMusic: activeModules.includes('music')
      };
      let userId: string | null = getCachedUserId();

      // Se offline, pular busca do usuário
      if (!userId && navigator.onLine) {
        // Buscar usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user?.id ?? null;
        }
      }

      // Carregar dados em paralelo incluindo versículo diário
      const [totalCultosData, totalMusicasData, totalMembrosData, escalaSemanaData, frequenciaData, niverData, versiculoData] = await Promise.all([
        DashboardService.getTotalCultos(scope),
        DashboardService.getTotalMusicas(scope),
        DashboardService.getTotalMembrosAtivos(scope),
        DashboardService.getEscalasDaSemana(userId || '', scope),
        DashboardService.getFrequenciaPorMembro(scope),
        DashboardService.getAniversariantesDoMes(scope),
        DashboardService.getVersiculoDiario() // Buscar versículo automático
      ]);

      setTotalCultos(totalCultosData);
      setTotalMusicas(totalMusicasData);
      setTotalMembrosAtivos(totalMembrosData);

      setEscalaSemana(escalaSemanaData);

      // Ordenar frequencia por quantidade
      const sortedFrequencia = [...frequenciaData].sort((a, b) => b.quantidade - a.quantidade);
      setFrequenciaMembros(sortedFrequencia);
      setAniversariantes(niverData);
      
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

  const formatCompactDate = (dateString?: string | null) => {
    if (!dateString) return '--/--';

    return new Date(`${dateString}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const formatWeekday = (dateString?: string | null) => {
    if (!dateString) return '--';

    return new Date(`${dateString}T12:00:00`)
      .toLocaleDateString('pt-BR', { weekday: 'short' })
      .replace('.', '')
      .slice(0, 3)
      .toUpperCase();
  };

  const formatHour = (value?: string | null) => {
    if (!value) return '';
    return value.slice(0, 5);
  };

  const groupMembersByPerson = (eventEscalas: any[]): Member[] => {
    const memberMap = new Map();

    eventEscalas.forEach((escala) => {
      const memberId = escala.membros?.id;
      const memberName = getDisplayName(escala.membros);
      const memberRole = escala.funcao?.nome_funcao;
      const roleId = escala.funcao?.id;

      if (memberId && memberName) {
        if (!memberMap.has(memberId)) {
          memberMap.set(memberId, {
            id: memberId,
            name: memberName,
            gender: escala.membros?.genero === 'Homem' ? 'M' : 'F',
            avatar: escala.membros?.foto || buildLocalAvatar(memberName),
            status: 'confirmed',
            upcomingScales: [],
            songHistory: [],
            roles: [],
            roleIds: []
          });
        }

        const member = memberMap.get(memberId);
        if (memberRole && !member.roles.includes(memberRole)) {
          member.roles.push(memberRole);
          member.roleIds.push(roleId);
        }
      }
    });

    return Array.from(memberMap.values()).map((member: any) => {
      const sortedRoles = member.roleIds
        .map((id: number, index: number) => ({ id, role: member.roles[index] }))
        .sort((a: any, b: any) => a.id - b.id)
        .map((item: any) => item.role);

      return {
        ...member,
        role: sortedRoles.join(' / '),
        roles: sortedRoles,
        roleIds: member.roleIds
      };
    });
  };

  const eventNotices = useMemo<Record<string, Notice[]>>(() => {
    const noticesByEvent: Record<string, Notice[]> = {};

    scopedAvisos.forEach((notice: any) => {
      if (!notice.id_cultos) return;
      if (!noticesByEvent[notice.id_cultos]) noticesByEvent[notice.id_cultos] = [];
      const member = scopedMembros.find((item: any) => item.id === notice.id_membros);
      noticesByEvent[notice.id_cultos].push({
        id: notice.id_lembrete,
        text: notice.info,
        sender: getDisplayName(member, 'Admin'),
        time: notice.created_at
          ? new Date(notice.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : ''
      });
    });

    return noticesByEvent;
  }, [scopedAvisos, scopedMembros]);

  const eventsByCultoId = useMemo(() => {
    const mappedEvents = new Map<string, ScheduleEvent>();

    (cultosRaw || []).forEach((culto: any) => {
      const date = new Date(`${culto.data_culto}T12:00:00`);
      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const eventEscalasRaw = scopedEscalas
        .filter((escala: any) => escala.id_culto === culto.id)
        .map((escala: any) => ({
          membros: scopedMembros.find((member: any) => member.id === escala.id_membros),
          funcao: scopedFuncoes.find((funcao: any) => funcao.id === escala.id_funcao)
        }));

      const members = sortMembersByRole(groupMembersByPerson(eventEscalasRaw));
      const repertoire = (canViewRepertoire ? (repertorioRaw || []) : [])
        .filter((item: any) => item.id_culto === culto.id)
        .map((item: any) => {
          const song = (musicasRaw || []).find((music: any) => music.id === item.id_musicas);
          const tone = (tonsRaw || []).find((entry: any) => entry.id === item.id_tons);
          const member = (membrosRaw || []).find((entry: any) => entry.id === item.id_membros);
          return {
            id: item.id,
            musica: song?.musica || 'Sem música',
            cantor: song?.cantor || 'Sem cantor',
            key: tone?.nome_tons || 'Ñ',
            minister: getDisplayName(member)
          };
        });

      mappedEvents.set(culto.id, {
        id: culto.id,
        title: (nomeCultosRaw || []).find((item: any) => item.id === culto.id_nome_cultos)?.nome_culto || 'CULTO',
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        dayOfWeek: daysOfWeek[date.getDay()],
        time: culto.horario,
        members,
        repertoire
      });
    });

    return mappedEvents;
  }, [canViewRepertoire, cultosRaw, membrosRaw, musicasRaw, nomeCultosRaw, repertorioRaw, scopedEscalas, scopedFuncoes, scopedMembros, tonsRaw]);

  const proximaEscalaData = escalaSemana?.items?.[0]
    ? {
        culto: escalaSemana.items[0].culto,
        data: escalaSemana.items[0].data,
        funcoes: escalaSemana.items[0].funcoes
      }
    : null;

  const openWeekEventModal = (cultoId: string) => {
    const event = eventsByCultoId.get(cultoId);
    if (!event) return;
    setSelectedWeekEvents([event]);
    setExpandedWeekEventId(cultoId);
    setActiveWeekSubTabs((previous) => ({ ...previous, [cultoId]: 'team' }));
  };

  const toggleWeekEvent = (id: string) => {
    setExpandedWeekEventId((previous) => (previous === id ? null : id));
    setActiveWeekSubTabs((previous) => (previous[id] ? previous : { ...previous, [id]: 'team' }));
  };

  const setWeekSubTab = (eventId: string, tab: 'team' | 'repertoire' | 'notices') => {
    setActiveWeekSubTabs((previous) => ({ ...previous, [eventId]: tab }));
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
    if (!window.Chart) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
      setChartAvailable((current) => (current ? false : current));
      return;
    }

    setChartAvailable((current) => (current ? current : true));

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
    const computedStyles = getComputedStyle(document.documentElement);
    const primaryColor =
      computedStyles.getPropertyValue('--brand-primary').trim() ||
      computedStyles.getPropertyValue('--app-brand-primary').trim() ||
      '#3b82f6';

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    // Função helper para converter hexa em rgba
    const parseColor = (value: string) => {
      const normalized = value.trim();

      if (normalized.startsWith('#') && normalized.length >= 7) {
        return {
          r: parseInt(normalized.slice(1, 3), 16),
          g: parseInt(normalized.slice(3, 5), 16),
          b: parseInt(normalized.slice(5, 7), 16)
        };
      }

      const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (rgbMatch) {
        return {
          r: Number(rgbMatch[1]),
          g: Number(rgbMatch[2]),
          b: Number(rgbMatch[3])
        };
      }

      return { r: 59, g: 130, b: 246 };
    };

    const mixColor = (
      base: { r: number; g: number; b: number },
      target: { r: number; g: number; b: number },
      amount: number
    ) => ({
      r: Math.round(base.r + (target.r - base.r) * amount),
      g: Math.round(base.g + (target.g - base.g) * amount),
      b: Math.round(base.b + (target.b - base.b) * amount)
    });

    const toRgba = (color: { r: number; g: number; b: number }, alpha: number) =>
      `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

    const hexToRgba = (value: string, alpha: number) => toRgba(parseColor(value), alpha);

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

    // Gradientes baseados na cor do tema
    const backgroundColors = frequenciaMembros.map((_, index) => {
      // Se for o tema azul, usar uma paleta de azuis variados
      const isBlueTheme = primaryColor.toLowerCase() === '#3b82f6' || 
                         primaryColor.toLowerCase().includes('59, 130, 246');

      if (isBlueTheme) {
        const bluePalette = [
          'rgba(59, 130, 246, 0.8)', // Blue 500
          'rgba(37, 99, 235, 0.8)',  // Blue 600
          'rgba(29, 78, 216, 0.8)',  // Blue 700
          'rgba(96, 165, 250, 0.8)', // Blue 400
          'rgba(147, 197, 253, 0.8)', // Blue 300
          'rgba(30, 64, 175, 0.8)',  // Blue 800
        ];
        return bluePalette[index % bluePalette.length];
      }

      // Gerar cores complementares baseadas na cor primária para outros temas
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
      const isBlueTheme = primaryColor.toLowerCase() === '#3b82f6' || 
                         primaryColor.toLowerCase().includes('59, 130, 246');

      if (isBlueTheme) {
        const blueBorderPalette = [
          'rgba(59, 130, 246, 1)',
          'rgba(37, 99, 235, 1)',
          'rgba(29, 78, 216, 1)',
          'rgba(96, 165, 250, 1)',
          'rgba(147, 197, 253, 1)',
          'rgba(30, 64, 175, 1)',
        ];
        return blueBorderPalette[index % blueBorderPalette.length];
      }

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

    const themeRgb = parseColor(primaryColor);
    const monochromeScale = [
      mixColor(themeRgb, { r: 255, g: 255, b: 255 }, 0.18),
      mixColor(themeRgb, { r: 255, g: 255, b: 255 }, 0.08),
      themeRgb,
      mixColor(themeRgb, { r: 0, g: 0, b: 0 }, 0.08),
      mixColor(themeRgb, { r: 0, g: 0, b: 0 }, 0.16),
      mixColor(themeRgb, { r: 0, g: 0, b: 0 }, 0.24)
    ];

    const themeBackgroundColors = frequenciaMembros.map((_, index) =>
      toRgba(monochromeScale[index % monochromeScale.length], 0.82)
    );

    const themeBorderColors = frequenciaMembros.map((_, index) =>
      toRgba(monochromeScale[index % monochromeScale.length], 1)
    );

    chartInstance.current = new window.Chart(escalaChartRef.current, {
      type: 'bar',
      data: {
        labels: frequenciaMembros.map(m => m.nome),
        datasets: [{
          label: 'Cultos Participados',
          data: frequenciaMembros.map(m => m.quantidade),
          backgroundColor: themeBackgroundColors,
          borderColor: themeBorderColors,
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
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand via-brand to-brand-accent/90 dark:from-slate-950 dark:via-brand/90 dark:to-slate-900">
        <div className="absolute inset-0 bg-slate-950/12 dark:bg-black/28"></div>
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/12 blur-[110px]"></div>
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-cyan-200/20 blur-[110px] dark:bg-brand/25"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
              Bem-vindo ao <span className="relative">
                <span className="relative z-10 text-brand-accent font-black">{activeMinisterio?.nome || 'Ministerio'}</span>
                <span className="absolute inset-0 bg-brand-accent/20 blur-xl scale-110"></span>
                <span className="absolute inset-0 bg-brand-accent/10 blur-2xl scale-125"></span>
              </span>
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 sm:-mt-4">
        <div className="mb-6">
          <div className="app-card rounded-[1.75rem] border border-sky-100/90 bg-white/94 p-4 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-accent text-white shadow-lg shadow-brand/25">
                    <i className="fas fa-calendar-week text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">Escala da Semana</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {loading ? 'Carregando...' : `Seg a Dom - ${formatCompactDate(escalaSemana?.startDate)} a ${formatCompactDate(escalaSemana?.endDate)}`}
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center rounded-full bg-sky-100/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:bg-brand/15 dark:text-brand-accent">
                  {loading ? '...' : `${escalaSemana?.items.length || 0} escala${(escalaSemana?.items.length || 0) === 1 ? '' : 's'}`}
                </div>
              </div>

              {loading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="h-24 rounded-[1.4rem] border border-sky-100 bg-white/88 animate-pulse dark:border-slate-700 dark:bg-slate-900/55"
                    />
                  ))}
                </div>
              ) : escalaSemana?.items.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {escalaSemana.items.map((item) => (
                    <div
                      key={item.idCulto}
                      onClick={() => openWeekEventModal(item.idCulto)}
                      className="cursor-pointer rounded-[1.4rem] border border-sky-100 bg-white/92 p-4 transition-all hover:border-brand/35 hover:bg-white hover:shadow-lg hover:shadow-brand/10 dark:border-slate-700 dark:bg-slate-900/55 dark:hover:bg-brand/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-brand">
                            {formatWeekday(item.data)} - {formatCompactDate(item.data)}
                          </p>
                          <h3 className="mt-1 text-sm font-black text-slate-800 dark:text-white">
                            {item.culto}
                          </h3>
                        </div>
                        {item.horario && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                            {formatHour(item.horario)}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.funcoes.length ? (
                          item.funcoes.map((funcao) => (
                            <span
                              key={`${item.idCulto}-${funcao}`}
                              className="rounded-xl bg-sky-100/90 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-brand/15 dark:text-brand-accent"
                            >
                              {funcao}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400 italic">Sem funcao definida</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-sky-100 bg-white/88 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-400">
                  Nenhuma escala encontrada nesta semana para o ministerio atual.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hidden">
        {/* Próximo Culto Card - Compacto em Uma Linha */}
        <div className="mb-6">
          <div className="app-card rounded-[1.75rem] border border-sky-100/90 bg-white/94 p-4 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88">
            <div className="flex flex-col gap-5">
              {/* Ícone e Título */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-accent text-white shadow-lg shadow-brand/25">
                  <i className="fas fa-calendar-week text-lg"></i>
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
                        <span key={index} className="rounded-xl bg-sky-100/90 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-brand/15 dark:text-brand-accent">
                          {funcao}
                        </span>
                      ))}
                      {proximaEscalaData.funcoes.length > 2 && (
                        <span className="rounded-xl bg-sky-50 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-400">
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
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5 sm:mb-6">
          <div className="app-card group aspect-square rounded-[1.35rem] border border-sky-100/90 bg-white/94 p-2.5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-brand/10 sm:aspect-auto sm:rounded-[1.65rem] sm:p-4 dark:border-white/10 dark:bg-slate-900/88">
            <div className="flex h-full flex-col items-center justify-center text-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:gap-0">
              <div className="order-1 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 dark:bg-emerald-900/30 dark:text-emerald-400 sm:order-2 sm:h-12 sm:w-12 sm:rounded-2xl">
                <i className="fas fa-church text-sm sm:text-lg"></i>
              </div>
              <div className="order-2 sm:order-1">
                <p className="text-[9px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-normal sm:tracking-wider leading-tight mb-1">Total de Cultos</p>
                <p className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white group-hover:text-brand transition-colors">
                  {loading ? '...' : totalCultos}
                </p>
              </div>
            </div>
          </div>

          <div className="app-card group aspect-square rounded-[1.35rem] border border-sky-100/90 bg-white/94 p-2.5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-brand/10 sm:aspect-auto sm:rounded-[1.65rem] sm:p-4 dark:border-white/10 dark:bg-slate-900/88">
            <div className="flex h-full flex-col items-center justify-center text-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:gap-0">
              <div className="order-1 flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 transition-transform group-hover:scale-110 dark:bg-blue-900/30 dark:text-blue-400 sm:order-2 sm:h-12 sm:w-12 sm:rounded-2xl">
                <i className="fas fa-users text-sm sm:text-lg"></i>
              </div>
              <div className="order-2 sm:order-1">
                <p className="text-[9px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-normal sm:tracking-wider leading-tight mb-1">Membros Ativos</p>
                <p className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white group-hover:text-brand transition-colors">
                  {loading ? '...' : totalMembrosAtivos}
                </p>
              </div>
            </div>
          </div>

          <div className="app-card group aspect-square rounded-[1.35rem] border border-sky-100/90 bg-white/94 p-2.5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-brand/10 sm:aspect-auto sm:rounded-[1.65rem] sm:p-4 dark:border-white/10 dark:bg-slate-900/88">
            <div className="flex h-full flex-col items-center justify-center text-center gap-2 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:gap-0">
              <div className="order-1 flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 transition-transform group-hover:scale-110 dark:bg-pink-900/30 dark:text-pink-400 sm:order-2 sm:h-12 sm:w-12 sm:rounded-2xl">
                <i className="fas fa-birthday-cake text-sm sm:text-lg"></i>
              </div>
              <div className="order-2 sm:order-1">
                <p className="text-[9px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-normal sm:tracking-wider leading-tight mb-1">Aniversariantes</p>
                <p className="text-base sm:text-sm font-black text-slate-800 dark:text-white group-hover:text-brand transition-colors leading-tight">
                  <span className="sm:hidden">{loading ? '...' : aniversariantes.length}</span>
                  <span className="hidden sm:inline">{loading ? '...' : renderBirthdayNames()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gráfico de Frequência - Maior e Principal */}
          <div className="lg:col-span-2">
            <div className="app-card min-h-[360px] rounded-[1.8rem] border border-sky-100/90 bg-white/94 p-5 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl sm:h-[400px] sm:p-6 dark:border-white/10 dark:bg-slate-900/88">
              <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-2 rounded-full bg-gradient-to-b from-brand to-brand-accent"></div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">Frequência por Membro</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {activeMinisterio?.nome || 'Ministério selecionado'}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Últimos 10 meses
                </div>
              </div>
              
              <div ref={chartContainerRef} className="h-[260px] w-full sm:h-[320px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-600 dark:text-slate-400">Carregando dados...</p>
                    </div>
                  </div>
                ) : frequenciaMembros.length > 0 ? (
                  chartAvailable ? (
                    <canvas ref={escalaChartRef}></canvas>
                  ) : (
                    <div className="flex h-full flex-col justify-center gap-3">
                      {frequenciaMembros.slice(0, 8).map((member, index) => (
                        <div key={`${member.nome}-${index}`} className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="min-w-0 truncate font-bold text-slate-700 dark:text-slate-200">
                              {member.nome}
                            </span>
                            <span className="shrink-0 font-black text-brand">{member.quantidade}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-sky-100 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${Math.max((member.quantidade / maxFrequenciaQuantidade) * 100, 8)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
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
            <div className="app-card group relative min-h-[380px] overflow-hidden rounded-[1.8rem] border border-sky-100/90 bg-white/94 p-5 shadow-[0_28px_70px_-42px_rgba(14,116,144,0.28)] backdrop-blur-xl sm:h-[420px] sm:p-6 dark:border-white/10 dark:bg-slate-900/88">
              {/* Efeitos de Fundo - Modo Claro (Modelo 5) / Modo Escuro (Modelo 4) */}
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-sky-200/45 blur-3xl dark:bg-brand/30"></div>
              <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-brand-accent/25 blur-3xl dark:bg-brand-accent/30"></div>
              
              {/* Gradiente adicional para modo escuro */}
              <div className="absolute inset-0 bg-gradient-to-br from-sky-100/35 via-transparent to-brand-accent/10 opacity-80 dark:from-brand/10 dark:to-brand-accent/5"></div>
              
              <div className="relative h-full flex flex-col">
                <div className="text-center">
                  {/* Ícone - Adapta entre Modelo 5 (claro) e Modelo 4 (escuro) */}
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-sky-100 bg-white shadow-lg backdrop-blur dark:border-brand/30 dark:bg-gray-800">
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
                      <div className="relative rounded-[1.5rem] border border-sky-100 bg-white/96 p-6 shadow-lg backdrop-blur-sm dark:border-brand/20 dark:bg-gray-800/88 dark:shadow-xl">
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
          <div className="app-card w-full max-w-md rounded-3xl border p-8 backdrop-blur-xl">
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

      {selectedWeekEvents && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 lg:pl-[312px] antialiased">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setSelectedWeekEvents(null)}></div>
          <div className="bg-app-shell border-app relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border shadow-2xl custom-scrollbar lg:max-h-[90vh] lg:rounded-[3rem]">
            <div className="p-6 lg:p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                  Detalhes da Escala
                </h3>
                <button onClick={() => setSelectedWeekEvents(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-6">
                {selectedWeekEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isExpanded={expandedWeekEventId === event.id}
                    onToggle={() => toggleWeekEvent(event.id)}
                    activeSubTab={activeWeekSubTabs[event.id] || 'team'}
                    onSubTabChange={(tab) => setWeekSubTab(event.id, tab)}
                    showRepertoire={canViewRepertoire}
                  >
                    {activeWeekSubTabs[event.id] === 'team' && (
                      <div className="p-6">
                        <div className={`grid gap-4 ${
                          event.members.some((member) => member.roles && member.roles.length > 2)
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                        }`}>
                          {event.members.map((member, index) => (
                            <div key={`${member.id}-${index}`} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                              <div className="flex flex-col items-center text-center">
                                <div className="relative mb-3">
                                  <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-gold rounded-full flex items-center justify-center shadow-lg">
                                    {member.avatar ? (
                                      <ImageCache
                                        src={member.avatar}
                                        fallbackSrc={buildLocalAvatar(member.name)}
                                        alt={member.name}
                                        className="w-full h-full rounded-full object-cover"
                                      />
                                    ) : (
                                      <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-white text-xl`}></i>
                                    )}
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border-2 border-brand">
                                    <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-brand text-[8px]`}></i>
                                  </div>
                                </div>
                                <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate w-full">{member.name}</h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase w-full mt-2">
                                  {member.roles && member.roles.length > 1 ? member.roles.join(' / ') : member.role}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {event.members.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-users-slash text-slate-400 text-lg"></i>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum membro escalado</p>
                          </div>
                        )}
                      </div>
                    )}
                    {canViewRepertoire && activeWeekSubTabs[event.id] === 'repertoire' && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {event.repertoire.map((song) => (
                            <div key={song.id} className="group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                                <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">
                                  {song.key || 'Ñ'}
                                </div>
                                <div className="flex-1 px-4">
                                  <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{song.musica} - {song.cantor}</h5>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">
                                    Ministro: <span className="text-brand">{song.minister || 'Sem ministro'}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {event.repertoire.length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-music-slash text-slate-400 text-lg"></i>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma música no repertório</p>
                          </div>
                        )}
                      </div>
                    )}
                    {activeWeekSubTabs[event.id] === 'notices' && (
                      <div className="p-6">
                        <div className="space-y-3">
                          {(eventNotices[event.id] || []).map((notice) => (
                            <div key={notice.id} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[8px] font-black text-brand uppercase tracking-widest">{notice.sender}</span>
                                <span className="text-[7px] font-bold text-slate-400 uppercase">{notice.time}</span>
                              </div>
                              <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{notice.text}</p>
                            </div>
                          ))}
                        </div>
                        {(eventNotices[event.id] || []).length === 0 && (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                              <i className="fas fa-bell-slash text-slate-400 text-lg"></i>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aviso</p>
                          </div>
                        )}
                      </div>
                    )}
                  </EventCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
