import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import LocalStorageStatus from './LocalStorageStatus';
import { clearImageCache, getImageCacheSize, cleanupOrphanedImages } from '../../utils/teamUtils';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { showSuccess, showError } from '../../utils/toast';
import MultiSelect from '../equipe/MultiSelect';
import { ImageCache } from '../ui/ImageCache';
import { compressImageFile } from '../../utils/imageCompression';
import { getMemberMemberships as getMemberMinistryMemberships } from '../../utils/memberMinistry';
import logger from '../../utils/logger';
import {
  ChartInstance,
  Funcao,
  SupabaseMinisterio,
  SupabaseMembroMinisterio,
  SupabaseMembroFuncao
} from '../../types-supabase';
import ApprovalsPanel from './ApprovalsPanel';
import MinisterioManager from './MinisterioManager';
import NomeCultosManager from './NomeCultosManager';
import TemasManager from './TemasManager';

type ToolsSubView = 'tools-admin' | 'tools-users' | 'tools-approvals' | 'tools-performance';

interface ToolsViewProps {
  subView: ToolsSubView;
}

interface EditingMemberState {
  id: string;
  nome?: string;
  display_name?: string;
  nome_planilha?: string;
  email?: string;
  telefone?: string;
  data_nasc?: string;
  genero?: 'Homem' | 'Mulher';
  ativo?: boolean;
  perfil?: string;
  foto?: string;
  ministerioIds: string[];
  funcaoIds: string[];
  ministerioStatusById: Record<string, boolean>;
  principalMinisterioId: string | null;
}

const uniqueIds = (ids: string[]) => [...new Set(ids.filter(Boolean))];
const NO_MINISTERIO_FILTER = '__without_ministerio__';
const normalizeSearchValue = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const ToolsView: React.FC<ToolsViewProps> = ({ subView }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [showCacheManager, setShowCacheManager] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [recentErrors, setRecentErrors] = useState(() => logger.getRecentErrors());
  const [editingMember, setEditingMember] = useState<EditingMemberState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [ministerios, setMinisterios] = useState<SupabaseMinisterio[]>([]);
  const [adminSubView, setAdminSubView] = useState<'members' | 'nome-cultos' | 'temas'>('members');
  const [membrosMinisterios, setMembrosMinisterios] = useState<SupabaseMembroMinisterio[]>([]);
  const [membrosFuncoes, setMembrosFuncoes] = useState<SupabaseMembroFuncao[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userMinisterioFilter, setUserMinisterioFilter] = useState('all');
  const [userPerfilFilter, setUserPerfilFilter] = useState('all');

  const [funcoes, setFuncoes] = useState<Funcao[]>([]);

  // Funções para os botões de acesso rápido
  const hydrateUserManagementState = () => {
    const membersData = LocalStorageFirstService.get<any>('membros');
    const ministeriosData = LocalStorageFirstService.get<SupabaseMinisterio>('ministerios');
    const membrosMinisteriosData = LocalStorageFirstService.get<SupabaseMembroMinisterio>('membros_ministerios');
    const membrosFuncoesData = LocalStorageFirstService.get<SupabaseMembroFuncao>('membros_funcoes');
    const funcoesData = LocalStorageFirstService.get<Funcao>('funcao');

    setData(Array.isArray(membersData) ? membersData : []);
    setMinisterios(Array.isArray(ministeriosData) ? ministeriosData : []);
    setMembrosMinisterios(Array.isArray(membrosMinisteriosData) ? membrosMinisteriosData : []);
    setMembrosFuncoes(Array.isArray(membrosFuncoesData) ? membrosFuncoesData : []);
    setFuncoes(
      Array.isArray(funcoesData)
        ? funcoesData.map((funcao) => ({
            ...funcao,
            id: String(funcao.id),
            ministerio_id: funcao.ministerio_id
          }))
        : []
    );
  };

  const syncUserManagementState = async () => {
    if (!navigator.onLine) {
      hydrateUserManagementState();
      return;
    }

    await Promise.allSettled([
      LocalStorageFirstService.forceSync('membros'),
      LocalStorageFirstService.forceSync('ministerios'),
      LocalStorageFirstService.forceSync('membros_ministerios'),
      LocalStorageFirstService.forceSync('membros_funcoes'),
      LocalStorageFirstService.forceSync('funcao')
    ]);

    hydrateUserManagementState();
  };

  const getMemberMemberships = (memberId: string) =>
    getMemberMinistryMemberships(membrosMinisterios, memberId, { includeInactive: true });

  const getMemberMinisterios = (memberId: string) =>
    getMemberMemberships(memberId)
      .map((membership) => {
        const ministerio = ministerios.find((item) => item.id === membership.ministerio_id);

        if (!ministerio) {
          return null;
        }

        return {
          ...ministerio,
          membership
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.membership?.principal && !b.membership?.principal) return -1;
        if (!a.membership?.principal && b.membership?.principal) return 1;
        if (a.membership?.ativo !== false && b.membership?.ativo === false) return -1;
        if (a.membership?.ativo === false && b.membership?.ativo !== false) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
      });

  const getAvailableFuncoesForMinisterios = (ministerioIds: string[]) =>
    funcoes
      .filter((funcao) => !funcao.ministerio_id || ministerioIds.includes(funcao.ministerio_id))
      .sort((a, b) => {
        const ministerioA = ministerios.find((item) => item.id === a.ministerio_id)?.nome || '';
        const ministerioB = ministerios.find((item) => item.id === b.ministerio_id)?.nome || '';

        const ministerioCompare = ministerioA.localeCompare(ministerioB, 'pt-BR');
        if (ministerioCompare !== 0) {
          return ministerioCompare;
        }

        return (a.nome_funcao || '').localeCompare(b.nome_funcao || '', 'pt-BR');
      });

  const getAllowedFuncaoIds = (ministerioIds: string[]) =>
    new Set(getAvailableFuncoesForMinisterios(ministerioIds).map((funcao) => String(funcao.id)));

  const handleEditMember = (member: any) => {
    const memberships = getMemberMemberships(member.id);
    const ministerioIds = uniqueIds(memberships.map((membership) => membership.ministerio_id));
    const allowedFuncaoIds = getAllowedFuncaoIds(ministerioIds);
    const funcaoIds = uniqueIds(
      membrosFuncoes
        .filter(
          (membership) =>
            membership.id_membro === member.id && allowedFuncaoIds.has(String(membership.id_funcao))
        )
        .map((membership) => String(membership.id_funcao))
    );
    const ministerioStatusById = memberships.reduce<Record<string, boolean>>((accumulator, membership) => {
      accumulator[membership.ministerio_id] = membership.ativo !== false;
      return accumulator;
    }, {});
    const activeMinisterioIds = ministerioIds.filter((ministerioId) => ministerioStatusById[ministerioId] !== false);
    const principalMinisterioId =
      memberships.find((membership) => membership.principal && membership.ativo !== false)?.ministerio_id ||
      activeMinisterioIds[0] ||
      null;

    setEditingMember({
      ...member,
      genero: member.genero || 'Homem',
      ministerioIds,
      funcaoIds,
      ministerioStatusById,
      principalMinisterioId
    });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!editingMember) return;
    
    setUploading(true);
    try {
      const compressedFile = await compressImageFile(file, { maxWidth: 640, quality: 0.74 });
      const fileExt = compressedFile.name.split('.').pop() || 'jpg';
      const fileName = `${editingMember.id}_${Date.now()}.${fileExt}`;
      const filePath = `members/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, {
          contentType: compressedFile.type || 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar o membro com a nova foto
      const updatedMember = { ...editingMember, foto: publicUrl };
      setEditingMember(updatedMember);
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleProfileChange = async (memberId: string, newProfile: string) => {
    try {
      // Atualizar usando LocalStorageFirstService
      LocalStorageFirstService.update('membros', memberId, { perfil: newProfile });
      
      // Recarregar dados
      hydrateUserManagementState();
      
      setEditingProfile(null); // Fechar o dropdown
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  const handleEditingMemberMinisteriosChange = (ministerioIds: string[]) => {
    if (!editingMember) return;

    const nextMinisterioIds = uniqueIds(ministerioIds);
    const allowedFuncaoIds = getAllowedFuncaoIds(nextMinisterioIds);
    const nextStatusById = nextMinisterioIds.reduce<Record<string, boolean>>((accumulator, ministerioId) => {
      accumulator[ministerioId] = editingMember.ministerioStatusById?.[ministerioId] !== false;
      return accumulator;
    }, {});
    const nextActiveMinisterioIds = nextMinisterioIds.filter((ministerioId) => nextStatusById[ministerioId] !== false);
    const nextPrincipalId =
      editingMember.principalMinisterioId && nextActiveMinisterioIds.includes(editingMember.principalMinisterioId)
        ? editingMember.principalMinisterioId
        : nextActiveMinisterioIds[0] || null;

    setEditingMember({
      ...editingMember,
      ministerioIds: nextMinisterioIds,
      funcaoIds: (editingMember.funcaoIds || []).filter((funcaoId) => allowedFuncaoIds.has(funcaoId)),
      ministerioStatusById: nextStatusById,
      principalMinisterioId: nextPrincipalId
    });
  };

  const handleEditingMemberMinisterioStatusChange = (ministerioId: string, ativo: boolean) => {
    if (!editingMember) return;

    const nextStatusById = {
      ...editingMember.ministerioStatusById,
      [ministerioId]: ativo
    };
    const nextActiveMinisterioIds = (editingMember.ministerioIds || []).filter(
      (itemId) => nextStatusById[itemId] !== false
    );
    const nextPrincipalId =
      editingMember.principalMinisterioId && nextActiveMinisterioIds.includes(editingMember.principalMinisterioId)
        ? editingMember.principalMinisterioId
        : nextActiveMinisterioIds[0] || null;

    setEditingMember({
      ...editingMember,
      ministerioStatusById: nextStatusById,
      principalMinisterioId: nextPrincipalId
    });
  };

  const handleSaveMember = async (updatedMember: EditingMemberState) => {
    try {
      setSavingMember(true);

      const desiredMinisterioIds = uniqueIds(updatedMember.ministerioIds || []);
      const ministerioStatusById = desiredMinisterioIds.reduce<Record<string, boolean>>((accumulator, ministerioId) => {
        accumulator[ministerioId] = updatedMember.ministerioStatusById?.[ministerioId] !== false;
        return accumulator;
      }, {});
      const activeMinisterioIds = desiredMinisterioIds.filter(
        (ministerioId) => ministerioStatusById[ministerioId] !== false
      );
      const principalMinisterioId =
        updatedMember.principalMinisterioId && activeMinisterioIds.includes(updatedMember.principalMinisterioId)
          ? updatedMember.principalMinisterioId
          : activeMinisterioIds[0] || null;
      const allowedFuncaoIds = getAllowedFuncaoIds(desiredMinisterioIds);
      const desiredFuncaoIds = uniqueIds((updatedMember.funcaoIds || []).filter((funcaoId) => allowedFuncaoIds.has(funcaoId)));

      const currentMemberships = membrosMinisterios.filter(
        (membership) => membership.membro_id === updatedMember.id
      );
      const currentMemberFuncoes = membrosFuncoes.filter((membership) => membership.id_membro === updatedMember.id);

      const { error: memberError } = await supabase
        .from('membros')
        .update({
          nome: updatedMember.nome,
          display_name: updatedMember.display_name,
          nome_planilha: updatedMember.nome_planilha,
          email: updatedMember.email,
          telefone: updatedMember.telefone,
          data_nasc: updatedMember.data_nasc,
          genero: updatedMember.genero || 'Homem',
          ativo: updatedMember.ativo,
          perfil: updatedMember.perfil,
          foto: updatedMember.foto
        })
        .eq('id', updatedMember.id);

      if (memberError) throw memberError;

      const currentMembershipIds = currentMemberships.map((membership) => membership.id).filter(Boolean);

      if (currentMembershipIds.length > 0) {
        const { error: resetPrincipalError } = await supabase
          .from('membros_ministerios')
          .update({ principal: false })
          .in('id', currentMembershipIds);

        if (resetPrincipalError) throw resetPrincipalError;
      }

      const membershipsToDelete = currentMemberships.filter(
        (membership) => !desiredMinisterioIds.includes(membership.ministerio_id)
      );

      if (membershipsToDelete.length > 0) {
        const membershipIds = membershipsToDelete.map((membership) => membership.id).filter(Boolean);

        if (membershipIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('membros_ministerios')
            .delete()
            .in('id', membershipIds);

          if (deleteError) throw deleteError;
        }
      }

      for (const ministerioId of desiredMinisterioIds) {
        const existingMembership = currentMemberships.find(
          (membership) => membership.ministerio_id === ministerioId
        );
        const payload = {
          membro_id: updatedMember.id,
          ministerio_id: ministerioId,
          principal: ministerioId === principalMinisterioId,
          ativo: ministerioStatusById[ministerioId] !== false
        };

        if (existingMembership?.id) {
          const { error: updateMembershipError } = await supabase
            .from('membros_ministerios')
            .update(payload)
            .eq('id', existingMembership.id);

          if (updateMembershipError) throw updateMembershipError;
        } else {
          const { error: insertMembershipError } = await supabase
            .from('membros_ministerios')
            .insert(payload);

          if (insertMembershipError) throw insertMembershipError;
        }
      }

      const funcoesToDelete = currentMemberFuncoes.filter(
        (membership) => !desiredFuncaoIds.includes(String(membership.id_funcao))
      );

      if (funcoesToDelete.length > 0) {
        const memberFuncaoIds = funcoesToDelete.map((membership) => membership.id).filter(Boolean);

        if (memberFuncaoIds.length > 0) {
          const { error: deleteFuncoesError } = await supabase
            .from('membros_funcoes')
            .delete()
            .in('id', memberFuncaoIds);

          if (deleteFuncoesError) throw deleteFuncoesError;
        }
      }

      const currentFuncaoIds = new Set(currentMemberFuncoes.map((membership) => String(membership.id_funcao)));
      const funcoesToInsert = desiredFuncaoIds.filter((funcaoId) => !currentFuncaoIds.has(funcaoId));

      if (funcoesToInsert.length > 0) {
        const { error: insertFuncoesError } = await supabase
          .from('membros_funcoes')
          .insert(
            funcoesToInsert.map((funcaoId) => ({
              id_membro: updatedMember.id,
              id_funcao: Number(funcaoId)
            }))
          );

        if (insertFuncoesError) throw insertFuncoesError;
      }

      await syncUserManagementState();

      setEditingMember(null);
      showSuccess('Membro atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      if ((error as any)?.code === '23505') {
        showError('Nao foi possivel salvar os ministerios porque houve conflito no ministerio principal. Tente novamente.');
      } else {
        showError('Nao foi possivel atualizar o membro.');
      }
    } finally {
      setSavingMember(false);
    }
  };

  const profileOptions = [
    { value: 'User', label: 'User' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Lider', label: 'Lider' },
    { value: 'Advanced', label: 'Advanced' }
  ];

  const editingMemberFuncoesOptions = editingMember
    ? getAvailableFuncoesForMinisterios(editingMember.ministerioIds || []).map((funcao) => {
        const ministerioNome = ministerios.find((item) => item.id === funcao.ministerio_id)?.nome;

        return {
          id: String(funcao.id),
          label: ministerioNome ? `${funcao.nome_funcao} - ${ministerioNome}` : funcao.nome_funcao
        };
      })
    : [];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        switch (subView) {
          case 'tools-admin':
            setData({
              systemStatus: 'online',
              lastBackup: '2024-02-06 14:30',
              databaseSize: '2.4 GB',
              activeUsers: 12
            });
            break;
          case 'tools-users':
            hydrateUserManagementState();
            syncUserManagementState().catch(() => {});
            break;
          case 'tools-approvals':
            setData(null);
            break;
          case 'tools-performance':
            setData({
              // Dados administrativos
              systemStatus: 'online',
              lastBackup: '2024-02-06 14:30',
              databaseSize: '2.4 GB',
              activeUsers: 12,
              // Dados de desempenho
              totalRequests: 15420,
              avgResponseTime: '120ms',
              errorRate: '0.2%',
              uptime: '99.9%'
            });
            break;
        }
      } catch (error) {
        console.error('Error loading tools data:', error);
        // Fallback para dados mockados em caso de erro
        if (subView === 'tools-users') {
          setData([
            { id: 1, nome: 'João Silva', email: 'joao@exemplo.com', ativo: true, perfil: 'Administrador' },
            { id: 2, nome: 'Maria Santos', email: 'maria@exemplo.com', ativo: true, perfil: 'Membro' },
            { id: 3, nome: 'Pedro Costa', email: 'pedro@exemplo.com', ativo: false, perfil: 'Membro' },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [subView]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[9px]">Carregando...</p>
      </div>
    );
  }

  if (subView === 'tools-approvals') {
    return <ApprovalsPanel />;
  }

  const adminCards = [
    {
      title: 'Status do Sistema',
      value: data?.systemStatus || 'Carregando...',
      detail: 'Servicos essenciais respondendo',
      icon: 'fas fa-server',
      iconWrapClass: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      metaType: 'pulse' as const,
      metaClass: 'w-3 h-3 bg-emerald-500 rounded-full animate-pulse'
    },
    {
      title: 'Tamanho do BD',
      value: data?.databaseSize || 'Carregando...',
      detail: 'Monitoramento do armazenamento',
      icon: 'fas fa-database',
      iconWrapClass: 'bg-blue-100 dark:bg-blue-900/30',
      iconClass: 'text-blue-600 dark:text-blue-400',
      metaType: 'icon' as const,
      metaIcon: 'fas fa-chart-line',
      metaClass: 'text-blue-500'
    },
    {
      title: 'Usuários Ativos',
      value: data?.activeUsers || 'Carregando...',
      detail: 'Base pronta para gerenciamento',
      icon: 'fas fa-users',
      iconWrapClass: 'bg-purple-100 dark:bg-purple-900/30',
      iconClass: 'text-purple-600 dark:text-purple-400',
      metaType: 'icon' as const,
      metaIcon: 'fas fa-user-check',
      metaClass: 'text-purple-500'
    },
    {
      title: 'Último Backup',
      value: data?.lastBackup || 'Carregando...',
      detail: 'Historico recente protegido',
      icon: 'fas fa-clock',
      iconWrapClass: 'bg-amber-100 dark:bg-amber-900/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      metaType: 'icon' as const,
      metaIcon: 'fas fa-history',
      metaClass: 'text-amber-500'
    }
  ];
  const performanceKpis = [
    {
      title: 'Total de Requisicoes',
      value: data?.totalRequests?.toLocaleString() || '0',
      detail: 'Volume monitorado',
      icon: 'fas fa-chart-line',
      iconWrapClass: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      trendIcon: 'fas fa-arrow-up',
      trendClass: 'text-emerald-500'
    },
    {
      title: 'Tempo Medio',
      value: data?.avgResponseTime || '0ms',
      detail: 'Resposta media',
      icon: 'fas fa-tachometer-alt',
      iconWrapClass: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      trendIcon: 'fas fa-wave-square',
      trendClass: 'text-emerald-500'
    },
    {
      title: 'Taxa de Erro',
      value: data?.errorRate || '0%',
      detail: 'Saude das rotas',
      icon: 'fas fa-exclamation-triangle',
      iconWrapClass: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      trendIcon: 'fas fa-minus',
      trendClass: 'text-amber-500'
    },
    {
      title: 'Uptime',
      value: data?.uptime || '99.9%',
      detail: 'Disponibilidade',
      icon: 'fas fa-heartbeat',
      iconWrapClass: 'bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
      trendIcon: 'fas fa-arrow-up',
      trendClass: 'text-emerald-500'
    }
  ];

  const membersData = Array.isArray(data) ? data : [];
  const ministerioFilterOptions = [...ministerios].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  );
  const membersTableData = membersData.map((member: any) => {
    const memberMinisterios = getMemberMinisterios(member.id);
    const principalMinisterioId =
      getMemberMemberships(member.id).find((membership) => membership.principal)?.ministerio_id || null;

    return {
      member,
      memberMinisterios,
      principalMinisterioId
    };
  });
  const normalizedUserSearchTerm = normalizeSearchValue(userSearchTerm.trim());
  const filteredMembersTableData = membersTableData
    .filter(({ member, memberMinisterios }) => {
      const matchesSearch =
        !normalizedUserSearchTerm ||
        normalizeSearchValue(
          [
            member.nome,
            member.email,
            member.perfil,
            ...memberMinisterios.map((ministerio: any) => ministerio.nome)
          ].join(' ')
        ).includes(normalizedUserSearchTerm);
      const matchesMinisterio =
        userMinisterioFilter === 'all'
          ? true
          : userMinisterioFilter === NO_MINISTERIO_FILTER
            ? memberMinisterios.length === 0
            : memberMinisterios.some((ministerio: any) => ministerio.id === userMinisterioFilter);
      const matchesPerfil = userPerfilFilter === 'all' ? true : (member.perfil || 'User') === userPerfilFilter;

      return matchesSearch && matchesMinisterio && matchesPerfil;
    })
    .sort((firstEntry, secondEntry) =>
      (firstEntry.member.nome || '').localeCompare(secondEntry.member.nome || '', 'pt-BR', {
        sensitivity: 'base'
      })
    );
  const activeUsersCount = membersData.filter((member: any) => member.ativo).length;
  const usersWithoutMinisterio = membersTableData.filter(({ memberMinisterios }) => memberMinisterios.length === 0).length;
  const usersInMultipleMinisterios = membersTableData.filter(({ memberMinisterios }) => memberMinisterios.length > 1).length;

  const renderContent = () => {
    switch (subView as ToolsSubView) {
      case 'tools-admin':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Painel Administrativo</h2>
            
            {/* Navegação entre sub-views de administração */}
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
              {/* Desktop: Navegação horizontal completa */}
              <div className="hidden md:flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setAdminSubView('members')}
                  className={`px-4 py-2 font-black text-sm uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${
                    adminSubView === 'members'
                      ? 'text-brand border-brand'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <i className="fas fa-users mr-2"></i> Membros
                </button>
                <button
                  onClick={() => setAdminSubView('nome-cultos')}
                  className={`px-4 py-2 font-black text-sm uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${
                    adminSubView === 'nome-cultos'
                      ? 'text-brand border-brand'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <i className="fas fa-church mr-2"></i> Nomes de Cultos
                </button>
                <button
                  onClick={() => setAdminSubView('temas')}
                  className={`px-4 py-2 font-black text-sm uppercase tracking-widest transition-colors border-b-2 whitespace-nowrap ${
                    adminSubView === 'temas'
                      ? 'text-brand border-brand'
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <i className="fas fa-music mr-2"></i> Temas
                </button>
              </div>

              {/* Mobile: Navegação vertical compacta */}
              <div className="md:hidden">
                <select
                  value={adminSubView}
                  onChange={(e) => setAdminSubView(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm focus:ring-2 focus:ring-brand focus:border-transparent"
                >
                  <option value="members">
                    👥 Membros
                  </option>
                  <option value="nome-cultos">
                    ⛪ Nomes de Cultos
                  </option>
                  <option value="temas">
                    🎵 Temas
                  </option>
                </select>
              </div>
            </div>

            {/* Renderizar o componente correspondente */}
            {adminSubView === 'members' && <MinisterioManager />}
            {adminSubView === 'nome-cultos' && <NomeCultosManager />}
            {adminSubView === 'temas' && <TemasManager />}
          </div>
        );

      case 'tools-users':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Gerenciamento de Usuários</h2>
              <button
                onClick={() => syncUserManagementState().catch(() => showError('Nao foi possivel atualizar a lista.'))}
                className="px-4 py-2 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
              >
                <i className="fas fa-rotate mr-2"></i> Atualizar Lista
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Usuarios Ativos</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{activeUsersCount}</p>
                <p className="text-xs text-slate-500 mt-1">Membros liberados para usar o app.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Sem Ministerio</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{usersWithoutMinisterio}</p>
                <p className="text-xs text-slate-500 mt-1">Membros que ainda precisam ser vinculados.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2">Multiministerio</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{usersInMultipleMinisterios}</p>
                <p className="text-xs text-slate-500 mt-1">Pessoas participando de mais de um time.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.8fr)_minmax(180px,1fr)_minmax(160px,1fr)_auto] gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                    Buscar
                  </label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Nome, email ou ministerio"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                    Ministerio
                  </label>
                  <select
                    value={userMinisterioFilter}
                    onChange={(e) => setUserMinisterioFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  >
                    <option value="all">Todos os ministerios</option>
                    <option value={NO_MINISTERIO_FILTER}>Sem ministerio</option>
                    {ministerioFilterOptions.map((ministerio) => (
                      <option key={ministerio.id} value={ministerio.id}>
                        {ministerio.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">
                    Perfil
                  </label>
                  <select
                    value={userPerfilFilter}
                    onChange={(e) => setUserPerfilFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  >
                    <option value="all">Todos os perfis</option>
                    {profileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserSearchTerm('');
                    setUserMinisterioFilter('all');
                    setUserPerfilFilter('all');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors self-end"
                >
                  Limpar
                </button>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {filteredMembersTableData.length} {filteredMembersTableData.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
                </span>
                <span>Listagem em ordem alfabetica.</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nome</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ministerio</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Perfil</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sexo</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Data de Nascimento</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-4 sm:px-6 py-3 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMembersTableData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          Nenhum usuario encontrado com os filtros atuais.
                        </td>
                      </tr>
                    )}
                    {filteredMembersTableData.map(({ member, memberMinisterios, principalMinisterioId }) => {
                      return (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center font-black text-sm mr-3 shrink-0">
                              {member.foto ? (
                                <ImageCache
                                  src={member.foto}
                                  alt={member.nome}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                member.nome?.charAt(0)?.toUpperCase() || 'M'
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white block">{member.nome || 'Sem nome'}</span>
                              <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                                {member.email || 'Sem email'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-wrap gap-2 max-w-sm">
                            {memberMinisterios.length > 0 ? (
                              memberMinisterios.map((ministerio: any) => (
                                <span
                                  key={ministerio.id}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                    ministerio.membership?.ativo !== false
                                      ? ministerio.id === principalMinisterioId
                                        ? 'bg-brand text-white'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                                  }`}
                                >
                                  {ministerio.nome}
                                  {ministerio.id === principalMinisterioId && (
                                    <span className="text-[9px] uppercase tracking-wider opacity-80">Principal</span>
                                  )}
                                  {ministerio.membership?.ativo === false && (
                                    <span className="text-[9px] uppercase tracking-wider opacity-80">Inativo</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                Sem ministerio
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          {editingProfile === member.id ? (
                            <div className="relative">
                              <select
                                value={member.perfil || 'User'}
                                onChange={(e) => handleProfileChange(member.id, e.target.value)}
                                onBlur={() => setEditingProfile(null)}
                                className="px-3 py-1.5 text-xs font-black rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent cursor-pointer"
                                autoFocus
                              >
                                {profileOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div 
                              onClick={() => setEditingProfile(member.id)}
                              className={`px-3 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-colors hover:opacity-80 ${
                                member.perfil === 'Admin' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
                                  : member.perfil === 'Lider'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                                  : member.perfil === 'Advanced'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{member.perfil || 'User'}</span>
                                <i className="fas fa-chevron-down text-[8px] opacity-60"></i>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                            member.genero === 'Mulher'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300'
                          }`}>
                            {member.genero || 'Homem'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {member.data_nasc
                              ? new Date(member.data_nasc).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : 'Nao informado'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-black rounded-full ${
                            member.ativo
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {member.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditMember(member)}
                              className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
                              title="Editar"
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'tools-approvals':
        return <ApprovalsPanel />;

      case 'tools-performance':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Desempenho do Sistema</h2>

            {/* Cards do Painel Administrativo */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              {adminCards.map((card) => (
                <div
                  key={card.title}
                  className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group aspect-square sm:aspect-auto"
                >
                  <div className="flex h-full flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${card.iconWrapClass}`}>
                        <i className={`${card.icon} ${card.iconClass} text-lg`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider leading-tight mb-1">
                          {card.title}
                        </p>
                        <p className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight break-words group-hover:text-brand transition-colors">
                          {card.value}
                        </p>
                      </div>
                    </div>

                    {card.metaType === 'pulse' ? (
                      <div className={`mt-1 shrink-0 ${card.metaClass}`}></div>
                    ) : (
                      <i className={`${card.metaIcon} ${card.metaClass} text-sm sm:text-base shrink-0`}></i>
                    )}
                  </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {card.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {performanceKpis.map((kpi) => (
                <div
                  key={kpi.title}
                  className="aspect-square bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.iconWrapClass}`}>
                      <i className={`${kpi.icon} text-lg`}></i>
                    </div>
                    <i className={`${kpi.trendIcon} ${kpi.trendClass} text-sm sm:text-base`}></i>
                  </div>

                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2 leading-tight">
                      {kpi.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight break-words">
                      {kpi.value}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {kpi.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Gráfico de Desempenho</h3>
              <div className="h-64 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <i className="fas fa-chart-area text-4xl mb-4"></i>
                  <p className="text-sm">Gráfico de desempenho em desenvolvimento</p>
                </div>
              </div>
            </div>

            {/* Ações e Cache */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Ações e Cache</h3>
              
              {/* Ações Rápidas */}
              <div className="mb-6">
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">Ações Rápidas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button 
                    onClick={() => {
                      LocalStorageFirstService.forceSync().then(() => {
                        showSuccess('Sincronizacao concluida.');
                      }).catch(() => {
                        showError('Erro ao sincronizar dados.');
                      });
                    }}
                    className="px-4 py-3 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
                  >
                    <i className="fas fa-sync-alt mr-2"></i> Sincronizar Dados
                  </button>
                  <button 
                    onClick={() => {
                      // Verificar localStorage primeiro
                      const allKeys = Object.keys(localStorage);
                      
                      // Implementar backup manual
                      try {
                        const allData: any = {
                          timestamp: new Date().toISOString(),
                          data: {},
                          localStorageKeys: [],
                          totalKeys: 0
                        };

                        // Coletar TODOS os dados do localStorage
                        const allKeys = Object.keys(localStorage);
                        allData.totalKeys = allKeys.length;
                        allData.localStorageKeys = allKeys;

                        // Tabelas principais para organizar
                        const mainTables = [
                          'membros', 'cultos', 'eventos', 'musicas', 
                          'escalas', 'avisos_cultos', 'repertorio', 
                          'funcao', 'temas', 'tons', 'nome_cultos',
                          'ministerios', 'membros_ministerios', 'membros_funcoes',
                          'historico_musicas', 'limpeza', 'solicitacoes_membro',
                          'aviso_geral', 'presenca_consagracao'
                        ];

                        // Coletar dados das tabelas principais
                        mainTables.forEach(table => {
                          const data = localStorage.getItem(table);
                          if (data) {
                            try {
                              const parsedData = JSON.parse(data);
                              allData.data[table] = parsedData;
                            } catch (parseError) {
                              console.warn(`⚠️ Erro ao parsear tabela ${table}:`, parseError);
                              allData.data[table] = null;
                            }
                          }
                        });

                        // Adicionar outras chaves encontradas
                        const otherKeys = allKeys.filter(key => !mainTables.includes(key));
                        if (otherKeys.length > 0) {
                          allData.data.outras_chaves = {};
                          otherKeys.forEach(key => {
                            const value = localStorage.getItem(key);
                            if (value) {
                              try {
                                allData.data.outras_chaves[key] = JSON.parse(value);
                              } catch {
                                allData.data.outras_chaves[key] = value;
                              }
                            }
                          });
                        }

                        // Criar e baixar arquivo JSON
                        const blob = new Blob([JSON.stringify(allData, null, 2)], {
                          type: 'application/json'
                        });
                        
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `louvor_backup_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);

                        showSuccess('Backup realizado com sucesso!');
                      } catch (error) {
                        logger.error('Erro ao realizar backup', error, 'ui');
                        showError('Erro ao realizar backup. Tente novamente.');
                      }
                    }}
                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <i className="fas fa-download mr-2"></i> Backup Manual (Ver Console)
                  </button>
                  <button 
                    onClick={() => {
                      setShowCacheManager(true);
                      setCacheInfo(getImageCacheSize());
                    }}
                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <i className="fas fa-broom mr-2"></i> Gerenciar Cache
                  </button>
                </div>
              </div>
              
              {/* Status do Cache Local */}
              <div>
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">Status do Cache Local</h4>
                <LocalStorageStatus />
              </div>

              <div className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">Erros Recentes</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Registro local dos ultimos erros tecnicos neste navegador.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRecentErrors(logger.getRecentErrors())}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <i className="fas fa-sync mr-2"></i>Atualizar
                    </button>
                    <button
                      onClick={() => {
                        logger.clearRecentErrors();
                        setRecentErrors([]);
                      }}
                      className="px-3 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 rounded-lg font-black text-xs uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <i className="fas fa-trash mr-2"></i>Limpar
                    </button>
                  </div>
                </div>

                {recentErrors.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
                    Nenhum erro recente registrado neste navegador.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {recentErrors.slice(0, 8).map((entry, index) => (
                      <div
                        key={`${entry.timestamp}-${index}`}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-black text-slate-700 dark:text-slate-200">{entry.message}</p>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {new Date(entry.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                          {entry.context}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Gerenciador de Cache */}
            {showCacheManager && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 max-w-md w-full">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Gerenciador de Cache</h3>
                    <button 
                      onClick={() => setShowCacheManager(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <i className="fas fa-times text-slate-500"></i>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                      <h4 className="font-black text-slate-700 dark:text-slate-300 mb-2">Status do Cache</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Imagens armazenadas:</span> {cacheInfo?.count || 0}</p>
                        <p><span className="font-medium">Espaço usado:</span> {cacheInfo?.sizeMB || 0} MB</p>
                        <p><span className="font-medium">Limite aproximado:</span> 5-10 MB</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            const cleared = clearImageCache();
                            setCacheInfo(getImageCacheSize());
                            alert(`Cache limpo! ${cleared} imagens removidas.`);
                          }}
                          className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-colors"
                        >
                          <i className="fas fa-trash mr-2"></i> Limpar Tudo
                        </button>
                        <button 
                          onClick={() => {
                            setCacheInfo(getImageCacheSize());
                          }}
                          className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <i className="fas fa-sync mr-2"></i> Atualizar
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => {
                          try {
                            // Obter URLs atuais dos membros
                            const membros = JSON.parse(localStorage.getItem('membros') || '[]');
                            const memberUrls = membros
                              .filter((m: any) => m.foto && m.foto.startsWith('http'))
                              .map((m: any) => m.foto);
                            
                            const cleared = cleanupOrphanedImages(memberUrls);
                            setCacheInfo(getImageCacheSize());
                            showSuccess(`${cleared} imagens órfãs removidas!`);
                          } catch (error) {
                            logger.error('Erro ao limpar imagens órfãs', error, 'ui');
                            showError('Erro ao limpar imagens órfãs.');
                          }
                        }}
                        className="w-full px-4 py-3 bg-orange-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-colors"
                      >
                        <i className="fas fa-broom mr-2"></i> Limpar Órfãs
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      O cache armazena imagens dos membros para uso offline. Imagens grandes (&gt;500KB) não são armazenadas automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div>View não encontrada</div>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {renderContent()}

      {/* Modal de Edição de Membro */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Editar Membro</h3>
              <button 
                onClick={() => setEditingMember(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <i className="fas fa-times text-slate-500"></i>
              </button>
            </div>

            <div className="space-y-6">
              {/* Foto do Membro */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                    {editingMember?.foto && editingMember.foto.trim() !== '' ? (
                      <ImageCache
                        src={editingMember.foto}
                        alt={editingMember.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-user text-slate-400 text-2xl"></i>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-brand/90 transition-colors">
                    <i className="fas fa-camera text-xs"></i>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploading && (
                  <p className="text-xs text-slate-500 mt-2">Enviando foto...</p>
                )}
              </div>

              {/* Campos de Edição */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Nome base</label>
                  <input
                    type="text"
                    value={editingMember.nome || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Nome de exibicao</label>
                  <input
                    type="text"
                    value={editingMember.display_name || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Nome na planilha</label>
                  <input
                    type="text"
                    value={editingMember.nome_planilha || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, nome_planilha: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingMember.email || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={editingMember.telefone || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editingMember.data_nasc ? editingMember.data_nasc.split('T')[0] : ''}
                    onChange={(e) => setEditingMember({ ...editingMember, data_nasc: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Sexo</label>
                  <select
                    value={editingMember.genero || 'Homem'}
                    onChange={(e) => setEditingMember({ ...editingMember, genero: e.target.value as 'Homem' | 'Mulher' })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  >
                    <option value="Homem">Homem</option>
                    <option value="Mulher">Mulher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Perfil</label>
                  <select
                    value={editingMember.perfil || 'User'}
                    onChange={(e) => setEditingMember({ ...editingMember, perfil: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  >
                    {profileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Status</label>
                  <select
                    value={editingMember.ativo ? 'ativo' : 'inativo'}
                    onChange={(e) => setEditingMember({ ...editingMember, ativo: e.target.value === 'ativo' })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-black text-slate-700 dark:text-slate-300">Ministerios</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Adicione ou remova os ministerios em que este membro pode atuar.
                        </p>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {(editingMember.ministerioIds || []).length} selecionado(s)
                      </span>
                    </div>

                    <MultiSelect
                      options={ministerios.map((ministerio) => ({
                        id: ministerio.id,
                        label: ministerio.nome
                      }))}
                      value={editingMember.ministerioIds || []}
                      onChange={handleEditingMemberMinisteriosChange}
                      placeholder="Selecione os ministerios..."
                    />

                    {(editingMember.ministerioIds || []).length > 0 && (
                      <div className="mt-4 space-y-3">
                        {(editingMember.ministerioIds || []).map((ministerioId) => {
                          const ministerio = ministerios.find((item) => item.id === ministerioId);
                          const ministerioAtivo = editingMember.ministerioStatusById?.[ministerioId] !== false;

                          return (
                            <div
                              key={ministerioId}
                              className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-black text-slate-800 dark:text-white">
                                  {ministerio?.nome || 'Ministerio'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {ministerioAtivo ? 'Ativo neste ministerio' : 'Inativo neste ministerio'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditingMemberMinisterioStatusChange(ministerioId, true)}
                                  className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                                    ministerioAtivo
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  Ativo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditingMemberMinisterioStatusChange(ministerioId, false)}
                                  className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${
                                    !ministerioAtivo
                                      ? 'bg-red-500 text-white'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  Inativo
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-black text-slate-700 dark:text-slate-300">Funcoes do membro</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Defina em quais funcoes este membro pode servir nos ministerios selecionados.
                        </p>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {(editingMember.funcaoIds || []).length} selecionada(s)
                      </span>
                    </div>

                    {(editingMember.ministerioIds || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        Selecione ao menos um ministerio para liberar as funcoes disponiveis.
                      </div>
                    ) : editingMemberFuncoesOptions.length > 0 ? (
                      <MultiSelect
                        options={editingMemberFuncoesOptions}
                        value={editingMember.funcaoIds || []}
                        onChange={(funcaoIds) => setEditingMember({ ...editingMember, funcaoIds })}
                        placeholder="Selecione as funcoes..."
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        Ainda nao existem funcoes cadastradas para os ministerios selecionados.
                      </div>
                    )}
                  </div>
                </div>

                {(editingMember.ministerioIds || []).filter((ministerioId) => editingMember.ministerioStatusById?.[ministerioId] !== false).length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Ministerio principal</label>
                    <select
                      value={editingMember.principalMinisterioId || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, principalMinisterioId: e.target.value || null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    >
                      {(editingMember.ministerioIds || [])
                        .filter((ministerioId) => editingMember.ministerioStatusById?.[ministerioId] !== false)
                        .map((ministerioId) => {
                        const ministerio = ministerios.find((item) => item.id === ministerioId);

                        return (
                          <option key={ministerioId} value={ministerioId}>
                            {ministerio?.nome || 'Ministerio'}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Este ministerio sera usado como contexto inicial do membro no app.
                    </p>
                  </div>
                )}
                {(editingMember.ministerioIds || []).length > 0 &&
                  (editingMember.ministerioIds || []).every(
                    (ministerioId) => editingMember.ministerioStatusById?.[ministerioId] === false
                  ) && (
                    <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                      Este membro continuara vinculado aos ministerios selecionados, mas ficara inativo em todos eles.
                    </div>
                  )}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => handleSaveMember(editingMember)}
                  disabled={savingMember}
                  className="flex-1 px-4 py-3 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-save mr-2"></i> Salvar Alterações
                </button>
                <button 
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <i className="fas fa-times mr-2"></i> Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsView;

