import React from 'react';
import { Member } from '../../types';

interface TeamKPIsProps {
  members: Member[];
  activeFilter: string | null;
  onFilter: (filter: string) => void;
}

const TeamKPIs: React.FC<TeamKPIsProps> = ({ members, activeFilter, onFilter }) => {
  const isVisibleMember = (member: Member) =>
    !member.role.toLowerCase().includes('convidado') &&
    !member.name.toLowerCase().includes('convidado');

  const generateKPIs = () => {
    const roleIcons: Record<string, string> = {
      Ministro: 'fa-crown',
      Vocal: 'fa-microphone-lines',
      Violao: 'fa-guitar',
      Teclado: 'fa-keyboard',
      Guitarra: 'fa-bolt',
      Baixo: 'fa-music',
      Bateria: 'fa-drum',
      Sax: 'fa-saxophone',
      Sonoplastia: 'fa-headphones',
      Projecao: 'fa-video'
    };

    const uniqueRoles = Array.from(new Set(
      members
        .flatMap((member) => member.role.split(',').map((role: string) => role.trim()))
        .filter((role: string) => role && role !== 'Sem função')
    )) as string[];

    return uniqueRoles.map((role: string) => ({
      label: role,
      role,
      icon: roleIcons[role] || 'fa-user'
    }));
  };

  const kpis = generateKPIs();

  const countMembersByRole = (role: string) => {
    return members.filter((member) =>
      member.role.includes(role) &&
      isVisibleMember(member) &&
      member.status === 'confirmed'
    ).length;
  };

  const totalMembersCount = members.filter(isVisibleMember).length;
  const activeMembersCount = members.filter((member) => member.status === 'confirmed' && isVisibleMember(member)).length;
  const inactiveMembersCount = members.filter((member) => member.status === 'absent' && isVisibleMember(member)).length;

  const maleCount = members.filter((member) =>
    member.gender === 'M' &&
    member.status === 'confirmed' &&
    isVisibleMember(member)
  ).length;

  const femaleCount = members.filter((member) =>
    member.gender === 'F' &&
    member.status === 'confirmed' &&
    isVisibleMember(member)
  ).length;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 mb-8">
      <div className="flex flex-col items-center justify-center p-2 rounded-2xl border-2 border-brand/20 bg-brand/5 text-brand">
        <div className="w-6 h-6 bg-brand/20 rounded-lg flex items-center justify-center mb-1">
          <i className="fas fa-users text-[9px]"></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{totalMembersCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">Todos</span>
      </div>

      <div className="flex flex-col items-center justify-center p-2 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
        <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center mb-1">
          <i className="fas fa-user-check text-[9px]"></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{activeMembersCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-70">Ativos</span>
      </div>

      <div className="flex flex-col items-center justify-center p-2 rounded-2xl border border-red-100 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        <div className="w-6 h-6 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center mb-1">
          <i className="fas fa-user-slash text-[9px]"></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{inactiveMembersCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-70">Inativos</span>
      </div>

      <button onClick={() => onFilter('gender-M')} className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${activeFilter === 'gender-M' ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:border-blue-400'}`}>
        <div className={`w-6 h-6 ${activeFilter === 'gender-M' ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-800/50'} rounded-lg flex items-center justify-center mb-1`}>
          <i className={`fas fa-mars text-[9px] ${activeFilter === 'gender-M' ? 'text-white' : ''}`}></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{maleCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">Masculino</span>
      </button>

      <button onClick={() => onFilter('gender-F')} className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${activeFilter === 'gender-F' ? 'bg-pink-600 text-white border-pink-600 shadow-lg scale-105' : 'border border-pink-100 dark:border-pink-800/50 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 hover:border-pink-400'}`}>
        <div className={`w-6 h-6 ${activeFilter === 'gender-F' ? 'bg-white/20' : 'bg-pink-100 dark:bg-pink-800/50'} rounded-lg flex items-center justify-center mb-1`}>
          <i className={`fas fa-venus text-[9px] ${activeFilter === 'gender-F' ? 'text-white' : ''}`}></i>
        </div>
        <span className="text-sm font-black tracking-tighter leading-none">{femaleCount}</span>
        <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">Feminino</span>
      </button>

      {kpis.map((kpi) => (
        <button key={kpi.role} onClick={() => onFilter(kpi.role)} className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all ${activeFilter === kpi.role ? 'bg-brand text-white border-brand shadow-lg scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-brand/40'}`}>
          <div className={`w-6 h-6 ${activeFilter === kpi.role ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'} rounded-lg flex items-center justify-center mb-1`}>
            <i className={`fas ${kpi.icon} text-[9px] ${activeFilter === kpi.role ? 'text-white' : 'text-brand'}`}></i>
          </div>
          <span className="text-xs font-black tracking-tighter leading-none">
            {countMembersByRole(kpi.role)}
          </span>
          <span className="text-[5px] font-black uppercase tracking-widest mt-1 opacity-60">{kpi.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TeamKPIs;
