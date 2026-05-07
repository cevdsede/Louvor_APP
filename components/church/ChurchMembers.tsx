import React, { useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { SupabaseMembro } from '../../types-supabase';
import { buildLocalAvatar } from '../../utils/avatar';
import { getDisplayName } from '../../utils/displayName';

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const canViewFullMember = (viewer: SupabaseMembro | null, target: SupabaseMembro | null) => {
  if (!viewer || !target) return false;
  if (viewer.id === target.id) return true;

  const profile = normalize(viewer.perfil);
  return profile.includes('admin') || profile.includes('pastor');
};

const ChurchMembers: React.FC = () => {
  const { currentMember } = useMinistryContext();
  const { data: membersRaw, loading } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<SupabaseMembro | null>(null);

  const viewer = currentMember as SupabaseMembro | null;
  const members = useMemo(() => {
    if (!viewer) return [];

    return (membersRaw || [])
      .filter((member) => member.ativo !== false)
      .filter((member) => getDisplayName(member).toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [membersRaw, searchTerm, viewer]);

  const showFullDetails = canViewFullMember(viewer, selectedMember);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Membros</p>
          <h1 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Cadastro da igreja
          </h1>
        </div>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar membro"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:col-span-2 lg:col-span-3">
              Nenhum membro disponivel para visualizacao.
            </div>
          ) : (
            members.map((member) => {
              const name = getDisplayName(member);
              const photo = typeof member.foto === 'string' && member.foto ? member.foto : buildLocalAvatar(name);
              const canSeeMemberDetails = canViewFullMember(viewer, member);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-4"
                >
                  <img src={photo} alt={name} className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-slate-900 dark:text-white sm:text-sm">{name}</p>
                    {canSeeMemberDetails && (
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-brand">
                        {member.posicao_igreja || 'Membro'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-[700] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={
                    typeof selectedMember.foto === 'string' && selectedMember.foto
                      ? selectedMember.foto
                      : buildLocalAvatar(getDisplayName(selectedMember))
                  }
                  alt={getDisplayName(selectedMember)}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {getDisplayName(selectedMember)}
                  </h2>
                  {showFullDetails && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                      {selectedMember.posicao_igreja || 'Membro'}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {showFullDetails && (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="E-mail" value={selectedMember.email} />
                <Info label="Celular" value={selectedMember.telefone_celular || selectedMember.telefone} />
                <Info label="Bairro" value={selectedMember.bairro} />
                <Info label="Estado civil" value={selectedMember.estado_civil} />
                <Info label="Profissao" value={selectedMember.profissao} />
                <Info label="Celula" value={selectedMember.qual_celula} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 font-bold text-slate-800 dark:text-slate-100">{value || '-'}</p>
  </div>
);

export default ChurchMembers;
