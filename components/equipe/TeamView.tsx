import React, { useEffect, useRef, useState } from 'react';
import { ViewType } from '../../types';
import { ChartInstance } from '../../types-supabase';
import AttendanceView from './AttendanceView';
import EventsView from './EventsView';
import TeamKPIs from './TeamKPIs';
import TeamGrid from './TeamGrid';
import TeamModals from './TeamModals';
import MultiSelect from './MultiSelect';
import { ImageCache } from '../ui/ImageCache';
import { useTeamData } from '../../hooks/useTeamData';
import { sortMembersByRole } from '../../utils/teamUtils';
import EventService, { Evento } from '../../services/EventService';

interface TeamViewProps {
  currentView: ViewType;
}

const TeamView: React.FC<TeamViewProps> = ({ currentView }) => {
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);

  const {
    selectedMember,
    editingMember,
    viewingEvent,
    activeFilter,
    members,
    loading,
    genderChartRef,
    chartInstance,
    setSelectedMember,
    setEditingMember,
    setViewingEvent,
    setActiveFilter,
    setMembers,
    fetchMembers,
    fetchMemberUpcomingScales,
    fetchMemberSongHistory
  } = useTeamData({ currentView });

  // Gerar KPIs dinamicamente baseados nas funções existentes no banco
  const generateKPIs = () => {
    const roleIcons: Record<string, string> = {
      'Ministro': 'fa-crown',
      'Vocal': 'fa-microphone-lines',
      'Violão': 'fa-guitar',
      'Teclado': 'fa-keyboard',
      'Guitarra': 'fa-bolt',
      'Baixo': 'fa-music',
      'Bateria': 'fa-drum',
      'Sax': 'fa-saxophone',
      'Sonoplastia': 'fa-headphones',
      'Projeção': 'fa-video'
    };

    // Extrair funções únicas dos membros
    const uniqueRoles = Array.from(new Set(
      members
        .flatMap(m => m.role.split(',').map((r: string) => r.trim()))
        .filter((r: string) => r && r !== 'Sem função')
    )) as string[];

    // Criar KPIs para cada função encontrada
    const roleKPIs = uniqueRoles.map((role: string) => ({
      label: role,
      role: role,
      icon: roleIcons[role] || 'fa-user'
    }));

    // Adicionar KPI de Inativos
    return [...roleKPIs, { label: 'Inativos', role: 'Inativos', icon: 'fa-user-slash' }];
  };

  const kpis = generateKPIs();

  // Função para contar membros excluindo "Convidado"
  const countMembersByRole = (role: string) => {
    return members.filter(m => 
      m.role.includes(role) && 
      m.role.toLowerCase() !== 'convidado' && 
      m.status === 'confirmed'
    ).length;
  };

  // Contar membros ativos excluindo "Convidado"
  const activeMembersCount = members.filter(m => 
    m.status === 'confirmed' && 
    !m.role.toLowerCase().includes('convidado') &&
    !m.name.toLowerCase().includes('convidado')
  ).length;

  const maleCount = members.filter(m => 
    m.gender === 'M' && 
    m.status === 'confirmed' && 
    !m.role.toLowerCase().includes('convidado') &&
    !m.name.toLowerCase().includes('convidado')
  ).length;
  
  const femaleCount = members.filter(m => 
    m.gender === 'F' && 
    m.status === 'confirmed' && 
    !m.role.toLowerCase().includes('convidado') &&
    !m.name.toLowerCase().includes('convidado')
  ).length;

  // Gráfico de gênero
  useEffect(() => {
    if (currentView === 'team' && genderChartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      
      // Verificar se Chart está disponível globalmente
      if (typeof window !== 'undefined' && (window as any).Chart) {
        chartInstance.current = new (window as any).Chart(genderChartRef.current, {
          type: 'doughnut',
          data: {
            labels: ['M', 'F'],
            datasets: [{
              data: [maleCount, femaleCount],
              backgroundColor: [
                getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#1e3a8a', 
                '#f472b6'
              ],
              borderWidth: 4,
              borderColor: '#ffffff',
              hoverOffset: 8,
              hoverBorderWidth: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label === 'M' ? 'Masculino' : 'Feminino';
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return `${label}: ${context.parsed} (${percentage}%)`;
                  }
                }
              }
            },
            cutout: '65%',
            onClick: (event: any, elements: any) => {
              if (elements.length > 0) {
                const index = elements[0].index;
                const gender = index === 0 ? 'M' : 'F';
                setActiveFilter(`gender-${gender}`);
              }
            },
            onHover: (event: any, elements: any) => {
              if (genderChartRef.current) {
                genderChartRef.current.style.cursor = elements.length > 0 ? 'pointer' : 'default';
              }
            }
          }
        });
      }
    }
  }, [currentView, maleCount, femaleCount, members]);

  const handleFilter = (filter: string) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const filteredMembers = members.filter(m => {
    // Excluir "Convidado" de qualquer filtro
    if (m.role.toLowerCase().includes('convidado')) return false;
    
    if (!activeFilter) return true;
    if (activeFilter.startsWith('gender-')) return m.gender === activeFilter.split('-')[1];
    return m.role.toLowerCase().includes(activeFilter.toLowerCase());
  });

  // Separar membros ativos e inativos
  const activeMembers = filteredMembers.filter(m => m.status === 'confirmed');
  const inactiveMembers = filteredMembers.filter(m => m.status === 'absent');

  // Ordenar membros ativos por nome
  const sortedActiveMembers = sortMembersByRole(activeMembers);
  
  // Ordenar membros inativos por nome
  const sortedInactiveMembers = sortMembersByRole(inactiveMembers);

  // Combinar membros: apenas ativos no grid principal (excluindo Convidado)
  const finalMembers = [...sortedActiveMembers].filter(m => {
    const isGuestByRole = (m.role || '').toString().toLowerCase().includes('convidado');
    const isGuestByName = (m.name || '').toString().toLowerCase().includes('convidado');
    const isGuest = isGuestByRole || isGuestByName;
    return !isGuest;
  });

  const openScaleDetail = (eventId: string) => {
    // Mock function - implementar lógica real
  };

  // Handlers para eventos
  const handleEventClick = (evento: Evento) => {
    setSelectedEvento(evento);
    setShowAttendance(true);
  };

  const handleBackToEvents = () => {
    setShowAttendance(false);
    setSelectedEvento(null);
  };

  return (
    <div className="animate-fade-in">
      {currentView === 'attendance' ? (
        <div>
          {showAttendance && selectedEvento ? (
            <AttendanceView 
              evento={selectedEvento} 
              onBack={handleBackToEvents}
            />
          ) : (
            <EventsView 
              onEventClick={handleEventClick}
            />
          )}
        </div>
      ) : (
        <div>
          {/* KPIs */}
          <TeamKPIs 
            members={members}
            activeFilter={activeFilter}
            onFilter={handleFilter}
          />

          
          {/* Grid de Membros */}
          <TeamGrid 
            members={members}
            activeFilter={activeFilter}
            onMemberClick={setSelectedMember}
          />
        </div>
      )}

      {/* Modais */}
      <TeamModals
        selectedMember={selectedMember}
        editingMember={editingMember}
        viewingEvent={viewingEvent}
        onSelectedMemberChange={setSelectedMember}
        onEditingMemberChange={setEditingMember}
        onViewingEventChange={setViewingEvent}
        onMembersChange={setMembers}
      />
    </div>
  );
};

export default TeamView;
