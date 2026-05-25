import React, { useMemo, useState } from 'react';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { SupabaseMembro } from '../../types-supabase';
import { buildLocalAvatar } from '../../utils/avatar';
import { getDisplayName } from '../../utils/displayName';
import { sanitizeImageUrl } from '../../utils/imageUrl';
import { ImageCache } from '../ui/ImageCache';

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const canViewFullMember = (viewer: SupabaseMembro | null, target: SupabaseMembro | null) => {
  if (!viewer || !target) return false;
  if (viewer.id === target.id) return true;

  const profile = normalize(viewer.perfil);
  return profile.includes('admin') || profile.includes('pastor');
};

const withImageCacheBust = (src: string, member: SupabaseMembro) => {
  const cleanSrc = sanitizeImageUrl(src);
  if (!cleanSrc || cleanSrc.startsWith('data:') || cleanSrc.startsWith('blob:')) return cleanSrc;

  const version = member.created_at || member.id;
  if (!version) return cleanSrc;

  const separator = cleanSrc.includes('?') ? '&' : '?';
  return `${cleanSrc}${separator}v=${encodeURIComponent(version)}`;
};

const getPublicRole = (member: SupabaseMembro) => member.posicao_igreja || 'Membro';

const getPublicMinistry = (member: SupabaseMembro) => {
  if (normalize(member.posicao_igreja) !== 'levita') return '';
  return member.ministerio_levita || '';
};

const ChurchMembers: React.FC = () => {
  const { currentMember } = useMinistryContext();
  const { data: membersRaw, loading } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairro, setSelectedBairro] = useState('todos');
  const [selectedRole, setSelectedRole] = useState('todos');
  const [selectedMember, setSelectedMember] = useState<SupabaseMembro | null>(null);

  const viewer = currentMember as SupabaseMembro | null;
  const bairroOptions = useMemo(() => {
    const bairros = Array.from(
      new Set((membersRaw || []).map((member) => (member.bairro || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return ['todos', ...bairros];
  }, [membersRaw]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(
      new Set((membersRaw || []).map((member) => getPublicRole(member).trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return ['todos', ...roles];
  }, [membersRaw]);

  const members = useMemo(() => {
    if (!viewer) return [];

    return (membersRaw || [])
      .filter((member) => {
        const matchesSearch = getDisplayName(member).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBairro = selectedBairro === 'todos' || (member.bairro || '').trim() === selectedBairro;
        const matchesRole = selectedRole === 'todos' || getPublicRole(member).trim() === selectedRole;
        return matchesSearch && matchesBairro && matchesRole;
      })
      .sort((a, b) => getDisplayName(a).localeCompare(getDisplayName(b)));
  }, [membersRaw, searchTerm, selectedBairro, selectedRole, viewer]);

  const showFullDetails = canViewFullMember(viewer, selectedMember);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand">Membros</p>
          <h1 className="text-app mt-2 text-xl font-black tracking-tight sm:text-3xl">
            Cadastro da igreja
          </h1>
        </div>
        <div className="grid w-full gap-3 sm:max-w-3xl sm:grid-cols-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar membro"
            className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
          <select
            value={selectedBairro}
            onChange={(event) => setSelectedBairro(event.target.value)}
            className="app-input w-full rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <option value="todos">Todos os bairros</option>
            {bairroOptions.filter((option) => option !== 'todos').map((bairro) => (
              <option key={bairro} value={bairro}>
                {bairro}
              </option>
            ))}
          </select>
          <select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
            className="app-input w-full rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <option value="todos">Todos os perfis</option>
            {roleOptions.filter((option) => option !== 'todos').map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-app-surface border-app flex h-56 items-center justify-center rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-6">
          {members.length === 0 ? (
            <div className="bg-app-surface border-app text-app-muted col-span-2 rounded-2xl border border-dashed p-8 text-center text-sm font-bold lg:col-span-6">
              Nenhum membro disponivel para visualizacao.
            </div>
          ) : (
            members.map((member) => {
              const name = getDisplayName(member);
              const photo =
                typeof member.foto === 'string' && member.foto
                  ? withImageCacheBust(member.foto, member)
                  : buildLocalAvatar(name);
              const publicRole = getPublicRole(member);
              const publicMinistry = getPublicMinistry(member);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMember(member)}
                  className="bg-app-surface border-app flex min-w-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center transition hover:border-brand/40 hover:shadow-md sm:p-4"
                >
                  <ImageCache
                    src={photo}
                    fallbackSrc={buildLocalAvatar(name)}
                    alt={name}
                    className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
                    disableCompression
                  />
                  <div className="min-w-0 max-w-full">
                    <p className="text-app truncate text-xs font-black sm:text-sm">{name}</p>
                    <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-brand">
                      {publicRole}
                    </p>
                    {publicMinistry && (
                      <p className="mt-0.5 truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {publicMinistry}
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
            <div className="bg-app-surface border-app mx-auto max-w-2xl rounded-2xl border p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <ImageCache
                  src={
                    typeof selectedMember.foto === 'string' && selectedMember.foto
                      ? withImageCacheBust(selectedMember.foto, selectedMember)
                      : buildLocalAvatar(getDisplayName(selectedMember))
                  }
                  fallbackSrc={buildLocalAvatar(getDisplayName(selectedMember))}
                  alt={getDisplayName(selectedMember)}
                  className="h-16 w-16 rounded-full object-cover"
                  disableCompression
                />
                <div>
                  <h2 className="text-app text-xl font-black">
                    {getDisplayName(selectedMember)}
                  </h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                    {getPublicRole(selectedMember)}
                  </p>
                  {getPublicMinistry(selectedMember) && (
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {getPublicMinistry(selectedMember)}
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
  <div className="bg-app-surface-muted rounded-xl p-3">
    <p className="text-app-muted text-[9px] font-black uppercase tracking-widest">{label}</p>
    <p className="text-app mt-1 font-bold">{value || '-'}</p>
  </div>
);

export default ChurchMembers;
