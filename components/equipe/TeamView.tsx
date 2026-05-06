import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
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
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { sortMembersByRole } from '../../utils/teamUtils';
import EventService, { Evento } from '../../services/EventService';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { getDisplayName } from '../../utils/displayName';
import { buildLocalAvatar } from '../../utils/avatar';
import { showError, showSuccess } from '../../utils/toast';

interface TeamViewProps {
  currentView: ViewType;
}

const TeamView: React.FC<TeamViewProps> = ({ currentView }) => {
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const { activeMinisterioId, canManageCurrentMinisterio } = useMinistryContext();
  const { data: allChurchMembers } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: membrosMinisteriosRaw } = useLocalStorageFirst<any>({ table: 'membros_ministerios' });

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

  const availableChurchMembers = useMemo(() => {
    const activeMemberIds = new Set(
      (membrosMinisteriosRaw || [])
        .filter((membership: any) => membership.ministerio_id === activeMinisterioId && membership.ativo !== false)
        .map((membership: any) => membership.membro_id)
    );

    return (allChurchMembers || [])
      .filter((member: any) => member.ativo !== false)
      .filter((member: any) => !activeMemberIds.has(member.id))
      .filter((member: any) => getDisplayName(member).toLowerCase().includes(memberSearch.toLowerCase()))
      .sort((a: any, b: any) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [activeMinisterioId, allChurchMembers, memberSearch, membrosMinisteriosRaw]);

  const handleAddMemberToMinisterio = async (member: any) => {
    if (!activeMinisterioId || !canManageCurrentMinisterio) {
      showError('Voce nao tem permissao para adicionar membros neste ministerio.');
      return;
    }

    setIsAddingMember(true);

    try {
      const existingMembership = (membrosMinisteriosRaw || []).find(
        (membership: any) => membership.membro_id === member.id && membership.ministerio_id === activeMinisterioId
      );

      if (existingMembership?.id) {
        const { error } = await supabase
          .from('membros_ministerios')
          .update({ ativo: true })
          .eq('id', existingMembership.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('membros_ministerios').insert({
          membro_id: member.id,
          ministerio_id: activeMinisterioId,
          ativo: true,
          principal: false,
          papel: null
        });
        if (error) throw error;
      }

      const protectedPositions = ['Pastor(a)', 'Secretario(a)', 'Tesoureiro(a)', 'Missionário'];
      if (!protectedPositions.includes(member.posicao_igreja || '')) {
        const { error } = await supabase
          .from('membros')
          .update({ posicao_igreja: 'Levita' })
          .eq('id', member.id);
        if (error) throw error;
      }

      await Promise.allSettled([
        LocalStorageFirstService.forceSync('membros'),
        LocalStorageFirstService.forceSync('membros_ministerios')
      ]);

      await fetchMembers();
      setIsAddMemberOpen(false);
      setMemberSearch('');
      showSuccess('Membro adicionado ao ministerio.');
    } catch (error) {
      console.error('Erro ao adicionar membro ao ministerio:', error);
      showError('Erro ao adicionar membro ao ministerio.');
    } finally {
      setIsAddingMember(false);
    }
  };

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
          {canManageCurrentMinisterio && activeMinisterioId && (
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition hover:brightness-110"
              >
                <i className="fas fa-user-plus" />
                Adicionar Membro
              </button>
            </div>
          )}

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

      {isAddMemberOpen && (
        <div className="fixed inset-0 z-[650] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand">Ministerio</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Adicionar membro cadastrado</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <input
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Buscar membro da igreja"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />

            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {availableChurchMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhum membro disponivel para adicionar.
                </div>
              ) : (
                availableChurchMembers.map((member: any) => {
                  const name = getDisplayName(member);
                  const photo = member.foto || buildLocalAvatar(name);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={isAddingMember}
                      onClick={() => handleAddMemberToMinisterio(member)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand/40 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <img src={photo} alt={name} className="h-12 w-12 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">{name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {member.posicao_igreja || 'Membro'}
                        </p>
                      </div>
                      <i className="fas fa-plus text-brand" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamView;
