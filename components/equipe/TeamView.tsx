import React, { useEffect, useRef } from 'react';
import { showSuccess, showError } from '../../utils/toast';
import { ViewType } from '../../types';
import { ChartInstance } from '../../types-supabase';
import AttendanceView from '../ui/AttendanceView';
import TeamKPIs from './TeamKPIs';
import TeamGrid from './TeamGrid';
import TeamModals from './TeamModals';
import MultiSelect from './MultiSelect';
import { useTeamData } from '../../hooks/useTeamData';
import { sortMembersByRole } from '../../utils/teamUtils';

interface TeamViewProps {
  currentView: ViewType;
}

const TeamView: React.FC<TeamViewProps> = ({ currentView }) => {
  const {
    selectedMember,
    editingMember,
    viewingEvent,
    activeFilter,
    members,
    loading,
    solicitacoes,
    funcoes,
    loadingAprovacoes,
    funcoesSelecionadas,
    genderChartRef,
    chartInstance,
    setSelectedMember,
    setEditingMember,
    setViewingEvent,
    setActiveFilter,
    setMembers,
    aprovarMembro,
    handleFuncoesChange,
    fetchMembers,
    fetchFuncoes,
    fetchSolicitacoes
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
    console.log('Opening scale detail for:', eventId);
  };

  return (
    <div className="animate-fade-in">
      {currentView === 'approvals' ? (
        <div className="space-y-6 pb-20">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Aprovações</h2>
              <div className="text-sm text-slate-500">
                {solicitacoes.length} solicitação{solicitacoes.length !== 1 ? 's' : ''} pendente{solicitacoes.length !== 1 ? 's' : ''}
              </div>
            </div>

            {loadingAprovacoes ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando solicitações...</p>
              </div>
            ) : solicitacoes.length === 0 ? (
              <div className="text-center py-20">
                <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {solicitacoes.map(solicitacao => (
                  <div key={solicitacao.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <img 
                          src={solicitacao.membros?.foto || `https://ui-avatars.com/api/?name=${solicitacao.membros?.nome}&background=random`} 
                          alt={solicitacao.membros?.nome}
                          className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <h3 className="font-black text-slate-800 dark:text-white">{solicitacao.membros?.nome}</h3>
                          <p className="text-sm text-slate-500">{solicitacao.membros?.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Selecionar funções:
                      </label>
                      <MultiSelect
                        options={funcoes.map(f => ({ id: f.id, label: f.nome_funcao }))}
                        value={funcoesSelecionadas[solicitacao.id] || []}
                        onChange={(value) => handleFuncoesChange(solicitacao.id, value)}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => aprovarMembro(solicitacao.user_id, funcoesSelecionadas[solicitacao.id] || [])}
                        className="flex-1 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand/600 transition-colors"
                      >
                        Aprovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
