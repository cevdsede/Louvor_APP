import React, { useMemo } from 'react';
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
  const filteredMembers = useMemo(() => members.filter((member) => {
    if (member.role.toLowerCase().includes('convidado')) return false;

    if (!activeFilter) return true;
    if (activeFilter.startsWith('gender-')) return member.gender === activeFilter.split('-')[1];
    return member.role.toLowerCase().includes(activeFilter.toLowerCase());
  }), [members, activeFilter]);

  const activeMembers = useMemo(() => filteredMembers.filter((member) => member.status === 'confirmed'), [filteredMembers]);
  const inactiveMembers = useMemo(() => filteredMembers.filter((member) => member.status === 'absent'), [filteredMembers]);
  const sortedActiveMembers = useMemo(() => sortMembersByRole([...activeMembers]), [activeMembers]);
  const sortedInactiveMembers = useMemo(() => sortMembersByRole([...inactiveMembers]), [inactiveMembers]);

  const finalMembers = useMemo(() => [...sortedActiveMembers].filter((member) => {
    const isGuestByRole = (member.role || '').toString().toLowerCase().includes('convidado');
    const isGuestByName = (member.name || '').toString().toLowerCase().includes('convidado');
    return !(isGuestByRole || isGuestByName);
  }), [sortedActiveMembers]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {finalMembers.map((member) => (
          <TeamMemberCard key={member.id} member={member} onMemberClick={onMemberClick} />
        ))}
      </div>

      {sortedInactiveMembers.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-[2rem] border border-red-100 dark:border-red-800/50 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-black text-red-600 dark:text-red-400 uppercase tracking-tighter">
                Membros Inativos
              </h2>
              <span className="text-sm text-red-500 dark:text-red-400 font-bold">
                {sortedInactiveMembers.length} membro{sortedInactiveMembers.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 dark:text-red-300">
              Lista sempre visivel
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {sortedInactiveMembers.map((member) => (
              <TeamMemberCard key={member.id} member={member} onMemberClick={onMemberClick} inactive />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamGrid;
