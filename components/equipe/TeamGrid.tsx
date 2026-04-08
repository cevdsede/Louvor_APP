import React, { useMemo, useState } from 'react';
import { Member } from '../../types';
import { sortMembersByRole } from '../../utils/teamUtils';
import { ImageCache } from '../ui/ImageCache';

interface TeamGridProps {
  members: Member[];
  activeFilter: string | null;
  onMemberClick: (member: Member) => void;
}

interface TeamMemberCardProps {
  member: Member;
  onMemberClick: (member: Member) => void;
  inactive?: boolean;
}

const TeamMemberCard = React.memo(({ member, onMemberClick, inactive = false }: TeamMemberCardProps) => {
  const fallbackSrc = `https://ui-avatars.com/api/?name=${member.name}&background=random`;

  return (
    <div
      onClick={() => onMemberClick(member)}
      className={`bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-sm border flex flex-col items-center text-center group cursor-pointer transition-all relative ${
        inactive
          ? 'border-red-200 dark:border-red-800 opacity-75'
          : 'border-slate-100 dark:border-slate-800 hover:shadow-xl hover:border-brand/30'
      }`}
    >
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${inactive ? 'bg-red-500' : 'bg-brand opacity-0 group-hover:opacity-100 transition-opacity'}`}></div>
      <ImageCache
        src={member.avatar || fallbackSrc}
        alt={member.name}
        className={`w-16 h-16 rounded-full mb-3 border-2 transition-all ${
          inactive
            ? 'border-red-200 dark:border-red-800 grayscale group-hover:grayscale-0'
            : 'border-slate-100 dark:border-slate-800 group-hover:border-brand/30 font-bold text-[10px] uppercase tracking-widest'
        }`}
        fallbackSrc={fallbackSrc}
        disableCompression={true}
      />
      <h3 className={`font-black text-sm mb-2 ${inactive ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white group-hover:text-brand transition-colors'}`}>
        {member.name}
      </h3>
      <span className={`text-[10px] uppercase tracking-wider ${inactive ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {member.role}
      </span>
    </div>
  );
});

const TeamGrid: React.FC<TeamGridProps> = ({ members, activeFilter, onMemberClick }) => {
  const [isInactiveExpanded, setIsInactiveExpanded] = useState(false);
  const filteredMembers = useMemo(() => members.filter(m => {
    // Excluir "Convidado" de qualquer filtro
    if (m.role.toLowerCase().includes('convidado')) return false;
    
    if (!activeFilter) return true;
    if (activeFilter.startsWith('gender-')) return m.gender === activeFilter.split('-')[1];
    return m.role.toLowerCase().includes(activeFilter.toLowerCase());
  }), [members, activeFilter]);

  // Separar membros ativos e inativos
  const activeMembers = useMemo(() => filteredMembers.filter(m => m.status === 'confirmed'), [filteredMembers]);
  const inactiveMembers = useMemo(() => filteredMembers.filter(m => m.status === 'absent'), [filteredMembers]);

  // Ordenar membros ativos por nome
  const sortedActiveMembers = useMemo(() => sortMembersByRole([...activeMembers]), [activeMembers]);
  
  // Ordenar membros inativos por nome
  const sortedInactiveMembers = useMemo(() => sortMembersByRole([...inactiveMembers]), [inactiveMembers]);

  // Combinar membros: apenas ativos no grid principal (excluindo Convidado)
  const finalMembers = useMemo(() => [...sortedActiveMembers].filter(m => {
    const isGuestByRole = (m.role || '').toString().toLowerCase().includes('convidado');
    const isGuestByName = (m.name || '').toString().toLowerCase().includes('convidado');
    const isGuest = isGuestByRole || isGuestByName;
    return !isGuest;
  }), [sortedActiveMembers]);

  return (
    <div className="space-y-8">
      {/* Grid de Membros Ativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {finalMembers.map((member, index) => (
          <TeamMemberCard key={member.id} member={member} onMemberClick={onMemberClick} />
        ))}
      </div>

      {/* Card de Membros Inativos */}
      {sortedInactiveMembers.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-[2rem] border border-red-100 dark:border-red-800/50 overflow-hidden transition-all">
          {/* Header Clicável */}
          <button 
            onClick={() => setIsInactiveExpanded(!isInactiveExpanded)}
            className="w-full flex items-center justify-between p-6 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">
                Membros Inativos
              </h2>
              <span className="text-sm text-red-500 dark:text-red-400 font-bold">
                {sortedInactiveMembers.length} membro{sortedInactiveMembers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className={`transform transition-transform duration-200 ${isInactiveExpanded ? 'rotate-180' : ''}`}>
              <i className="fas fa-chevron-down text-red-500 dark:text-red-400"></i>
            </div>
          </button>
          
          {/* Grid Colapsável */}
          <div className={`transition-all duration-300 ease-in-out ${isInactiveExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sortedInactiveMembers.map(member => (
                  <TeamMemberCard key={member.id} member={member} onMemberClick={onMemberClick} inactive />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamGrid;
