import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { logger } from '../../utils/logger';
import { roleOrder, sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';
import { Funcao } from '../../types-supabase';
import { Member as AppMember } from '../../types';

interface TeamManagerProps {
  eventId: string;
  members: AppMember[];
  allRegisteredMembers: AppMember[];
  isMember: boolean;
  onTeamUpdated: () => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({
  eventId,
  members,
  allRegisteredMembers,
  isMember,
  onTeamUpdated
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberFormData, setNewMemberFormData] = useState({ memberId: '', role: '' });
  const [editingMember, setEditingMember] = useState<{ id: string, currentRole: string } | null>(null);
  const [functions, setFunctions] = useState<Funcao[]>([]);

  // Buscar funções da tabela ao carregar o componente
  useEffect(() => {
    const fetchFunctions = async () => {
      try {
        const { data, error } = await supabase
          .from('funcao')
          .select('*')
          .order('nome_funcao');

        if (error) {
          logger.error('Erro ao buscar funções:', error, 'database');
          return;
        }

        setFunctions(data || []);
        logger.info('Funções carregadas:', { count: data?.length }, 'database');
      } catch (err) {
        logger.error('Erro ao carregar funções:', err, 'database');
      }
    };

    fetchFunctions();
  }, []);

  const sortedMembers = sortMembersByRole(members);

  const handleDeleteMember = async (memberId: string, roleId?: number) => {
    if (!isMember) {
      showError('Apenas membros podem remover da escala.');
      return;
    }

    // Criar modal de confirmação personalizado
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50';
    confirmModal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <i class="fas fa-exclamation-triangle text-red-500"></i>
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white">Confirmar Exclusão</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-300 mb-6">Tem certeza que deseja remover esta função do membro da escala?</p>
        <div class="flex gap-3">
          <button id="cancelDelete" class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Cancelar
          </button>
          <button id="confirmDelete" class="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors">
            Remover
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmModal);
    
    // Adicionar eventos aos botões
    const cancelBtn = confirmModal.querySelector('#cancelDelete');
    const confirmBtn = confirmModal.querySelector('#confirmDelete');
    
    const closeModal = () => {
      document.body.removeChild(confirmModal);
    };
    
    cancelBtn?.addEventListener('click', closeModal);
    
    confirmBtn?.addEventListener('click', async () => {
      try {
        closeModal();
        
        // Se roleId foi fornecido, remove apenas essa função específica
        // Senão, remove todas as funções do membro neste culto (comportamento anterior)
        let deleteQuery = supabase
          .from('escalas')
          .delete()
          .eq('id_culto', eventId)
          .eq('id_membros', memberId);
        
        if (roleId) {
          deleteQuery = deleteQuery.eq('id_funcao', roleId);
        }
        
        const { error } = await deleteQuery;

        if (error) throw error;
        
        showSuccess('Função removida da escala com sucesso!');
        onTeamUpdated();
      } catch (error) {
        logger.error('Error removing member from scale:', error, 'database');
        showError('Erro ao remover função da escala.');
      }
    });
    
    // Fechar ao clicar fora
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) {
        closeModal();
      }
    });
  };

  const handleEditMember = async (member: AppMember) => {
    if (!isMember) {
      showError('Apenas membros podem editar funções na escala.');
      return;
    }

    // Buscar todas as funções do membro na escala (pode ter múltiplas)
    const { data: scaleData, error: scaleError } = await supabase
      .from('escalas')
      .select('id_funcao, funcao (nome_funcao)')
      .eq('id_culto', eventId)
      .eq('id_membros', member.id);

    if (scaleError) {
      logger.error('Erro ao buscar funções do membro:', scaleError, 'database');
      showError('Não foi possível encontrar as funções atuais do membro.');
      return;
    }

    if (!scaleData || scaleData.length === 0) {
      showError('Membro não encontrado na escala.');
      return;
    }

    // Se tiver múltiplas funções, mostrar modal para escolher qual editar
    if (scaleData.length > 1) {
      // Criar modal de seleção de função
      const selectModal = document.createElement('div');
      selectModal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50';
      selectModal.innerHTML = `
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center">
              <i class="fas fa-user-edit text-brand"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800 dark:text-white">Editar Função</h3>
          </div>
          <p class="text-slate-600 dark:text-slate-300 mb-4">Este membro tem múltiplas funções. Selecione qual deseja editar:</p>
          <div class="space-y-2 mb-6">
            ${scaleData.map((scale: any, index: number) => `
              <button class="function-option w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-brand/5 transition-all" data-role-id="${scale.id_funcao}" data-role-name="${scale.funcao?.nome_funcao || 'Função'}">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-slate-800 dark:text-white">${scale.funcao?.nome_funcao || 'Função'}</span>
                  <i class="fas fa-chevron-right text-slate-400"></i>
                </div>
              </button>
            `).join('')}
          </div>
          <div class="flex gap-3">
            <button id="cancelSelect" class="flex-1 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(selectModal);
      
      // Adicionar eventos
      const cancelBtn = selectModal.querySelector('#cancelSelect');
      const functionOptions = selectModal.querySelectorAll('.function-option');
      
      const closeModal = () => {
        document.body.removeChild(selectModal);
      };
      
      cancelBtn?.addEventListener('click', closeModal);
      
      functionOptions.forEach(option => {
        option.addEventListener('click', () => {
          const roleId = parseInt(option.getAttribute('data-role-id') || '0');
          const roleName = option.getAttribute('data-role-name') || 'Função';
          closeModal();
          startEditMember(member, roleId, roleName);
        });
      });
      
      // Fechar ao clicar fora
      selectModal.addEventListener('click', (e) => {
        if (e.target === selectModal) {
          closeModal();
        }
      });
    } else {
      // Apenas uma função - editar diretamente
      const singleRole = scaleData[0];
      startEditMember(member, singleRole.id_funcao, (singleRole.funcao as any)?.nome_funcao || 'Função');
    }
  };

  const startEditMember = (member: AppMember, currentRoleId: number, currentRoleName: string) => {
    setEditingMember({
      ...member,
      roleId: currentRoleId,
      roleName: currentRoleName
    });
    setNewMemberFormData({
      memberId: member.id,
      role: currentRoleName
    });
    setShowAddMember(true);
  };

  const handleUpdateMemberRole = async () => {
    if (!isMember || !editingMember) return;
    
    if (!newMemberFormData.memberId || !newMemberFormData.role) return;

    try {
      // Buscar ID da nova função
      const { data: funcData } = await supabase
        .from('funcao')
        .select('id')
        .eq('nome_funcao', newMemberFormData.role)
        .single();

      if (!funcData) {
        showError('Função não encontrada.');
        return;
      }

      // Atualizar apenas a função específica do membro na escala
      // Usando o roleId original que foi armazenado no editingMember
      const { error } = await supabase
        .from('escalas')
        .update({ id_funcao: funcData.id })
        .eq('id_culto', eventId)
        .eq('id_membros', editingMember.id)
        .eq('id_funcao', (editingMember as any).roleId); // ← Chave: filtra pela função original

      if (error) throw error;

      showSuccess('Função do membro atualizada com sucesso!');
      setShowAddMember(false);
      setEditingMember(null);
      setNewMemberFormData({ memberId: '', role: '' });
      onTeamUpdated();
    } catch (error) {
      logger.error('Error updating member role:', error, 'database');
      showError('Erro ao atualizar função do membro.');
    }
  };

  const handleAddMemberToScale = async () => {
    if (!isMember) {
      showError('Apenas membros podem escalar outros membros.');
      return;
    }
    
    if (!newMemberFormData.memberId || !newMemberFormData.role) return;

    try {
      // Get Function ID
      const { data: funcData, error: funcError } = await supabase
        .from('funcao')
        .select('id')
        .eq('nome_funcao', newMemberFormData.role)
        .single();
        
      if (funcError || !funcData) {
        logger.error('Erro ao buscar função:', funcError, 'database');
        showError('Função inválida');
        return;
      }

      // Validate member ID
      const { data: memberData, error: memberError } = await supabase
        .from('membros')
        .select('id')
        .eq('id', newMemberFormData.memberId)
        .single();
        
      if (memberError || !memberData) {
        logger.error('Erro ao validar membro:', memberError, 'database');
        showError('Membro inválido');
        return;
      }

      const scaleData = {
        id_culto: eventId,
        id_membros: newMemberFormData.memberId, // Corrigido: id_membros
        id_funcao: funcData.id
      };

      logger.info('Enviando dados para escalas:', scaleData, 'database');
      
      // Verificar permissões antes de inserir
      const { data: testData, error: testError } = await supabase
        .from('escalas')
        .select('id')
        .limit(1);
        
      if (testError) {
        logger.error('Erro de permissão ao acessar escalas:', testError, 'database');
        throw new Error(`Sem permissão para acessar a tabela escalas: ${testError.message}`);
      }
      
      logger.info('Permissão verificada, inserindo dados...', 'database');
      
      const { data, error } = await supabase
        .from('escalas')
        .insert(scaleData)
        .select();
        
      logger.info('Resposta do Supabase:', { data, error }, 'database');
      
      if (error) {
        logger.error('Erro específico do Supabase:', error, 'database');
        throw error;
      }
      
      if (!data) {
        logger.info('Inserção bem-sucedida mas sem retorno de dados', 'database');
      }

      setShowAddMember(false);
      setNewMemberFormData({ memberId: '', role: '' });
      onTeamUpdated();
      
      showSuccess('Membro escalado com sucesso!');
    } catch (err) {
      logger.error('Error adding member to scale:', err, 'database');
      logger.error('Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      }, 'database');
      showError(`Erro ao escalar membro: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div>
      {/* Add Member Button */}
      {!showAddMember && isMember && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { 
              setShowAddMember(true); 
              setNewMemberFormData({ memberId: '', role: '' }); 
            }}
            className="text-[9px] font-black text-slate-400 hover:text-brand uppercase tracking-widest flex items-center gap-2 py-1 px-3 rounded-lg hover:bg-brand/5 transition-all"
          >
            <i className="fas fa-plus text-[8px]"></i> Adicionar Membro
          </button>
        </div>
      )}

      {/* Add Member Form */}
      {showAddMember && (
        <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            {editingMember ? 'EDITAR FUNÇÃO DO MEMBRO' : 'ADICIONAR MEMBRO'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Membro</label>
              <select
                value={newMemberFormData.memberId}
                onChange={(e) => setNewMemberFormData({ ...newMemberFormData, memberId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand appearance-none"
                disabled={!!editingMember} // Desabilita se estiver editando
              >
                <option value="">Selecionar Membro...</option>
                {allRegisteredMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Função</label>
              <select
                value={newMemberFormData.role}
                onChange={(e) => setNewMemberFormData({ ...newMemberFormData, role: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand appearance-none"
              >
                <option value="">Selecionar Função...</option>
                {functions.map(func => (
                  <option key={func.id} value={func.nome_funcao}>{func.nome_funcao}</option>
                ))}
              </select>
            </div>
          </div>
          {isMember && (
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => {
                  setShowAddMember(false);
                  setEditingMember(null);
                  setNewMemberFormData({ memberId: '', role: '' });
                }} 
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={editingMember ? handleUpdateMemberRole : handleAddMemberToScale}
                className="flex-1 py-2 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-brand/90 transition-colors"
              >
                {editingMember ? 'Atualizar' : 'Escalar'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Team Members Grid - Mostra cada função individualmente */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedMembers.map((member, index) => (
          <div key={`${member.id}-${(member as any).roleId || index}`} className="group relative">
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:border-brand/20 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-gold rounded-full flex items-center justify-center shadow-lg">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-white text-xl`}></i>
                    )}
                  </div>
                  {/* Ícone da função no canto inferior direito */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border-2 border-brand">
                    <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-brand text-[8px]`}></i>
                  </div>
                </div>
                <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate w-full">{member.name}</h5>
                <p className="text-[9px] font-bold text-slate-400 uppercase truncate w-full">
                  {member.roles && member.roles.length > 1 
                    ? member.roles.join(' / ') 
                    : member.role
                  }
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <div className={`w-2 h-2 rounded-full ${member.status === 'confirmed' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-[7px] font-bold text-slate-500 uppercase">
                    {member.status === 'confirmed' ? 'Presente' : 'Ausente'}
                  </span>
                  {member.roles && member.roles.length > 1 && (
                    <span className="text-[7px] font-bold text-brand ml-1">
                      +{member.roles.length - 1}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
                {isMember && (
                  <button 
                    onClick={() => handleDeleteMember(member.id, (member as any).roleId)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                    title="Remover função da escala"
                  >
                    <i className="fas fa-times text-[8px]"></i>
                  </button>
                )}
                <button 
                  onClick={() => handleEditMember(member)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  title="Editar função"
                >
                  <i className="fas fa-edit text-[8px]"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedMembers.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-users-slash text-slate-400 text-lg"></i>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum membro escalado</p>
          {isMember && (
            <p className="text-[8px] text-slate-500 mt-2">Clique em "Adicionar Membro" para escalar alguém</p>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamManager;
