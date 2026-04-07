import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import LocalStorageStatus from './LocalStorageStatus';
import { clearImageCache, getImageCacheSize } from '../../utils/teamUtils';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

interface ToolsViewProps {
  subView: 'tools-admin' | 'tools-users' | 'tools-approvals' | 'tools-performance';
}

const ToolsView: React.FC<ToolsViewProps> = ({ subView }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [showCacheManager, setShowCacheManager] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Funções para os botões de acesso rápido
  const handleEditMember = (member: any) => {
    setEditingMember(member);
  };

  const handlePhotoUpload = async (file: File) => {
    if (!editingMember) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingMember.id}_${Date.now()}.${fileExt}`;
      const filePath = `members/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar o membro com a nova foto
      const updatedMember = { ...editingMember, foto: publicUrl };
      setEditingMember(updatedMember);
      
      console.log('Foto enviada com sucesso');
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
      const membersData = LocalStorageFirstService.get<any>('membros');
      setData(membersData || []);
      
      setEditingProfile(null); // Fechar o dropdown
      console.log(`Perfil atualizado para ${newProfile} com sucesso`);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  const handleToggleStatus = async (member: any) => {
    try {
      const newStatus = !member.ativo;
      
      // Atualizar usando LocalStorageFirstService
      LocalStorageFirstService.update('membros', member.id, { ativo: newStatus });
      
      // Recarregar dados
      const membersData = LocalStorageFirstService.get<any>('membros');
      setData(membersData || []);
      
      console.log(`Membro ${member.nome} ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao alterar status do membro:', error);
    }
  };

  const handleSaveMember = async (updatedMember: any) => {
    try {
      // Atualizar usando LocalStorageFirstService
      LocalStorageFirstService.update('membros', updatedMember.id, {
        nome: updatedMember.nome,
        email: updatedMember.email,
        telefone: updatedMember.telefone,
        data_nasc: updatedMember.data_nasc,
        ativo: updatedMember.ativo,
        perfil: updatedMember.perfil,
        foto: updatedMember.foto
      });
      
      // Recarregar dados
      const membersData = LocalStorageFirstService.get<any>('membros');
      setData(membersData || []);
      
      setEditingMember(null);
      console.log('Membro atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
    }
  };

  const profileOptions = [
    { value: 'User', label: 'User' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Lider', label: 'Lider' },
    { value: 'Advanced', label: 'Advanced' }
  ];

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
            // Buscar dados usando LocalStorageFirstService para consistência
            const membersData = LocalStorageFirstService.get<any>('membros');
            setData(membersData || []);
            
            // Tentar sincronizar em background
            LocalStorageFirstService.forceSync('membros').catch(() => {});
            break;
          case 'tools-approvals':
            setData([
              { id: 1, type: 'new_user', name: 'Carlos Oliveira', requestDate: '2024-02-06', status: 'pending' },
              { id: 2, type: 'role_change', name: 'Ana Silva', requestDate: '2024-02-05', status: 'pending' },
            ]);
            break;
          case 'tools-performance':
            setData({
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

  const renderContent = () => {
    switch (subView) {
      case 'tools-admin':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Painel Administrativo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-server text-emerald-600 dark:text-emerald-400 text-xl"></i>
                  </div>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Status do Sistema</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data?.systemStatus || 'Carregando...'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-database text-blue-600 dark:text-blue-400 text-xl"></i>
                  </div>
                  <i className="fas fa-chart-line text-blue-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Tamanho do BD</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data?.databaseSize || 'Carregando...'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-users text-purple-600 dark:text-purple-400 text-xl"></i>
                  </div>
                  <i className="fas fa-user-check text-purple-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Usuários Ativos</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data?.activeUsers || 'Carregando...'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-clock text-amber-600 dark:text-amber-400 text-xl"></i>
                  </div>
                  <i className="fas fa-history text-amber-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Último Backup</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{data?.lastBackup || 'Carregando...'}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="px-4 py-3 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors">
                  <i className="fas fa-sync-alt mr-2"></i> Sincronizar Dados
                </button>
                <button className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <i className="fas fa-download mr-2"></i> Backup Manual
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

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      O cache armazena imagens dos membros para uso offline. Imagens grandes (&gt;500KB) não são armazenadas automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'tools-users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Gerenciamento de Usuários</h2>
              <button className="px-4 py-2 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors">
                <i className="fas fa-plus mr-2"></i> Novo Usuário
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Perfil</th>
                      <th className="px-6 py-3 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Contato</th>
                      <th className="px-6 py-3 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Array.isArray(data) && data.map((member: any) => (
                      <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-brand text-white rounded-full flex items-center justify-center font-black text-sm mr-3 shrink-0">
                              {member.foto ? (
                                <img src={member.foto} alt={member.nome} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                member.nome?.charAt(0)?.toUpperCase() || 'M'
                              )}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-900 dark:text-white block">{member.nome || 'Sem nome'}</span>
                              {member.data_nasc && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(member.data_nasc).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-black rounded-full ${
                            member.ativo 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {member.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {member.email && (
                              <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
                                <i className="fas fa-envelope mr-2 text-slate-400"></i>
                                {member.email}
                              </div>
                            )}
                            {member.telefone && (
                              <div className="flex items-center text-xs text-slate-600 dark:text-slate-400">
                                <i className="fas fa-phone mr-2 text-slate-400"></i>
                                {member.telefone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditMember(member)}
                              className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
                              title="Editar"
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(member)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                member.ativo 
                                  ? 'bg-red-500 text-white hover:bg-red-600' 
                                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                              }`}
                              title={member.ativo ? 'Desativar' : 'Ativar'}
                            >
                              <i className={`fas ${member.ativo ? 'fa-ban' : 'fa-check'} text-xs`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'tools-approvals':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Aprovações Pendentes</h2>

            <div className="space-y-4">
              {Array.isArray(data) && data.map((request: any) => (
                <div key={request.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                        <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">{request.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {request.type === 'new_user' ? 'Novo Usuário' : 'Alteração de Função'} • {request.requestDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-colors">
                        <i className="fas fa-check mr-2"></i> Aprovar
                      </button>
                      <button className="px-4 py-2 bg-red-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-colors">
                        <i className="fas fa-times mr-2"></i> Rejeitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'tools-performance':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Desempenho do Sistema</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-chart-line text-blue-600 dark:text-blue-400 text-xl"></i>
                  </div>
                  <i className="fas fa-arrow-up text-emerald-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Total de Requisições</h3>
                <p className="text-2xl font-black text-brand">{data?.totalRequests?.toLocaleString() || '0'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-tachometer-alt text-emerald-600 dark:text-emerald-400 text-xl"></i>
                  </div>
                  <i className="fas fa-arrow-down text-red-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Tempo Médio</h3>
                <p className="text-2xl font-black text-brand">{data?.avgResponseTime || '0ms'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-amber-600 dark:text-amber-400 text-xl"></i>
                  </div>
                  <i className="fas fa-minus text-amber-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Taxa de Erro</h3>
                <p className="text-2xl font-black text-brand">{data?.errorRate || '0%'}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                    <i className="fas fa-heartbeat text-purple-600 dark:text-purple-400 text-xl"></i>
                  </div>
                  <i className="fas fa-arrow-up text-emerald-500"></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">Uptime</h3>
                <p className="text-2xl font-black text-brand">{data?.uptime || '99.9%'}</p>
              </div>
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

            {/* Status do LocalStorage-First */}
            <div className="mt-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4">Status do Cache Local</h3>
              <LocalStorageStatus />
            </div>
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
                      <img src={editingMember.foto} alt={editingMember.nome} className="w-full h-full object-cover" />
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
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300 mb-2">Nome</label>
                  <input
                    type="text"
                    value={editingMember.nome || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, nome: e.target.value })}
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
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => handleSaveMember(editingMember)}
                  className="flex-1 px-4 py-3 bg-brand text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-brand/90 transition-colors"
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
