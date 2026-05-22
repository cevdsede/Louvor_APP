import React, { useState, useEffect } from 'react';
import { Member, ScheduleEvent } from '../../types';
import { ImageCache } from '../ui/ImageCache';
import { supabase } from '../../supabaseClient';
import { logger } from '../../utils/logger';
import { showError, showSuccess } from '../../utils/toast';
import AvisoGeralService, { AvisoGeral } from '../../services/AvisoGeralService';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import { useMinistryContext } from '../../contexts/MinistryContext';
import { getDisplayName } from '../../utils/displayName';
import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';
import EventCard from '../escalas/EventCard';
import { buildLocalAvatar } from '../../utils/avatar';
import { buildMemberPhotoPath, getPublicAssetsPathFromUrl, sanitizeImageUrl } from '../../utils/imageUrl';
import { compressImageFile } from '../../utils/imageCompression';

interface TeamModalsProps {
  selectedMember: Member | null;
  editingMember: Member | null;
  viewingEvent: ScheduleEvent | null;
  onSelectedMemberChange: (member: Member | null) => void;
  onEditingMemberChange: (member: Member | null) => void;
  onViewingEventChange: (event: ScheduleEvent | null) => void;
  onMembersChange: React.Dispatch<React.SetStateAction<Member[]>>;
}

const TeamModals: React.FC<TeamModalsProps> = ({
  selectedMember,
  editingMember,
  viewingEvent,
  onSelectedMemberChange,
  onEditingMemberChange,
  onViewingEventChange,
  onMembersChange
}) => {
  const { activeMinisterioId, currentMember } = useMinistryContext();
  const { data: funcoesRaw } = useLocalStorageFirst<any>({ table: 'funcao' });
  const { data: membrosFuncoesRaw } = useLocalStorageFirst<any>({ table: 'membros_funcoes' });
  const { data: membrosMinisteriosRaw } = useLocalStorageFirst<any>({ table: 'membros_ministerios' });
  const { data: cultosRaw } = useLocalStorageFirst<any>({ table: 'cultos' });
  const { data: nomeCultosRaw } = useLocalStorageFirst<any>({ table: 'nome_cultos' });
  const { data: membrosRaw } = useLocalStorageFirst<any>({ table: 'membros' });
  const { data: escalasRaw } = useLocalStorageFirst<any>({ table: 'escalas' });
  const { data: repertorioRaw } = useLocalStorageFirst<any>({ table: 'repertorio' });
  const { data: musicasRaw } = useLocalStorageFirst<any>({ table: 'musicas' });
  const { data: tonsRaw } = useLocalStorageFirst<any>({ table: 'tons' });
  const { data: avisosCultoRaw } = useLocalStorageFirst<any>({ table: 'avisos_cultos' });
  const [isInactiveExpanded, setIsInactiveExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avisosGerais, setAvisosGerais] = useState<AvisoGeral[]>([]);
  const [loadingAvisos, setLoadingAvisos] = useState(false);
  const [viewingEventExpanded, setViewingEventExpanded] = useState(true);
  const [viewingEventTab, setViewingEventTab] = useState<'team' | 'repertoire' | 'notices'>('team');
  const normalizeText = (value?: string | null) =>
    (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const currentProfile = normalizeText(currentMember?.perfil);
  const isAdmin = currentProfile.includes('admin');
  const isLeader = currentProfile.includes('lider');
  const canEditMember = (member: Member) => isAdmin || isLeader || member.id === currentMember?.id;
  const canEditBasic = Boolean(editingMember && (isAdmin || editingMember.id === currentMember?.id));
  const canEditMinistry = Boolean(editingMember && activeMinisterioId && (isAdmin || isLeader));
  const canManageCurrentMinistry = Boolean(activeMinisterioId && (isAdmin || isLeader));
  const activeFuncoes = (funcoesRaw || []).filter((funcao: any) =>
    activeMinisterioId ? funcao.ministerio_id === activeMinisterioId : true
  );
  const editingMemberFuncaoIds = new Set((editingMember?.funcaoIds || []).map(String));

  const buildEventFromCultoId = (eventId: string): ScheduleEvent | null => {
    const culto = (cultosRaw || []).find((item: any) => item.id === eventId);
    if (!culto) return null;

    const cultoDate = new Date(`${culto.data_culto}T12:00:00`);
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const eventEscalas = (escalasRaw || [])
      .filter(
        (escala: any) =>
          escala.id_culto === eventId &&
          (!activeMinisterioId || escala.ministerio_id === activeMinisterioId)
      )
      .map((escala: any) => ({
        membro: (membrosRaw || []).find((member: any) => member.id === escala.id_membros),
        funcao: (funcoesRaw || []).find((funcao: any) => funcao.id === escala.id_funcao)
      }));

    const groupedMembers = new Map<string, any>();
    eventEscalas.forEach(({ membro, funcao }) => {
      if (!membro) return;
      const memberId = membro.id;
      const memberName = getDisplayName(membro);

      if (!groupedMembers.has(memberId)) {
        groupedMembers.set(memberId, {
          id: memberId,
          name: memberName,
          gender: membro.genero === 'Homem' ? 'M' : 'F',
          avatar: sanitizeImageUrl(membro.foto) || buildLocalAvatar(memberName),
          status: 'confirmed',
          upcomingScales: [],
          songHistory: [],
          roles: [],
          roleIds: []
        });
      }

      const member = groupedMembers.get(memberId);
      if (funcao?.nome_funcao && !member.roles.includes(funcao.nome_funcao)) {
        member.roles.push(funcao.nome_funcao);
        member.roleIds.push(funcao.id);
      }
    });

    const members = sortMembersByRole(
      Array.from(groupedMembers.values()).map((member: any) => {
        const sortedRoles = member.roleIds
          .map((id: number, index: number) => ({ id, role: member.roles[index] }))
          .sort((a: any, b: any) => a.id - b.id)
          .map((item: any) => item.role);

        return {
          ...member,
          role: sortedRoles.join(' / '),
          roles: sortedRoles,
          roleIds: member.roleIds
        };
      })
    );

    const repertoire = (repertorioRaw || [])
      .filter((item: any) => item.id_culto === eventId)
      .map((item: any) => {
        const song = (musicasRaw || []).find((music: any) => music.id === item.id_musicas);
        const tone = (tonsRaw || []).find((entry: any) => entry.id === item.id_tons);
        const member = (membrosRaw || []).find((entry: any) => entry.id === item.id_membros);

        return {
          id: item.id,
          musica: song?.musica || 'Sem música',
          cantor: song?.cantor || 'Sem cantor',
          key: tone?.nome_tons || 'N/D',
          minister: getDisplayName(member)
        };
      });

    return {
      id: culto.id,
      title:
        (nomeCultosRaw || []).find((item: any) => item.id === culto.id_nome_cultos)?.nome_culto ||
        'CULTO',
      date: cultoDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dayOfWeek: daysOfWeek[cultoDate.getDay()],
      time: culto.horario,
      members,
      repertoire
    };
  };

  const noticesForViewingEvent = viewingEvent
    ? (avisosCultoRaw || [])
        .filter(
          (notice: any) =>
            notice.id_cultos === viewingEvent.id &&
            (!activeMinisterioId || notice.ministerio_id === activeMinisterioId)
        )
        .map((notice: any) => {
          const member = (membrosRaw || []).find((item: any) => item.id === notice.id_membros);
          return {
            id: notice.id_lembrete,
            text: notice.info,
            sender: getDisplayName(member, 'Admin'),
            time: notice.created_at
              ? new Date(notice.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : ''
          };
        })
    : [];

  const openScaleDetailFromMember = (eventId: string) => {
    const event = buildEventFromCultoId(eventId);
    if (!event) {
      showError('Não foi possível carregar os detalhes da escala.');
      return;
    }

    onViewingEventChange(event);
  };

  // Função para abrir WhatsApp com o membro
  const handleWhatsAppContact = (member: Member) => {
    const message = encodeURIComponent(`Olá ${member.name}! Tudo bem?`);
    
    // Abre WhatsApp Web com mensagem personalizada
    window.open(`https://web.whatsapp.com/send?text=${message}`, '_blank');
  };

  // Função para editar membro
  const handleEditMember = (member: Member) => {
    if (!canEditMember(member)) {
      showError('Voce nao tem permissao para editar este membro.');
      return;
    }

    // Fecha o modal atual e abre o modal de edição
    onSelectedMemberChange(null);
    onEditingMemberChange(member);
  };

  const handleRemoveFromCurrentMinisterio = async (member: Member) => {
    if (!activeMinisterioId || !canManageCurrentMinistry) {
      showError('Voce nao tem permissao para remover membros deste ministerio.');
      return;
    }

    try {
      const existingMembership = (membrosMinisteriosRaw || []).find(
        (membership: any) => membership.membro_id === member.id && membership.ministerio_id === activeMinisterioId
      );

      if (existingMembership?.id) {
        const { error } = await supabase
          .from('membros_ministerios')
          .update({ ativo: false, principal: false })
          .eq('id', existingMembership.id);
        if (error) throw error;
      }

      const scopedFuncaoIds = new Set(activeFuncoes.map((funcao: any) => String(funcao.id)));
      const scopedMemberFunctionIds = (membrosFuncoesRaw || [])
        .filter(
          (membership: any) =>
            membership.id_membro === member.id && scopedFuncaoIds.has(String(membership.id_funcao))
        )
        .map((membership: any) => membership.id)
        .filter(Boolean);

      if (scopedMemberFunctionIds.length > 0) {
        const { error } = await supabase.from('membros_funcoes').delete().in('id', scopedMemberFunctionIds);
        if (error) throw error;
      }

      const hasOtherActiveMinisterio = (membrosMinisteriosRaw || []).some(
        (membership: any) =>
          membership.membro_id === member.id &&
          membership.ministerio_id !== activeMinisterioId &&
          membership.ativo !== false
      );
      const protectedPositions = ['Pastor(a)', 'Secretario(a)', 'Tesoureiro(a)', 'Missionário'];
      const rawMember = (membrosRaw || []).find((item: any) => item.id === member.id);

      if (!hasOtherActiveMinisterio && !protectedPositions.includes(rawMember?.posicao_igreja || '')) {
        const { error } = await supabase.from('membros').update({ posicao_igreja: 'Membro' }).eq('id', member.id);
        if (error) throw error;
      }

      await Promise.allSettled([
        LocalStorageFirstService.forceSync('membros'),
        LocalStorageFirstService.forceSync('membros_ministerios'),
        LocalStorageFirstService.forceSync('membros_funcoes')
      ]);

      onMembersChange((previous) => previous.filter((item) => item.id !== member.id));
      onSelectedMemberChange(null);
      onEditingMemberChange(null);
      showSuccess('Membro removido apenas deste ministerio.');
    } catch (error) {
      logger.error('Erro ao remover membro do ministerio:', error, 'database');
      showError('Erro ao remover membro do ministerio.');
    }
  };

  // Função para fazer upload da foto
  const handlePhotoUpload = async (file: File) => {
    if (!file || !editingMember) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      showError('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const compressedFile = await compressImageFile(file, { maxWidth: 720, maxHeight: 720, quality: 0.72 });
      const memberName = editingMember.displayName || editingMember.display_name || editingMember.nome || editingMember.name;
      const filePath = buildMemberPhotoPath(editingMember.id, memberName);

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, compressedFile, {
          cacheControl: '31536000',
          contentType: compressedFile.type || 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('membros')
        .update({ foto: publicUrl })
        .eq('id', editingMember.id);
      if (updateError) throw updateError;

      const previousPhotoPath = getPublicAssetsPathFromUrl(editingMember.avatar);
      if (previousPhotoPath && previousPhotoPath !== filePath) {
        const { error: removeError } = await supabase.storage.from('public-assets').remove([previousPhotoPath]);
        if (removeError) {
          logger.warn('Não foi possível apagar a foto antiga do membro:', removeError, 'ui');
        }
      }

      // Atualizar o avatar no estado do modal
      onEditingMemberChange({
        ...editingMember,
        avatar: publicUrl
      });
      onMembersChange((previous) =>
        previous.map((member) => (member.id === editingMember.id ? { ...member, avatar: publicUrl } : member))
      );
      await LocalStorageFirstService.forceSync('membros');

      showSuccess('Foto enviada com sucesso!');
    } catch (error) {
      logger.error('Erro ao fazer upload da foto:', error, 'ui');
      showError('Erro ao enviar a foto. Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Função para salvar edição do membro
  const handleSaveEditMember = async (updatedMember: Partial<Member> & { 
    avatar?: string; 
    email?: string; 
    telefone?: string; 
    data_nasc?: string; 
  }) => {
    try {
      if (!editingMember) return;

      if (!canEditBasic && !canEditMinistry) {
        showError('Voce nao tem permissao para editar este membro.');
        return;
      }
      
      if (canEditBasic || canEditMinistry) {
        const memberPayload: Record<string, any> = {};

        if (canEditBasic) {
          memberPayload.foto = updatedMember.avatar;
          memberPayload.telefone = updatedMember.telefone;
          memberPayload.email = updatedMember.email;
          memberPayload.data_nasc = updatedMember.data_nasc;
          memberPayload.display_name = updatedMember.displayName;
        }

        if (canEditMinistry) {
          memberPayload.nome_planilha = updatedMember.nome_planilha;
        }

        if (isAdmin) {
          memberPayload.genero = updatedMember.gender === 'F' ? 'Mulher' : 'Homem';
          memberPayload.perfil = updatedMember.perfil;
        }

        if (Object.keys(memberPayload).length > 0) {
          const { error: memberError } = await supabase
            .from('membros')
            .update(memberPayload)
            .eq('id', editingMember.id);

          if (memberError) throw memberError;
        }
      }

      if (canEditMinistry && activeMinisterioId) {
        const existingMembership = (membrosMinisteriosRaw || []).find(
          (membership: any) =>
            membership.membro_id === editingMember.id && membership.ministerio_id === activeMinisterioId
        );
        const membershipPayload = {
          membro_id: editingMember.id,
          ministerio_id: activeMinisterioId,
          ativo: updatedMember.activeMinisterioStatus !== false,
          principal: existingMembership?.principal || false,
          papel: existingMembership?.papel || null
        };

        if (existingMembership?.id) {
          const { error } = await supabase
            .from('membros_ministerios')
            .update(membershipPayload)
            .eq('id', existingMembership.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('membros_ministerios').insert(membershipPayload);
          if (error) throw error;
        }

        const scopedFuncaoIds = new Set(activeFuncoes.map((funcao: any) => String(funcao.id)));
        const currentScopedFuncoes = (membrosFuncoesRaw || []).filter(
          (membership: any) =>
            membership.id_membro === editingMember.id && scopedFuncaoIds.has(String(membership.id_funcao))
        );
        const desiredFuncaoIds = new Set((updatedMember.funcaoIds || []).map(String));
        const funcoesToDelete = currentScopedFuncoes.filter(
          (membership: any) => !desiredFuncaoIds.has(String(membership.id_funcao))
        );
        const currentFuncaoIds = new Set(currentScopedFuncoes.map((membership: any) => String(membership.id_funcao)));
        const funcoesToInsert = [...desiredFuncaoIds].filter(
          (funcaoId) => scopedFuncaoIds.has(funcaoId) && !currentFuncaoIds.has(funcaoId)
        );

        if (funcoesToDelete.length > 0) {
          const ids = funcoesToDelete.map((membership: any) => membership.id).filter(Boolean);
          if (ids.length > 0) {
            const { error } = await supabase.from('membros_funcoes').delete().in('id', ids);
            if (error) throw error;
          }
        }

        if (funcoesToInsert.length > 0) {
          const { error } = await supabase.from('membros_funcoes').insert(
            funcoesToInsert.map((funcaoId) => ({
              id_membro: editingMember.id,
              id_funcao: Number(funcaoId)
            }))
          );
          if (error) throw error;
        }
      }

      const cachedMembers = LocalStorageFirstService.get<any>('membros');
      LocalStorageFirstService.set(
        'membros',
        cachedMembers.map((member) =>
          member.id === editingMember.id
            ? {
                ...member,
                foto: updatedMember.avatar ?? member.foto,
                telefone: updatedMember.telefone ?? member.telefone,
                email: updatedMember.email ?? member.email,
                data_nasc: updatedMember.data_nasc ?? member.data_nasc,
                display_name: updatedMember.displayName ?? member.display_name,
                displayName: updatedMember.displayName ?? member.displayName,
                nome_planilha: updatedMember.nome_planilha ?? member.nome_planilha,
                perfil: isAdmin ? updatedMember.perfil ?? member.perfil : member.perfil,
                genero: isAdmin ? (updatedMember.gender === 'F' ? 'Mulher' : 'Homem') : member.genero
              }
            : member
        )
      );

      if (canEditBasic && editingMember.id === currentMember?.id) {
        const authPayload: any = {};
        if (updatedMember.displayName !== undefined) {
          authPayload.data = { display_name: updatedMember.displayName };
        }
        if (updatedMember.email && updatedMember.email !== editingMember.email) {
          authPayload.email = updatedMember.email;
        }

        const { error: authDisplayError } = Object.keys(authPayload).length > 0
          ? await supabase.auth.updateUser(authPayload)
          : { error: null };

        if (authDisplayError) {
          console.warn('Aviso: Nao foi possivel atualizar o display name:', authDisplayError.message);
        }
      }

      // Atualiza email na tabela auth.users se fornecido
      if (isAdmin && editingMember.id !== currentMember?.id) {
        const adminAuthPayload: any = {};
        if (updatedMember.email && updatedMember.email !== editingMember.email) {
          adminAuthPayload.email = updatedMember.email;
        }
        if (updatedMember.displayName !== undefined) {
          adminAuthPayload.user_metadata = { display_name: updatedMember.displayName };
        }

        if (Object.keys(adminAuthPayload).length === 0) {
          // Nada para atualizar no Auth.
        } else {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          editingMember.id,
          adminAuthPayload
        );

        if (authError) {
          console.warn('Aviso: Não foi possível atualizar o email na tabela auth.users:', authError.message);
          // Não falhar a operação principal, apenas avisar
        }
        }
      }

      // Atualiza o estado local
      onMembersChange((prev) => prev.map(m => 
        m.id === editingMember.id 
          ? { 
              ...m, 
              name: updatedMember.displayName || m.name,
              display_name: updatedMember.displayName ?? m.display_name,
              displayName: updatedMember.displayName ?? m.displayName,
              nome_planilha: updatedMember.nome_planilha ?? m.nome_planilha,
              avatar: updatedMember.avatar || m.avatar,
              telefone: updatedMember.telefone || m.telefone,
              email: updatedMember.email || m.email,
              data_nasc: updatedMember.data_nasc || m.data_nasc,
              funcaoIds: updatedMember.funcaoIds || m.funcaoIds,
              activeMinisterioStatus: updatedMember.activeMinisterioStatus ?? m.activeMinisterioStatus,
              status: updatedMember.activeMinisterioStatus === false ? 'absent' : m.status,
              perfil: updatedMember.perfil || m.perfil,
              gender: updatedMember.gender || m.gender
            }
          : m
      ));

      // Fecha o modal de edição
      onEditingMemberChange(null);
      showSuccess('Membro atualizado com sucesso!');
    } catch (error) {
      logger.error('Erro ao atualizar membro:', error, 'database');
      showError('Erro ao atualizar membro. Tente novamente.');
    }
  };

  // Buscar avisos gerais do membro quando o modal é aberto
  useEffect(() => {
    if (selectedMember) {
      fetchAvisosGerais();
    }
  }, [selectedMember]);

  useEffect(() => {
    if (viewingEvent) {
      setViewingEventExpanded(true);
      setViewingEventTab('team');
    }
  }, [viewingEvent]);

  const fetchAvisosGerais = async () => {
    if (!selectedMember) return;
    
    setLoadingAvisos(true);
    try {
      const avisos = await AvisoGeralService.getAvisosByMembro(selectedMember.id, activeMinisterioId);
      setAvisosGerais(avisos);
    } catch (error) {
      logger.error('Erro ao buscar avisos gerais:', error, 'ui');
      // Não mostrar erro para o usuário, apenas log
    } finally {
      setLoadingAvisos(false);
    }
  };

  return (
    <>
      {/* Modal de Membro - Centralizado apenas na área de conteúdo (ignorando navbar) */}
      {selectedMember && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center overflow-hidden p-4 py-20 lg:p-10 lg:py-10">
          <div className="absolute inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-xl" onClick={() => onSelectedMemberChange(null)}></div>

          <div className="app-card relative flex max-h-[78vh] w-full max-w-xl flex-col overflow-hidden rounded-[2.4rem] border shadow-[0_38px_120px_-54px_rgba(15,23,42,0.55)] animate-fade-in lg:ml-64 lg:max-h-[86vh]">
            <div className="relative shrink-0 overflow-hidden border-b border-app bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,255,255,0.62))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.76))]">
              <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-brand/12 blur-3xl"></div>
              <div className="absolute -right-12 top-6 h-28 w-28 rounded-full bg-brand/10 blur-3xl"></div>
              <div className="flex justify-between items-center">
                <div className="flex w-full items-start justify-between gap-4 px-6 pb-5 pt-6 lg:px-8">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand animate-pulse"></div>
                    <span className="app-card text-[8px] font-black uppercase tracking-[0.28em] text-brand px-3 py-1.5 rounded-full border border-brand/20 shadow-sm">
                      Perfil do Membro
                    </span>
                  </div>
                  <button onClick={() => onSelectedMemberChange(null)} className="app-btn-muted flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20">
                    <i className="fas fa-times text-sm"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-grow space-y-6 overflow-y-auto p-6 no-scrollbar lg:p-8">
              <div className="app-card-strong rounded-[2rem] border p-5 text-center shadow-[0_24px_70px_-48px_rgba(14,116,144,0.45)] lg:p-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-full bg-brand/20 blur-2xl"></div>
                  <div className="absolute -inset-2 rounded-full border border-brand/15"></div>
                  <ImageCache
                    src={selectedMember.avatar} 
                    fallbackSrc={buildLocalAvatar(selectedMember.name)}
                    alt={selectedMember.name}
                    className="relative h-24 w-24 rounded-full border-4 border-white object-cover shadow-2xl ring-4 ring-brand/10 dark:border-slate-900"
                  />
                </div>
                <div className="mt-4">
                  <h2 className="mb-2 text-2xl font-black leading-none text-app">
                    {selectedMember.name}
                  </h2>
                  <div className="mb-1 flex flex-wrap justify-center gap-2">
                    <span className="app-card rounded-full border px-3 py-1 text-[10px] font-black text-app-muted">
                      {selectedMember.role}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                      selectedMember.gender === 'M' 
                        ? 'bg-brand/10 border-brand/20 text-brand' 
                        : 'bg-pink-500/10 border-pink-500/20 text-pink-500'
                    }`}>
                      {selectedMember.gender === 'M' ? 'Masculino' : 'Feminino'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-left text-[9px] font-black uppercase tracking-[0.32em] text-app-muted">Próximas Escalas</h4>
                  <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-brand/70">
                    {selectedMember.upcomingScales?.length || 0} itens
                  </span>
                </div>
                <div className="space-y-3">
                  {selectedMember.upcomingScales && selectedMember.upcomingScales.length > 0 ? (
                    selectedMember.upcomingScales.map((s, idx) => (
                      <button key={idx} onClick={() => openScaleDetailFromMember(s.id)} className="app-panel group flex w-full items-center justify-between rounded-[1.8rem] px-5 py-4 shadow-[0_22px_60px_-50px_rgba(15,23,42,0.4)] transition-all hover:border-brand/40 hover:shadow-[0_28px_70px_-48px_rgba(59,130,246,0.26)] active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                          <div className="app-card flex h-12 w-12 flex-col items-center justify-center rounded-2xl border shadow-md">
                            <span className="text-[8px] font-black text-slate-400 leading-none">{s.date.split('/')[1]}</span>
                            <span className="text-lg font-black text-brand leading-none mt-1">{s.date.split('/')[0]}</span>
                          </div>
                          <div className="text-left">
                            <span className="mb-1 block text-[11px] font-black uppercase text-app">{s.event}</span>
                            <div className="flex items-center gap-2">
                              <span className="app-card-muted rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest">{s.role}</span>
                              {s.time && <span className="text-[7px] text-slate-300">• {s.time}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all">
                          <i className="fas fa-arrow-right text-[10px]"></i>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="app-panel-muted rounded-[1.8rem] py-8 text-center">
                      <div className="app-card mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border">
                        <i className="fas fa-calendar-xmark text-slate-300 text-xl"></i>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhuma escala programada</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Repertório Recente - Apenas para Ministro ou Vocal */}
              {(selectedMember.role?.toLowerCase().includes('ministro') || selectedMember.role?.toLowerCase().includes('vocal')) && (
                <div className="space-y-4">
                  <h4 className="ml-1 text-left text-[9px] font-black uppercase tracking-[0.32em] text-app-muted">Repertório Recente</h4>
                  <div className="space-y-3">
                    {selectedMember.songHistory && selectedMember.songHistory.length > 0 ? (
                      selectedMember.songHistory.map((h, idx) => (
                        <div key={idx} className="app-panel flex flex-nowrap items-center gap-3 rounded-[1.7rem] p-4 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.35)]">
                          <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand p-1 text-[10px] font-black text-white shadow-lg">{h.key}</div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="block truncate text-[11px] font-black text-app">{h.song}</span>
                            <div className="flex items-center gap-2 text-[8px] text-app-muted">
                              <span>{h.date}</span>
                              <span>•</span>
                              <span>{h.event}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="app-panel-muted rounded-[1.8rem] py-8 text-center">
                        <div className="app-card mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border">
                          <i className="fas fa-music text-slate-300 text-xl"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhuma música registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Avisos enviados para lideres - Apenas se houver avisos */}
              {!loadingAvisos && avisosGerais.length > 0 && (
                <div className="space-y-4">
                  <h4 className="ml-1 text-left text-[9px] font-black uppercase tracking-[0.32em] text-app-muted">Avisos para lideres</h4>
                  <div className="space-y-3">
                    {avisosGerais.map((aviso) => (
                      <div key={aviso.id.toString()} className="rounded-[1.7rem] border border-amber-200/80 bg-amber-50/92 p-4 shadow-[0_18px_45px_-38px_rgba(245,158,11,0.45)] dark:border-amber-800/50 dark:bg-amber-900/20">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-bell text-[10px]"></i>
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed mb-2">
                              {aviso.texto}
                            </p>
                            <p className="text-[8px] text-slate-400 uppercase tracking-widest">
                              {new Date(aviso.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="app-card-strong border-app flex shrink-0 gap-3 border-t p-5 lg:p-6">
              <button 
                onClick={() => handleWhatsAppContact(selectedMember)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 active:scale-95"
              >
                <i className="fab fa-whatsapp"></i> WhatsApp
              </button>
              {canEditMember(selectedMember) && (
                <button 
                  onClick={() => handleEditMember(selectedMember)}
                  className="app-btn-muted flex-1 rounded-2xl py-4 text-[9px] font-black uppercase tracking-widest transition-colors hover:text-app"
                >
                  Editar
                </button>
              )}
              {canManageCurrentMinistry && selectedMember.id !== currentMember?.id && (
                <button
                  onClick={() => handleRemoveFromCurrentMinisterio(selectedMember)}
                  className="flex-1 rounded-2xl bg-red-50 py-4 text-[9px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Membro */}
      {editingMember && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 lg:p-10 py-20 lg:py-10 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-xl" onClick={() => onEditingMemberChange(null)}></div>

          <div className="bg-app-surface border-app relative flex max-h-[75vh] w-full max-w-lg flex-col overflow-hidden rounded-[3rem] border shadow-2xl animate-fade-in lg:ml-64 lg:max-h-[85vh]">
            {/* Header */}
            <div className="relative p-6 pb-4 bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-slate-100/50 dark:border-slate-800/50 z-10 shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="bg-app-surface text-[8px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-500/20">Editar Membro</span>
                </div>
                <button onClick={() => onEditingMemberChange(null)} className="bg-app-surface border-app text-app-muted flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20">
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar flex-grow space-y-6">
              {/* Formulário de Edição Simplificado */}
              <div className="space-y-4">
                {canEditBasic && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Nome de exibicao</label>
                      <input
                        type="text"
                        value={editingMember.displayName || editingMember.display_name || editingMember.nome || editingMember.name || ''}
                        onChange={(e) =>
                          onEditingMemberChange({
                            ...editingMember,
                            displayName: e.target.value,
                            name: e.target.value
                          })
                        }
                        className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="Nome"
                      />
                    </div>

                    {canEditMinistry && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Nome na planilha</label>
                        <input
                          type="text"
                          value={editingMember.nome_planilha || ''}
                          onChange={(e) =>
                            onEditingMemberChange({
                              ...editingMember,
                              nome_planilha: e.target.value
                            })
                          }
                          className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors"
                          placeholder="Igual ao nome usado na escala"
                        />
                      </div>
                    )}
                  </>
                )}

                {canEditMinistry && !canEditBasic && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Nome na planilha</label>
                    <input
                      type="text"
                      value={editingMember.nome_planilha || ''}
                      onChange={(e) =>
                        onEditingMemberChange({
                          ...editingMember,
                          nome_planilha: e.target.value
                        })
                      }
                      className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Igual ao nome usado na escala"
                    />
                  </div>
                )}

                {canEditBasic && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Foto do Membro</label>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                          {editingMember.avatar ? (
                            <ImageCache src={editingMember.avatar} alt={editingMember.name} className="w-full h-full object-cover" disableCompression={true} />
                          ) : (
                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <i className="fas fa-user text-slate-400"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{editingMember.avatar ? 'Foto atual' : 'Sem foto'}</div>
                          <div className="text-xs text-slate-400">Formato: JPG, PNG (max. 5MB)</div>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file);
                        }}
                        disabled={uploading}
                        className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                      <input type="tel" value={editingMember.telefone || ''} onChange={(e) => onEditingMemberChange({ ...editingMember, telefone: e.target.value })} className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors" placeholder="(00) 00000-0000" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Email</label>
                      <input type="email" value={editingMember.email || ''} onChange={(e) => onEditingMemberChange({ ...editingMember, email: e.target.value })} className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors" placeholder="email@exemplo.com" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                      <input type="date" value={editingMember.data_nasc || ''} onChange={(e) => onEditingMemberChange({ ...editingMember, data_nasc: e.target.value })} className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>

                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Genero</label>
                          <select value={editingMember.gender || 'M'} onChange={(e) => onEditingMemberChange({ ...editingMember, gender: e.target.value as 'M' | 'F' })} className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors">
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Perfil</label>
                          <input type="text" value={editingMember.perfil || ''} onChange={(e) => onEditingMemberChange({ ...editingMember, perfil: e.target.value })} className="bg-app-surface border-app text-app w-full rounded-xl border px-4 py-3 text-[11px] focus:outline-none focus:border-emerald-500 transition-colors" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {canEditMinistry && (
                  <div className="bg-app-surface-muted border-app rounded-2xl border p-4 space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Ministerio atual</p>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => onEditingMemberChange({ ...editingMember, activeMinisterioStatus: true })} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${editingMember.activeMinisterioStatus !== false ? 'bg-emerald-500 text-white' : 'bg-app-surface text-app-muted'}`}>Ativo</button>
                        <button type="button" onClick={() => onEditingMemberChange({ ...editingMember, activeMinisterioStatus: false })} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${editingMember.activeMinisterioStatus === false ? 'bg-red-500 text-white' : 'bg-app-surface text-app-muted'}`}>Inativo</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-3">Funcoes</p>
                      <div className="grid grid-cols-1 gap-2">
                        {activeFuncoes.map((funcao: any) => {
                          const funcaoId = String(funcao.id);
                          const checked = editingMemberFuncaoIds.has(funcaoId);
                          return (
                            <label key={funcaoId} className="bg-app-surface text-app flex items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-bold">
                              <input type="checkbox" checked={checked} onChange={(event) => {
                                const currentIds = new Set((editingMember.funcaoIds || []).map(String));
                                if (event.target.checked) currentIds.add(funcaoId); else currentIds.delete(funcaoId);
                                onEditingMemberChange({ ...editingMember, funcaoIds: [...currentIds] });
                              }} />
                              {funcao.nome_funcao}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-app-surface-muted border-app flex shrink-0 gap-3 border-t p-6">
              <button 
                onClick={() => onEditingMemberChange(null)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleSaveEditMember(editingMember)}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-emerald-600"
              >
                <i className="fas fa-save"></i> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Detalhes do Evento */}
      {viewingEvent && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 lg:pl-[312px] antialiased">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => onViewingEventChange(null)}></div>
          <div className="relative w-full max-w-4xl max-h-[85vh] lg:max-h-[90vh] bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[2rem] lg:rounded-[3rem] shadow-2xl overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
            <div className="p-6 lg:p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none">
                  Detalhes da Escala
                </h3>
                <button
                  onClick={() => onViewingEventChange(null)}
                  className="bg-app-surface border-app text-app-muted flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition-all hover:text-red-500"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <EventCard
                event={viewingEvent}
                isExpanded={viewingEventExpanded}
                onToggle={() => setViewingEventExpanded((current) => !current)}
                activeSubTab={viewingEventTab}
                onSubTabChange={setViewingEventTab}
                showRepertoire
              >
                {viewingEventTab === 'team' && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {viewingEvent.members.map((member, index) => (
                        <div key={`${member.id}-${index}`} className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                          <div className="flex flex-col items-center text-center">
                            <div className="relative mb-3">
                              <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-gold rounded-full flex items-center justify-center shadow-lg">
                                {member.avatar ? (
                                  <ImageCache
                                    src={member.avatar}
                                    fallbackSrc={buildLocalAvatar(member.name)}
                                    alt={member.name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-white text-xl`}></i>
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border-2 border-brand">
                                <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-brand text-[8px]`}></i>
                              </div>
                            </div>
                            <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate w-full">{member.name}</h5>
                            <div className="flex flex-col items-center gap-1 mt-2">
                              {member.roles && member.roles.length > 1 ? (
                                <div className="text-center">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{member.roles.join(' / ')}</p>
                                  {member.roles.length > 2 && <span className="text-[7px] font-bold text-brand">+{member.roles.length - 1} funções</span>}
                                </div>
                              ) : (
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate w-full">{member.role}</p>
                              )}
                              <div className="flex items-center gap-1 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-[7px] font-bold text-slate-500 uppercase">Escalado</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {viewingEvent.members.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-users-slash text-slate-400 text-lg"></i>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum membro escalado</p>
                      </div>
                    )}
                  </div>
                )}

                {viewingEventTab === 'repertoire' && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {viewingEvent.repertoire.map((song) => (
                        <div key={song.id} className="group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                            <div className="w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0">{song.key || 'N/D'}</div>
                            <div className="flex-1 px-4">
                              <h5 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">{song.musica} - {song.cantor}</h5>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Ministro: <span className="text-brand">{song.minister || 'Sem ministro'}</span></p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {viewingEvent.repertoire.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-music-slash text-slate-400 text-lg"></i>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma música no repertório</p>
                      </div>
                    )}
                  </div>
                )}

                {viewingEventTab === 'notices' && (
                  <div className="p-6">
                    <div className="space-y-3">
                      {noticesForViewingEvent.map((notice) => (
                        <div key={notice.id} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[8px] font-black text-brand uppercase tracking-widest">{notice.sender}</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase">{notice.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{notice.text}</p>
                        </div>
                      ))}
                    </div>
                    {noticesForViewingEvent.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-bell-slash text-slate-400 text-lg"></i>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum aviso</p>
                      </div>
                    )}
                  </div>
                )}
              </EventCard>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamModals;
