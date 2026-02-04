import React, { useState, useEffect } from 'react';
import { Member, ScheduleEvent } from '../../types';
import { showSuccess, showError } from '../../utils/toast';
import { supabase } from '../../supabaseClient';
import { logger } from '../../utils/logger';
import AvisoGeralService, { AvisoGeral } from '../../services/AvisoGeralService';

interface TeamModalsProps {
  selectedMember: Member | null;
  editingMember: Member | null;
  viewingEvent: ScheduleEvent | null;
  onSelectedMemberChange: (member: Member | null) => void;
  onEditingMemberChange: (member: Member | null) => void;
  onViewingEventChange: (event: ScheduleEvent | null) => void;
  onMembersChange: (members: Member[]) => void;
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
  const [isInactiveExpanded, setIsInactiveExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avisosGerais, setAvisosGerais] = useState<AvisoGeral[]>([]);
  const [loadingAvisos, setLoadingAvisos] = useState(false);
  const [availableFunctions, setAvailableFunctions] = useState<any[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

  // Função para abrir WhatsApp com o membro
  const handleWhatsAppContact = (member: Member) => {
    const message = encodeURIComponent(`Olá ${member.name}! Tudo bem?`);
    
    // Abre WhatsApp Web com mensagem personalizada
    window.open(`https://web.whatsapp.com/send?text=${message}`, '_blank');
  };

  // Função para editar membro
  const handleEditMember = (member: Member) => {
    // Fecha o modal atual e abre o modal de edição
    onSelectedMemberChange(null);
    onEditingMemberChange(member);
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
      // Limpar o nome do arquivo para remover caracteres especiais
      const sanitizedName = editingMember.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9]/g, '_') // Substitui caracteres especiais por _
        .toLowerCase();

      const fileExt = file.name.split('.').pop();
      const fileName = `${sanitizedName}.${fileExt}`;
      const filePath = `membros/${fileName}`;

      // Apagar foto antiga se existir
      if (editingMember.foto && !editingMember.foto.includes('freepik.com')) {
        try {
          // Extrair o path da URL antiga
          const oldUrl = new URL(editingMember.foto);
          const oldPath = oldUrl.pathname.split('/').slice(-2).join('/'); // pega "membros/nome_arquivo.ext"
          
          const { error: deleteError } = await supabase.storage
            .from('public-assets')
            .remove([oldPath]);
          
          if (deleteError) {
            logger.warn('Não foi possível apagar a foto antiga:', deleteError, 'ui');
          }
        } catch (deleteError) {
          logger.warn('Erro ao tentar apagar foto antiga:', deleteError, 'ui');
        }
      }

      // Fazer upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // Atualizar o avatar no estado do modal
      onEditingMemberChange({
        ...editingMember,
        foto: publicUrl
      });

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
    email?: string; 
    telefone?: string; 
    data_nasc?: string; 
    foto?: string 
  }) => {
    try {
      if (!editingMember) return;
      
      // Atualiza na tabela membros
      const { error: memberError } = await supabase
        .from('membros')
        .update({
          foto: updatedMember.foto,
          telefone: updatedMember.telefone,
          email: updatedMember.email,
          data_nasc: updatedMember.data_nasc
        })
        .eq('id', editingMember.id);

      if (memberError) throw memberError;

      // Atualiza as funções na tabela membros_funcoes
      // 1. Remove todas as funções atuais
      const { error: deleteError } = await supabase
        .from('membros_funcoes')
        .delete()
        .eq('id_membro', editingMember.id);

      if (deleteError) throw deleteError;

      // 2. Insere as novas funções selecionadas
      if (selectedFunctions.length > 0) {
        const newFunctions = selectedFunctions.map(functionId => ({
          id_membro: editingMember.id,
          id_funcao: parseInt(functionId)
        }));

        const { error: insertError } = await supabase
          .from('membros_funcoes')
          .insert(newFunctions);

        if (insertError) throw insertError;
      }

      // Atualiza email na tabela auth.users se fornecido
      if (updatedMember.email && updatedMember.email !== editingMember.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          editingMember.id,
          { email: updatedMember.email }
        );

        if (authError) {
          console.warn('Aviso: Não foi possível atualizar o email na tabela auth.users:', authError.message);
          // Não falhar a operação principal, apenas avisar
        }
      }

      // Atualiza o estado local
      onMembersChange(prev => prev.map(m => 
        m.id === editingMember.id 
          ? { 
              ...m, 
              foto: updatedMember.foto || m.foto,
              telefone: updatedMember.telefone || m.telefone,
              email: updatedMember.email || m.email,
              data_nasc: updatedMember.data_nasc || m.data_nasc,
              role: selectedFunctions.length > 0 
                ? availableFunctions
                    .filter(f => selectedFunctions.includes(f.id.toString()))
                    .map(f => f.nome_funcao)
                    .join(', ')
                : 'Sem função'
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

  // Buscar funções disponíveis e funções do membro ao abrir modal de edição
  useEffect(() => {
    if (editingMember) {
      fetchAvailableFunctions();
      fetchMemberFunctions();
    }
  }, [editingMember]);

  const fetchAvailableFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('funcao')
        .select('*')
        .order('nome_funcao');
      
      if (error) throw error;
      setAvailableFunctions(data || []);
    } catch (error) {
      logger.error('Erro ao buscar funções:', error, 'database');
    }
  };

  const fetchMemberFunctions = async () => {
    if (!editingMember) return;
    
    try {
      const { data, error } = await supabase
        .from('membros_funcoes')
        .select('id_funcao')
        .eq('id_membro', editingMember.id);
      
      if (error) throw error;
      const functionIds = (data || []).map(mf => mf.id_funcao.toString());
      setSelectedFunctions(functionIds);
    } catch (error) {
      logger.error('Erro ao buscar funções do membro:', error, 'database');
    }
  };

  const fetchAvisosGerais = async () => {
    if (!selectedMember) return;
    
    setLoadingAvisos(true);
    try {
      const avisos = await AvisoGeralService.getAvisosByMembro(selectedMember.id);
      setAvisosGerais(avisos);
    } catch (error) {
      logger.error('Erro ao buscar avisos gerais:', error, 'ui');
      // Não mostrar erro para o usuário, apenas log
    } finally {
      setLoadingAvisos(false);
    }
  };

  const openScaleDetail = (eventId: string) => {
    // Mock function - implementar lógica real
    console.log('Opening scale detail for:', eventId);
  };

  return (
    <>
      {/* Modal de Membro - Centralizado apenas na área de conteúdo (ignorando navbar) */}
      {selectedMember && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-10 py-20 lg:py-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/90 to-slate-950/95 dark:from-slate-950/90 dark:via-black/95 dark:to-black/98 backdrop-blur-xl" onClick={() => onSelectedMemberChange(null)}></div>

          <div className="relative w-full max-w-lg bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-[3rem] shadow-2xl border border-white/10 dark:border-slate-700/50 overflow-hidden animate-fade-in max-h-[75vh] lg:max-h-[85vh] flex flex-col lg:ml-64">
            {/* Header com gradiente */}
            <div className="relative p-6 pb-4 bg-gradient-to-r from-brand/5 via-brand/10 to-brand/5 dark:from-brand/10 dark:via-brand/20 dark:to-brand/10 border-b border-slate-100/50 dark:border-slate-800/50 z-10 shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-brand uppercase tracking-widest bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-brand/20">Perfil do Membro</span>
                </div>
                <button onClick={() => onSelectedMemberChange(null)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar flex-grow space-y-6">
              {/* Seção Perfil */}
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-pink-500/20 rounded-full blur-xl animate-pulse"></div>
                  <img 
                    src={selectedMember.avatar} 
                    alt={selectedMember.name}
                    className="relative w-24 h-24 rounded-full border-4 border-white shadow-2xl ring-4 ring-brand/10"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-none mb-2">
                    {selectedMember.name}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300">
                      {selectedMember.role}
                    </span>
                    <span className={`px-3 py-1 rounded-full border text-[10px] font-black ${
                      selectedMember.gender === 'M' 
                        ? 'bg-gradient-to-r from-brand/10 to-brand/5 border-brand/20 text-brand' 
                        : 'bg-gradient-to-r from-pink-500/10 to-pink-500/5 border-pink-500/20 text-pink-500'
                    }`}>
                      {selectedMember.gender === 'M' ? 'Masculino' : 'Feminino'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Próximas Escalas */}
              <div className="space-y-4">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Próximas Escalas</h4>
                <div className="space-y-3">
                  {selectedMember.upcomingScales && selectedMember.upcomingScales.length > 0 ? (
                    selectedMember.upcomingScales.map((s, idx) => (
                      <button key={idx} onClick={() => openScaleDetail(s.id)} className="w-full bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30 px-5 py-4 rounded-[2rem] border border-slate-100/50 dark:border-slate-700/50 flex justify-between items-center group transition-all hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10 active:scale-[0.98]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50 dark:border-slate-600/50 shadow-md">
                            <span className="text-[8px] font-black text-slate-400 leading-none">{s.date.split('/')[1]}</span>
                            <span className="text-lg font-black text-brand leading-none mt-1">{s.date.split('/')[0]}</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase block mb-1">{s.event}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{s.role}</span>
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
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
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
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Repertório Recente</h4>
                  <div className="space-y-3">
                    {selectedMember.songHistory && selectedMember.songHistory.length > 0 ? (
                      selectedMember.songHistory.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-50 dark:border-slate-800 flex-nowrap">
                          <div className="w-16 h-12 bg-gradient-to-br from-brand to-brand/80 text-white rounded-2xl shadow-lg flex items-center justify-center font-black text-[10px] flex-shrink-0 p-1">{h.key}</div>
                          <div className="flex-1 min-w-0 text-left">
                            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 truncate block">{h.song}</span>
                            <div className="flex items-center gap-2 text-[8px] text-slate-400">
                              <span>{h.date}</span>
                              <span>•</span>
                              <span>{h.event}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <i className="fas fa-music text-slate-300 text-xl"></i>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Nenhuma música registrada</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Avisos Gerais - Apenas se houver avisos */}
              {!loadingAvisos && avisosGerais.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Avisos Gerais</h4>
                  <div className="space-y-3">
                    {avisosGerais.map((aviso) => (
                      <div key={aviso.id.toString()} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl flex items-center justify-center flex-shrink-0">
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

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button 
                onClick={() => handleWhatsAppContact(selectedMember)}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-emerald-600"
              >
                <i className="fab fa-whatsapp"></i> WhatsApp
              </button>
              <button 
                onClick={() => handleEditMember(selectedMember)}
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Membro */}
      {editingMember && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 lg:p-10 py-20 lg:py-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/90 to-slate-950/95 dark:from-slate-950/90 dark:via-black/95 dark:to-black/98 backdrop-blur-xl" onClick={() => onEditingMemberChange(null)}></div>

          <div className="relative w-full max-w-lg bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-[3rem] shadow-2xl border border-white/10 dark:border-slate-700/50 overflow-hidden animate-fade-in max-h-[75vh] lg:max-h-[85vh] flex flex-col lg:ml-64">
            {/* Header */}
            <div className="relative p-6 pb-4 bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/10 dark:via-emerald-500/20 dark:to-emerald-500/10 border-b border-slate-100/50 dark:border-slate-800/50 z-10 shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-emerald-500/20">Editar Membro</span>
                </div>
                <button onClick={() => onEditingMemberChange(null)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8 overflow-y-auto no-scrollbar flex-grow space-y-6">
              {/* Formulário de Edição Simplificado */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Foto do Membro</label>
                  
                  {/* Preview da foto atual */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                      {editingMember.foto ? (
                        <img 
                          src={editingMember.foto} 
                          alt={editingMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <i className="fas fa-user text-slate-400"></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        {editingMember.foto ? 'Foto atual' : 'Sem foto'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Formato: JPG, PNG (máx. 5MB)
                      </div>
                    </div>
                  </div>

                  {/* Upload de nova foto */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                      disabled={uploading}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Enviando...</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={editingMember.telefone || ''}
                    onChange={(e) => onEditingMemberChange({...editingMember, telefone: e.target.value})}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <input
                    type="email"
                    value={editingMember.email || ''}
                    onChange={(e) => onEditingMemberChange({...editingMember, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Funções</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-800">
                    {availableFunctions.map((func) => (
                      <label key={func.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          value={func.id}
                          checked={selectedFunctions.includes(func.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFunctions([...selectedFunctions, func.id.toString()]);
                            } else {
                              setSelectedFunctions(selectedFunctions.filter(id => id !== func.id.toString()));
                            }
                          }}
                          className="w-4 h-4 text-brand border-slate-300 rounded focus:ring-brand focus:ring-2"
                        />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                          {func.nome_funcao}
                        </span>
                      </label>
                    ))}
                    {availableFunctions.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-2">
                        Nenhuma função disponível
                      </p>
                    )}
                  </div>
                  {selectedFunctions.length > 0 && (
                    <p className="text-[9px] text-slate-400 mt-1">
                      {selectedFunctions.length} função(ões) selecionada(s)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    value={editingMember.data_nasc || ''}
                    onChange={(e) => onEditingMemberChange({...editingMember, data_nasc: e.target.value})}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
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
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 lg:p-6 py-20 lg:py-10 overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => onViewingEventChange(null)}></div>
          <div className="relative w-full max-w-2xl bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[75vh] lg:max-h-[85vh] border border-slate-100 dark:border-slate-800 lg:ml-64">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand text-white flex flex-col items-center justify-center font-black">
                  <span className="text-[9px] uppercase leading-none mb-1">{viewingEvent.dayOfWeek}</span>
                  <span className="text-lg leading-none">{viewingEvent.date.split('/')[0]}</span>
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase leading-none tracking-tighter">{viewingEvent.title}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">{viewingEvent.time} • Detalhes do Culto</span>
                </div>
              </div>
              <button onClick={() => onViewingEventChange(null)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors border border-slate-100 dark:border-slate-800 shadow-sm"><i className="fas fa-times"></i></button>
            </div>

            <div className="p-8 pt-4 overflow-y-auto no-scrollbar flex-grow space-y-8">
              {/* Conteúdo do modal de detalhes */}
              <div className="text-center py-20">
                <i className="fas fa-calendar-check text-4xl text-brand mb-4"></i>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Detalhes do evento em desenvolvimento</p>
              </div>
            </div>

            <div className="p-8 bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
              <button onClick={() => onViewingEventChange(null)} className="flex-1 py-4 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand/20">Ok, entendi</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamModals;
