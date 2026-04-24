import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { showError, showSuccess } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';
import { Funcao } from '../../types-supabase';
import { Member as AppMember } from '../../types';

interface TeamManagerProps {
  eventId: string;
  members: AppMember[];
  allRegisteredMembers: AppMember[];
  canManageTeam: boolean;
  ministerioId?: string | null;
  onTeamUpdated: () => void;
}

interface EditingMember {
  id: string;
  name: string;
  roleId: string;
}

const TeamManager: React.FC<TeamManagerProps> = ({
  eventId,
  members,
  allRegisteredMembers,
  canManageTeam,
  ministerioId,
  onTeamUpdated
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberFormData, setNewMemberFormData] = useState({ memberId: '', roleId: '' });
  const [editingMember, setEditingMember] = useState<EditingMember | null>(null);
  const [functions, setFunctions] = useState<Funcao[]>([]);

  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        let query = supabase.from('funcao').select('*').order('nome_funcao');

        if (ministerioId) {
          query = query.eq('ministerio_id', ministerioId);
        }

        const { data, error } = await query;

        if (error) {
          logger.error('Erro ao buscar funcoes:', error, 'database');
          return;
        }

        setFunctions(data || []);
      } catch (error) {
        logger.error('Erro ao carregar funcoes:', error, 'database');
      }
    };

    fetchFunctions();
  }, [ministerioId]);

  const sortedMembers = sortMembersByRole(members);

  const closeForm = () => {
    setShowAddMember(false);
    setEditingMember(null);
    setNewMemberFormData({ memberId: '', roleId: '' });
  };

  const handleDeleteMember = async (memberId: string, roleId?: number) => {
    if (!canManageTeam) {
      showError('Apenas lideres podem remover da escala.');
      return;
    }

    const confirmed = window.confirm('Tem certeza que deseja remover esta funcao da escala?');
    if (!confirmed) return;

    try {
      let query = supabase.from('escalas').delete().eq('id_culto', eventId).eq('id_membros', memberId);

      if (ministerioId) {
        query = query.eq('ministerio_id', ministerioId);
      }

      if (roleId) {
        query = query.eq('id_funcao', roleId);
      }

      const { error } = await query;
      if (error) throw error;

      showSuccess('Funcao removida da escala com sucesso!');
      onTeamUpdated();
    } catch (error) {
      logger.error('Erro ao remover membro da escala:', error, 'database');
      showError('Erro ao remover funcao da escala.');
    }
  };

  const startEditMember = (member: AppMember, currentRoleId: string) => {
    setEditingMember({
      id: member.id,
      name: member.name,
      roleId: currentRoleId
    });
    setNewMemberFormData({
      memberId: member.id,
      roleId: currentRoleId
    });
    setShowAddMember(true);
  };

  const handleEditMember = async (member: AppMember) => {
    if (!canManageTeam) {
      showError('Apenas lideres podem editar funcoes na escala.');
      return;
    }

    try {
      let query = supabase
        .from('escalas')
        .select('id_funcao, funcao (nome_funcao)')
        .eq('id_culto', eventId)
        .eq('id_membros', member.id);

      if (ministerioId) {
        query = query.eq('ministerio_id', ministerioId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao buscar funcoes do membro:', error, 'database');
        showError('Nao foi possivel carregar as funcoes do membro.');
        return;
      }

      if (!data || data.length === 0) {
        showError('Membro nao encontrado na escala.');
        return;
      }

      if (data.length === 1) {
        startEditMember(member, String(data[0].id_funcao));
        return;
      }

      const selectedRoleId = window.prompt(
        `Este membro possui mais de uma funcao. Digite o ID da funcao que deseja editar:\n${data
          .map((item: any) => `${item.id_funcao} - ${(item.funcao as any)?.nome_funcao || 'Funcao'}`)
          .join('\n')}`
      );

      if (!selectedRoleId) return;
      startEditMember(member, selectedRoleId);
    } catch (error) {
      logger.error('Erro ao abrir edicao de membro:', error, 'database');
      showError('Erro ao abrir a edicao da escala.');
    }
  };

  const handleUpdateMemberRole = async () => {
    if (!canManageTeam || !editingMember) return;
    if (!newMemberFormData.memberId || !newMemberFormData.roleId) return;

    try {
      let query = supabase
        .from('escalas')
        .update({ id_funcao: Number(newMemberFormData.roleId) })
        .eq('id_culto', eventId)
        .eq('id_membros', editingMember.id)
        .eq('id_funcao', Number(editingMember.roleId));

      if (ministerioId) {
        query = query.eq('ministerio_id', ministerioId);
      }

      const { error } = await query;
      if (error) throw error;

      showSuccess('Funcao do membro atualizada com sucesso!');
      closeForm();
      onTeamUpdated();
    } catch (error) {
      logger.error('Erro ao atualizar funcao do membro:', error, 'database');
      showError('Erro ao atualizar funcao do membro.');
    }
  };

  const handleAddMemberToScale = async () => {
    if (!canManageTeam) {
      showError('Apenas lideres podem escalar membros.');
      return;
    }

    if (!newMemberFormData.memberId || !newMemberFormData.roleId) {
      showError('Selecione um membro e uma funcao.');
      return;
    }

    try {
      const scaleData: Record<string, string | number> = {
        id_culto: eventId,
        id_membros: newMemberFormData.memberId,
        id_funcao: Number(newMemberFormData.roleId)
      };

      if (ministerioId) {
        scaleData.ministerio_id = ministerioId;
      }

      const { error } = await supabase.from('escalas').insert(scaleData);
      if (error) throw error;

      showSuccess('Membro escalado com sucesso!');
      closeForm();
      onTeamUpdated();
    } catch (error: any) {
      logger.error('Erro ao escalar membro:', error, 'database');
      showError(`Erro ao escalar membro: ${error?.message || 'erro desconhecido'}`);
    }
  };

  return (
    <div>
      {!showAddMember && canManageTeam && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              setShowAddMember(true);
              setNewMemberFormData({ memberId: '', roleId: '' });
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-brand/5 hover:text-brand"
          >
            <i className="fas fa-plus text-[8px]" /> Adicionar Membro
          </button>
        </div>
      )}

      {showAddMember && (
        <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/30">
          <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {editingMember ? 'Editar funcao do membro' : 'Adicionar membro'}
          </h4>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[8px] font-black uppercase tracking-widest text-slate-400">
                Membro
              </label>
              <select
                value={newMemberFormData.memberId}
                onChange={(e) => setNewMemberFormData({ ...newMemberFormData, memberId: e.target.value })}
                className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
                disabled={Boolean(editingMember)}
              >
                <option value="">Selecionar membro...</option>
                {allRegisteredMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[8px] font-black uppercase tracking-widest text-slate-400">
                Funcao
              </label>
              <select
                value={newMemberFormData.roleId}
                onChange={(e) => setNewMemberFormData({ ...newMemberFormData, roleId: e.target.value })}
                className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">Selecionar funcao...</option>
                {functions.map((funcao) => (
                  <option key={funcao.id} value={String(funcao.id)}>
                    {funcao.nome_funcao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={closeForm}
              className="flex-1 rounded-xl bg-slate-100 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={editingMember ? handleUpdateMemberRole : handleAddMemberToScale}
              className="flex-1 rounded-xl bg-brand py-2 text-[9px] font-black uppercase tracking-widest text-white shadow-md transition-colors hover:bg-brand/90"
            >
              {editingMember ? 'Atualizar' : 'Escalar'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {sortedMembers.map((member, index) => (
          <div key={`${member.id}-${(member as any).roleId || index}`} className="group relative">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all duration-300 hover:border-brand/20 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-gold shadow-lg">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="h-full w-full rounded-full object-cover"
                        onError={(event: any) => {
                          event.target.onerror = null;
                          event.target.src = `https://ui-avatars.com/api/?name=${member.name}&background=random`;
                        }}
                      />
                    ) : (
                      <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-xl text-white`} />
                    )}
                  </div>

                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-brand bg-white shadow-md dark:bg-slate-800">
                    <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-[8px] text-brand`} />
                  </div>
                </div>

                <h5 className="w-full truncate text-[11px] font-black uppercase text-slate-800 dark:text-white">
                  {member.name}
                </h5>
                <p className="w-full truncate text-[9px] font-bold uppercase text-slate-400">
                  {member.roles && member.roles.length > 1 ? member.roles.join(' / ') : member.role}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${member.status === 'confirmed' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-[7px] font-bold uppercase text-slate-500">
                    {member.status === 'confirmed' ? 'Presente' : 'Ausente'}
                  </span>
                </div>
              </div>

              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {canManageTeam && (
                  <button
                    onClick={() => handleDeleteMember(member.id, (member as any).roleId)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                    title="Remover funcao da escala"
                  >
                    <i className="fas fa-times text-[8px]" />
                  </button>
                )}
                {canManageTeam && (
                  <button
                    onClick={() => handleEditMember(member)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-400 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                    title="Editar funcao"
                  >
                    <i className="fas fa-edit text-[8px]" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedMembers.length === 0 && (
        <div className="py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <i className="fas fa-users-slash text-lg text-slate-400" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhum membro escalado</p>
          {canManageTeam && <p className="mt-2 text-[8px] text-slate-500">Clique em "Adicionar Membro" para escalar alguem</p>}
        </div>
      )}
    </div>
  );
};

export default TeamManager;
