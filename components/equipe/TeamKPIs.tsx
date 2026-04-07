import React from 'react';
import { Member } from '../../types';
import { roleOrder } from '../../utils/teamUtils';

interface TeamKPIsProps {
  members: Member[];
  activeFilter: string | null;
  onFilter: (filter: string) => void;
}

const TeamKPIs: React.FC<TeamKPIsProps> = ({ members, activeFilter, onFilter }) => {
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

  const inactiveMembers = members.filter(m => m.status === 'absent');

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 mb-8">
      {/* KPI Total */}
      <div className="flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-brand/20 bg-brand/5 text-brand">
        <div className="w-6 h-6 bg-brand/20 rounded-lg flex items-center justify-center mb-1">
          <i className="fas fa-users text-[9px]"></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{activeMembersCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">Total</span>
      </div>

      {/* KPI Masculino - clicável */}
      <button onClick={() => onFilter('gender-M')} className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${activeFilter === 'gender-M' ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:border-blue-400'}`}>
        <div className={`w-6 h-6 ${activeFilter === 'gender-M' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-800/50'} rounded-lg flex items-center justify-center mb-1`}>
          <i className={`fas fa-mars text-[9px] ${activeFilter === 'gender-M' ? 'text-white' : ''}`}></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{maleCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">Masculino</span>
      </button>

      {/* KPI Feminino - clicável */}
      <button onClick={() => onFilter('gender-F')} className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${activeFilter === 'gender-F' ? 'bg-pink-600 text-white border-pink-600 shadow-lg scale-105' : 'border border-pink-100 dark:border-pink-800/50 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:border-pink-400'}`}>
        <div className={`w-6 h-6 ${activeFilter === 'gender-F' ? 'bg-white/20' : 'bg-pink-100 dark:bg-pink-800/50'} rounded-lg flex items-center justify-center mb-1`}>
          <i className={`fas fa-venus text-[9px] ${activeFilter === 'gender-F' ? 'text-white' : ''}`}></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{femaleCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">Feminino</span>
      </button>

      {/* KPIs de funções */}
      {kpis.map(kpi => {
        const isInativos = kpi.role === 'Inativos';
        return isInativos ? (
          // KPI Inativos - não clicável
          <div key={kpi.role} className="flex flex-col items-center justify-center p-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400">
            <div className="w-6 h-6 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-1">
              <i className={`fas ${kpi.icon} text-[9px] text-slate-400`}></i>
            </div>
            <span className="text-xs font-black tracking-tighter leading-none">
              {inactiveMembers.length}
            </span>
            <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">{kpi.label}</span>
          </div>
        ) : (
          // KPIs de funções - clicáveis
          <button key={kpi.role} onClick={() => onFilter(kpi.role)} className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${activeFilter === kpi.role ? 'bg-brand text-white border-brand shadow-lg scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-brand/40'}`}>
            <div className={`w-6 h-6 ${activeFilter === kpi.role ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'} rounded-lg flex items-center justify-center mb-1`}>
              <i className={`fas ${kpi.icon} text-[9px] ${activeFilter === kpi.role ? 'text-white' : 'text-brand'}`}></i>
            </div>
            <span className="text-xs font-black tracking-tighter leading-none">
              {countMembersByRole(kpi.role)}
            </span>
            <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">{kpi.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TeamKPIs;
