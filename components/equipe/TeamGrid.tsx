import React, { useMemo } from 'react';
import { Member } from '../../types';
import { sortMembersAlphabetically } from '../../utils/teamUtils';
import { ImageCache } from '../ui/ImageCache';

interface TeamGridProps {
  members: Member[];
  activeFilter: string | null;
  onMemberClick: (member: Member) => void;
}

interface TeamMemberCardProps {
  member: Member;
  onMemberClick: (member: Member) => void;
}

const TeamMemberCard = React.memo(({ member, onMemberClick }: TeamMemberCardProps) => {
  const fallbackSrc = `https://ui-avatars.com/api/?name=${member.name}&background=random`;

  return (
    <div
      onClick={() => onMemberClick(member)}
      className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group cursor-pointer transition-all relative hover:shadow-xl hover:border-brand/30"
    >
      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <ImageCache
        src={member.avatar || fallbackSrc}
        alt={member.name}
        className="w-16 h-16 rounded-full mb-3 border-2 border-slate-100 dark:border-slate-800 transition-all group-hover:border-brand/30 font-bold text-[10px] uppercase tracking-widest"
        fallbackSrc={fallbackSrc}
        disableCompression={true}
      />
      <h3 className="font-black text-sm mb-2 text-slate-800 dark:text-white group-hover:text-brand transition-colors">
        {member.name}
      </h3>
      <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
  const sortedActiveMembers = useMemo(() => sortMembersAlphabetically([...activeMembers]), [activeMembers]);

  const finalMembers = useMemo(() => [...sortedActiveMembers].filter((member) => {
    const isGuestByRole = (member.role || '').toString().toLowerCase().includes('convidado');
    const isGuestByName = (member.name || '').toString().toLowerCase().includes('convidado');
    return !(isGuestByRole || isGuestByName);
  }), [sortedActiveMembers]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {finalMembers.map((member) => (
        <TeamMemberCard key={member.id} member={member} onMemberClick={onMemberClick} />
      ))}
    </div>
  );
};

export default TeamGrid;
