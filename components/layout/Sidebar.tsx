import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { showSuccess, showError } from '../../utils/toast';
import { ViewType } from '../../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  brandColor: string;
  onColorChange: (color: string) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  onToggleTheme,
  brandColor,
  onColorChange,
  isProfileModalOpen,
  setIsProfileModalOpen
}) => {
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Usuário',
    email: '', // Garantir que sempre tenha um valor inicial
    password: '',
    perfil: 'Admin',
    foto: null
  });
  const [originalProfileData, setOriginalProfileData] = useState({
    name: 'Usuário',
    email: '',
    password: '',
    perfil: 'Admin',
    foto: null
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Carregar dados do usuário logado
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // 1. Buscar usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setCurrentUser(user);

          // Buscar dados do membro na tabela membros
          const { data: memberData } = await supabase
            .from('membros')
            .select('nome, email, foto, telefone, data_nasc, perfil')
            .eq('id', user.id)
            .single();

          // 3. Atualizar perfil com dados reais
          if (memberData) {
            const newProfileData = {
              name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Administrador do Sistema',
              email: user.email || '',
              password: '',
              perfil: memberData.perfil || 'Administrador',
              foto: memberData.foto
            };
            setProfileData(newProfileData);
            setOriginalProfileData(newProfileData); // Salvar dados originais
          } else {
            // Se não encontrar na tabela membros, usa dados do auth
            const newProfileData = {
              name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Administrador do Sistema',
              email: user.email || '',
              password: '',
              perfil: 'Administrador',
              foto: null
            };
            setProfileData(newProfileData);
            setOriginalProfileData(newProfileData); // Salvar dados originais
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        // Em caso de erro, manter os dados padrão
      }
    };

    loadUserData();
  }, []); // Executar apenas uma vez ao montar o componente

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Função para detectar campos alterados
  const getChangedFields = () => {
    const changed: any = {};

    if (profileData.name !== originalProfileData.name && profileData.name !== 'Administrador do Sistema') {
      changed.name = profileData.name;
    }

    if (profileData.email !== originalProfileData.email && profileData.email !== '') {
      changed.email = profileData.email;
    }

    // Senha não é mais alterada aqui - tem modal separado

    return changed;
  };

  // Função para alterar apenas a senha
  const handleChangePassword = async () => {
    // Proteger contra múltiplos cliques
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      // Validação de senha
      if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
        showError('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      // Validação de confirmação
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        showError('As senhas não coincidem');
        return;
      }

      // Atualizar senha no Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      showSuccess('Senha alterada com sucesso!');
      setIsPasswordModalOpen(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);

      // Tratamento específico de erros
      if (error.message?.includes('Password should be at least 6 characters')) {
        showError('A senha deve ter pelo menos 6 caracteres');
      } else if (error.message?.includes('email rate limit exceeded')) {
        showError('Muitas tentativas de alteração. Aguarde alguns minutos antes de tentar novamente.');
      } else if (error.message?.includes('For security purposes')) {
        showError('Aguarde alguns segundos antes de tentar novamente');
      } else if (error.message?.includes('rate limit')) {
        showError('Muitas tentativas. Aguarde um pouco antes de tentar novamente.');
      } else {
        showError('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    // Proteger contra múltiplos cliques
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showError('Usuário não encontrado');
        return;
      }

      // Detectar quais campos foram alterados
      const changedFields = getChangedFields();

      // Se nada foi alterado, não fazer nada
      if (Object.keys(changedFields).length === 0) {
        showError('Nenhuma alteração detectada');
        return;
      }

      // Validação de email (só se email foi alterado)
      if (changedFields.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(changedFields.email)) {
          showError('Email inválido');
          return;
        }
      }

      // Atualizar apenas os campos alterados
      const updateData: any = {};

      // Atualizar nome de exibição se foi alterado
      if (changedFields.name) {
        updateData.data = {
          display_name: changedFields.name
        };
      }

      // Atualizar email se foi alterado
      if (changedFields.email) {
        updateData.email = changedFields.email;
      }

      // Senha não é mais alterada aqui - tem modal separado

      // Só fazer a requisição se houver dados para atualizar
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase.auth.updateUser(updateData);

        if (error) throw error;

        // Atualizar os dados originais após sucesso
        setOriginalProfileData(prev => ({
          ...prev,
          ...changedFields,
          password: '' // Limpar senha após sucesso
        }));
      }

      showSuccess('Perfil atualizado com sucesso!');
      setIsProfileModalOpen(false);
      setProfileData(prev => ({ ...prev, password: '' }));
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);

      // Tratamento específico de erros
      if (error.message?.includes('Email address') && error.message?.includes('is invalid')) {
        showError('Email inválido');
      } else if (error.message?.includes('email rate limit exceeded')) {
        showError('Muitas tentativas de alteração de email. Aguarde alguns minutos antes de tentar novamente.');
      } else if (error.message?.includes('For security purposes')) {
        showError('Aguarde alguns segundos antes de tentar novamente');
      } else if (error.message?.includes('rate limit')) {
        showError('Muitas tentativas. Aguarde um pouco antes de tentar novamente.');
      } else {
        showError('Erro ao atualizar perfil. Tente novamente.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isProfileModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isProfileModalOpen]);

  const menuItems = [
    { id: 'dashboard', default: 'dashboard', label: 'Início', icon: 'fas fa-th-large' },
    { id: 'scales', default: 'list', label: 'Escalas', icon: 'fas fa-calendar-alt' },
    { id: 'music', default: 'music-list', label: 'Músicas', icon: 'fas fa-music' },
    { id: 'team', default: 'team', label: 'Equipe', icon: 'fas fa-users' },
    { id: 'tools', default: 'tools-admin', label: 'Ferramentas', icon: 'fas fa-tools' },
  ];

  const themeColors = ['#1e3a8a', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];

  const isActive = (id: string) => {
    if (id === 'dashboard') return currentView === 'dashboard';
    if (id === 'scales') return ['list', 'calendar', 'cleaning'].includes(currentView);
    if (id === 'music') return ['music-stats', 'music-list', 'music-repertoire', 'music-create', 'music-history'].includes(currentView);
    if (id === 'team') return ['team', 'attendance', 'approvals'].includes(currentView);
    if (id === 'tools') return ['tools-admin', 'tools-users', 'tools-approvals', 'tools-performance'].includes(currentView);
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 w-full h-16 lg:h-full lg:w-[280px] bg-white dark:bg-[#0f172a] border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-slate-800 flex lg:flex-col z-[100] transition-all">
      {/* LOGO DESKTOP - Restaurada */}
      <div className="hidden lg:flex flex-col items-center py-10 px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-col items-center">
            <i className="fas fa-cloud text-brand text-3xl"></i>
            <div className="flex gap-1 mt-1.5">
              <div className="w-1 h-3 bg-brand-gold rounded-full animate-pulse"></div>
              <div className="w-1 h-5 bg-brand-gold rounded-full animate-pulse delay-150"></div>
              <div className="w-1 h-3 bg-brand-gold rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
          <h2 className="text-xl font-extrabold tracking-tighter leading-none text-slate-800 dark:text-white uppercase text-center mt-2">
            Cloud <span className="text-brand">Worship</span>
          </h2>
        </div>
      </div>

      {/* MENU ITEMS - Scrollable area */}
      <div className="flex lg:flex-col flex-1 items-center lg:items-stretch lg:px-4 lg:py-2 gap-1 lg:gap-1.5 justify-around lg:justify-start lg:overflow-y-auto no-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.default as ViewType)}
            className={`
              flex flex-col lg:flex-row items-center gap-1 lg:gap-4 px-3 lg:px-5 py-2 lg:py-4 rounded-xl lg:rounded-2xl transition-all
              ${isActive(item.id)
                ? 'bg-brand text-white shadow-xl shadow-brand/20'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hover:bg-slate-50 lg:dark:hover:bg-slate-800/50'}
            `}
          >
            <i className={`${item.icon} text-lg w-6 text-center`}></i>
            <span className="text-[9px] lg:text-sm font-bold uppercase lg:capitalize tracking-widest lg:tracking-normal">{item.label}</span>
          </button>
        ))}
      </div>

      {/* FOOTER DESKTOP */}
      <div className="hidden lg:flex flex-col px-4 pb-6 gap-3 mt-auto border-t border-slate-50 dark:border-slate-800 pt-4">
        {/* Color Selectors */}
        <div className="flex flex-col rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 overflow-hidden">
          <button onClick={() => setIsThemeExpanded(!isThemeExpanded)} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Temas</span>
            <i className={`fas fa-chevron-up text-[9px] text-slate-400 transition-transform ${isThemeExpanded ? 'rotate-180' : ''}`}></i>
          </button>
          {isThemeExpanded && (
            <div className="px-4 pb-3 flex justify-between gap-1 animate-fade-in">
              {themeColors.map(color => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-6 h-6 rounded-lg border-2 transition-all ${brandColor === color ? 'border-brand/50 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2">
          <div onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-[10px] shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              {profileData.foto ? (
                <img
                  src={profileData.foto}
                  alt={profileData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-brand flex items-center justify-center">
                  {profileData.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col flex-1 truncate">
              <span className="text-[11px] font-black text-slate-800 dark:text-white truncate">{profileData.name}</span>
              <span className="text-[7px] font-bold text-brand uppercase tracking-widest">{profileData.perfil}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-12 h-[60px] flex items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all group"
            title="Sair do Sistema"
          >
            <i className="fas fa-sign-out-alt text-lg group-hover:scale-110 transition-transform"></i>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-brand transition-all font-black text-[9px] uppercase tracking-widest"
        >
          <i className={isDarkMode ? "fas fa-sun text-brand-gold" : "fas fa-moon text-brand"}></i>
          {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
        </button>
      </div>

      {/* MOBILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsProfileModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Configurações</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-times text-lg"></i></button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-2">
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-slate-50 dark:border-slate-800 shadow-xl overflow-hidden">
                  {profileData.foto ? (
                    <img
                      src={profileData.foto}
                      alt={profileData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <i className="fas fa-user text-2xl text-slate-300"></i>
                  )}
                </div>
              </div>
              <p className="text-[9px] font-black text-brand uppercase tracking-widest">{profileData.perfil}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Nome de Exibição</label>
                <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Email de Login</label>
                <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} placeholder="seu@email.com" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Alterar Senha</label>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full bg-gradient-to-r from-brand/10 to-brand/20 dark:from-brand/20 dark:to-brand/30 border border-brand/30 dark:border-brand/40 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-brand/50 text-left text-brand dark:text-brand/90 hover:from-brand/20 hover:to-brand/30 dark:hover:from-brand/30 dark:hover:to-brand/40 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-brand/10 dark:from-brand/10 dark:to-brand/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <i className="fas fa-lock text-brand/70 dark:text-brand/80 group-hover:scale-110 transition-transform duration-300"></i>
                      <span className="group-hover:text-brand dark:group-hover:text-brand transition-colors duration-300">Alterar senha</span>
                    </span>
                    <i className="fas fa-arrow-right text-brand/50 dark:text-brand/60 group-hover:translate-x-1 transition-transform duration-300"></i>
                  </div>
                </button>
              </div>

              <div className="lg:hidden space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block ml-1">Temas</label>
                <div className="flex justify-between">
                  {themeColors.map(color => (
                    <button
                      key={color}
                      onClick={() => onColorChange(color)}
                      className={`w-8 h-8 rounded-xl border-4 transition-all ${brandColor === color ? 'border-brand/30 scale-110 shadow-lg' : 'border-transparent opacity-80'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button onClick={onToggleTheme} className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[8px] border border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2">
                  <i className={`fas ${isDarkMode ? 'fa-sun text-brand-gold' : 'fa-moon text-brand'}`}></i>
                  Alternar Modo
                </button>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[9px]">Fechar</button>
              <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-3.5 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Alteração de Senha */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 lg:p-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsPasswordModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl animate-fade-in border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Alterar Senha</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-times text-lg"></i></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Nova Senha</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Digite a nova senha"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Confirmar Senha</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirme a nova senha"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                disabled={isSaving}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[9px] border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSaving}
                className="flex-1 py-3.5 bg-brand text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;
