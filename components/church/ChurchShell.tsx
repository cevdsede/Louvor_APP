import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useMinistryContext } from '../../contexts/MinistryContext';
import useLocalStorageFirst from '../../hooks/useLocalStorageFirst';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';
import { SupabaseMembro, SupabasePermissaoIgreja } from '../../types-supabase';
import ChurchAdmin from './ChurchAdmin';
import ChurchAgenda from './ChurchAgenda';
import ChurchDashboard from './ChurchDashboard';
import ChurchMembers from './ChurchMembers';
import SiteEditor from './SiteEditor';
import { buildLocalAvatar } from '../../utils/avatar';
import { compressImageFile } from '../../utils/imageCompression';
import { buildMemberPhotoPath, getPublicAssetsPathFromUrl, sanitizeImageUrl } from '../../utils/imageUrl';
import logger from '../../utils/logger';
import { showError, showSuccess } from '../../utils/toast';

type ChurchView = 'dashboard' | 'agenda' | 'members' | 'site' | 'admin';

const normalize = (value?: string | null) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface ChurchShellProps {
  onOpenMinistry: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  brandColor: string;
  onColorChange: (color: string) => void;
}

const themeColors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];

const ChurchShell: React.FC<ChurchShellProps> = ({
  onOpenMinistry,
  isDarkMode,
  onToggleTheme,
  brandColor,
  onColorChange
}) => {
  const [currentView, setCurrentView] = useState<ChurchView>('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const { currentMember, userMinisterios, isGlobalAdmin } = useMinistryContext();
  const { data: membersRaw } = useLocalStorageFirst<SupabaseMembro>({ table: 'membros' });
  const { data: permissionsRaw } = useLocalStorageFirst<SupabasePermissaoIgreja>({ table: 'permissoes_igreja' });
  const currentMemberRecord = useMemo(
    () => (membersRaw || []).find((member) => member.id === currentMember?.id) || null,
    [currentMember?.id, membersRaw]
  );

  const canOpenAdmin = useMemo(() => {
    const profile = normalize(currentMember?.perfil);
    const explicitPermission = (permissionsRaw || []).some(
      (permission) => permission.membro_id === currentMember?.id && permission.gerenciar_eventos_igreja
    );
    return isGlobalAdmin || profile.includes('pastor') || profile.includes('admin') || explicitPermission;
  }, [currentMember?.id, currentMember?.perfil, isGlobalAdmin, permissionsRaw]);

  const menuItems: Array<{ id: ChurchView; label: string; icon: string; visible: boolean }> = [
    { id: 'dashboard', label: 'Inicio', icon: 'fas fa-house', visible: true },
    { id: 'agenda', label: 'Agenda', icon: 'fas fa-calendar-days', visible: true },
    { id: 'members', label: 'Membros', icon: 'fas fa-users', visible: true },
    { id: 'site', label: 'Site', icon: 'fas fa-globe', visible: canOpenAdmin },
    { id: 'admin', label: 'Admin', icon: 'fas fa-sliders', visible: canOpenAdmin }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    if (!currentMemberRecord) return;
    setProfileName(currentMemberRecord.nome || '');
    setProfileEmail(currentMemberRecord.email || '');
    setProfilePhoto(sanitizeImageUrl(currentMemberRecord.foto));
  }, [currentMemberRecord]);

  const handleProfilePhotoChange = async (file: File | null) => {
    if (!file || !currentMember?.id) return;

    setIsSavingProfile(true);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 720, maxHeight: 720, quality: 0.72 });
      const filePath = buildMemberPhotoPath(currentMember.id, profileName || currentMemberRecord?.nome);
      const { error: uploadError } = await supabase.storage.from('public-assets').upload(filePath, compressed, {
        cacheControl: '31536000',
        contentType: compressed.type,
        upsert: false
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage.from('public-assets').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('membros').update({ foto: publicUrl }).eq('id', currentMember.id);
      if (updateError) throw updateError;

      const previousPhotoPath = getPublicAssetsPathFromUrl(profilePhoto || currentMemberRecord?.foto);
      if (previousPhotoPath && previousPhotoPath !== filePath) {
        const { error: removeError } = await supabase.storage.from('public-assets').remove([previousPhotoPath]);
        if (removeError) {
          logger.warn('Não foi possível apagar a foto antiga do perfil:', removeError, 'database');
        }
      }

      setProfilePhoto(publicUrl);
      await LocalStorageFirstService.forceSync('membros');
      showSuccess('Foto atualizada.');
    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      showError('Erro ao atualizar foto.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentMember?.id) return;

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('membros')
        .update({
          nome: profileName.trim(),
          display_name: profileName.trim(),
          email: profileEmail.trim().toLowerCase()
        })
        .eq('id', currentMember.id);
      if (error) throw error;

      const authPayload: any = { data: { display_name: profileName.trim() } };
      if (profileEmail.trim().toLowerCase() !== currentMemberRecord?.email?.toLowerCase()) {
        authPayload.email = profileEmail.trim().toLowerCase();
      }

      const { error: authError } = await supabase.auth.updateUser(authPayload);
      if (authError) throw authError;

      await LocalStorageFirstService.forceSync('membros');
      setIsProfileOpen(false);
      showSuccess('Perfil atualizado.');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      showError('Erro ao salvar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('As senhas nao coincidem.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordOpen(false);
      showSuccess('Senha alterada.');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      showError('Erro ao alterar senha.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white transition-colors duration-300 dark:from-slate-900 dark:to-slate-800">
      <header className="fixed inset-x-0 top-0 z-[90] flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#0f172a]/95 lg:hidden">
        <div className="min-w-0">
          <p className="text-[8px] font-black uppercase tracking-[0.28em] text-brand">Valentes</p>
          <p className="truncate text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">
            {currentMember?.nome || 'Membro'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800"
            aria-label="Abrir perfil"
          >
            <img
              src={profilePhoto || buildLocalAvatar(currentMember?.nome || 'Usuario')}
              alt={currentMember?.nome || 'Usuario'}
              className="h-full w-full object-cover"
            />
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
            aria-label="Alternar tema"
          >
            <i className={isDarkMode ? 'fas fa-sun text-brand-gold' : 'fas fa-moon text-brand'} />
          </button>
        </div>
      </header>

      <aside className="fixed inset-x-0 bottom-2 z-[100] mx-auto flex min-h-16 w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] rounded-2xl border border-slate-100 bg-white shadow-xl transition-all dark:border-slate-800 dark:bg-[#0f172a] sm:bottom-3 sm:w-[calc(100%-1.5rem)] sm:max-w-[720px] lg:inset-x-auto lg:bottom-0 lg:left-0 lg:mx-0 lg:h-full lg:w-[280px] lg:max-w-none lg:flex-col lg:rounded-none lg:border-r lg:border-b-0 lg:border-l-0 lg:border-t-0 lg:shadow-none">
        <div className="hidden flex-col items-center px-6 py-10 lg:flex">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 shadow-md dark:bg-brand/20">
              <i className="fa-solid fa-shield text-5xl text-transparent [-webkit-text-stroke:2px_var(--brand-primary)]" />
              <i className="fa-solid fa-crown absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[55%] text-base text-brand-gold" />
            </div>
            <h2 className="mt-2 text-center text-xl font-extrabold uppercase leading-none tracking-tighter text-slate-800 dark:text-white">
              Valentes <span className="text-brand">Connected</span>
            </h2>
          </div>
        </div>

        <nav className="flex w-full flex-1 items-center justify-center gap-1 px-1.5 no-scrollbar lg:w-auto lg:flex-col lg:items-stretch lg:justify-start lg:gap-1.5 lg:overflow-y-auto lg:px-4 lg:py-2">
          {menuItems
            .filter((item) => item.visible)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                className={`flex min-w-0 flex-1 max-w-none flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-all lg:flex-none lg:flex-row lg:justify-start lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 ${
                  currentView === item.id
                    ? 'bg-brand text-white shadow-xl shadow-brand/20'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hover:bg-slate-50 lg:dark:hover:bg-slate-800/50'
                }`}
              >
                <i className={`${item.icon} w-5 text-center text-base lg:w-6 lg:text-lg`} />
                <span className="w-full max-w-full whitespace-normal break-words text-center text-[8px] font-bold uppercase leading-[1.05] tracking-normal lg:w-auto lg:break-normal lg:text-sm lg:capitalize">
                  {item.label}
                </span>
              </button>
            ))}

          {(userMinisterios.length > 0 || isGlobalAdmin) && (
            <button
              type="button"
              onClick={onOpenMinistry}
              className="flex min-w-0 flex-1 max-w-none flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-400 transition-all hover:text-slate-600 dark:hover:text-slate-200 lg:flex-none lg:flex-row lg:justify-start lg:gap-4 lg:rounded-2xl lg:px-5 lg:py-4 lg:hover:bg-slate-50 lg:dark:hover:bg-slate-800/50"
            >
              <i className="fas fa-layer-group w-5 text-center text-base lg:w-6 lg:text-lg" />
              <span className="w-full max-w-full whitespace-normal break-words text-center text-[8px] font-bold uppercase leading-[1.05] tracking-normal lg:w-auto lg:break-normal lg:text-sm lg:capitalize">
                Ministerios
              </span>
            </button>
          )}
        </nav>

        <div className="mt-auto hidden flex-col gap-3 border-t border-slate-50 px-4 pb-6 pt-4 dark:border-slate-800 lg:flex">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => setIsThemeExpanded(!isThemeExpanded)}
              className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
            >
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Temas</span>
              <i className={`fas fa-chevron-up text-[9px] text-slate-400 transition-transform ${isThemeExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isThemeExpanded && (
              <div className="flex justify-between gap-1 px-4 pb-3 animate-fade-in">
                {themeColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onColorChange(color)}
                    className={`h-6 w-6 rounded-lg border-2 transition-all ${
                      brandColor === color ? 'scale-110 border-brand/50' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="group flex flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-left transition-all hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800"
            >
              <img
                src={profilePhoto || buildLocalAvatar(currentMember?.nome || 'Usuario')}
                alt={currentMember?.nome || 'Usuario'}
                className="h-9 w-9 rounded-full object-cover shadow-sm transition-transform group-hover:scale-105"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[11px] font-black text-slate-800 dark:text-white">
                  {currentMember?.nome || 'Membro'}
                </span>
                <span className="text-[7px] font-bold uppercase tracking-widest text-brand">{currentMember?.perfil || 'user'}</span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="group flex h-[60px] w-12 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500 transition-all hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              title="Sair do Sistema"
            >
              <i className="fas fa-sign-out-alt text-lg transition-transform group-hover:scale-110" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all hover:text-brand dark:border-slate-700 dark:bg-slate-800"
          >
            <i className={isDarkMode ? 'fas fa-sun text-brand-gold' : 'fas fa-moon text-brand'} />
            {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>
        </div>
      </aside>

      <main className="min-h-screen bg-slate-50 pb-28 pt-16 dark:bg-slate-800 sm:pb-32 lg:ml-[280px] lg:pb-0 lg:pt-0">
        <div className="container mx-auto px-3 py-5 sm:px-6 lg:px-8">
          {currentView === 'dashboard' && <ChurchDashboard currentMember={(currentMemberRecord || currentMember) as SupabaseMembro | null} />}
          {currentView === 'agenda' && <ChurchAgenda />}
          {currentView === 'members' && <ChurchMembers />}
          {currentView === 'site' && <SiteEditor />}
          {currentView === 'admin' && <ChurchAdmin currentUserId={currentMember?.id || null} isAdmin={isGlobalAdmin} />}
        </div>
      </main>

      {isProfileOpen && (
        <div className="fixed inset-0 z-[700] overflow-y-auto px-3 py-4 pb-24 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsProfileOpen(false)} />
          <div className="flex min-h-full items-start justify-center sm:items-center">
            <div className="relative mx-auto mt-2 max-h-[calc(100dvh-7rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-slate-100 bg-white p-5 shadow-2xl animate-fade-in no-scrollbar dark:border-slate-800 dark:bg-slate-900 sm:max-h-[90vh] sm:rounded-[2.5rem] sm:p-6 lg:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800 dark:text-white">Configuracoes</h2>
                <button type="button" onClick={() => setIsProfileOpen(false)} className="text-slate-400 transition-colors hover:text-red-500">
                  <i className="fas fa-times text-lg" />
                </button>
              </div>

              <div className="mb-6 flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-slate-50 bg-slate-100 shadow-xl dark:border-slate-800 dark:bg-slate-800">
                    <img
                      src={profilePhoto || buildLocalAvatar(profileName || 'Usuario')}
                      alt={profileName || 'Usuario'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/20 transition hover:brightness-110">
                    <i className="fas fa-camera text-xs" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleProfilePhotoChange(event.target.files?.[0] || null)}
                    />
                  </label>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-brand">{currentMember?.perfil || 'user'}</p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-400">Nome</span>
                  <input
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-400">Email de Login</span>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(event) => setProfileEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>

                <div>
                  <label className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-400">Alterar Senha</label>
                  <button
                    type="button"
                    onClick={() => setIsPasswordOpen(true)}
                    className="group relative w-full overflow-hidden rounded-xl border border-brand/30 bg-gradient-to-r from-brand/10 to-brand/20 px-4 py-3 text-left text-xs font-bold text-brand outline-none transition-all duration-300 hover:from-brand/20 hover:to-brand/30 focus:ring-2 focus:ring-brand/50 dark:border-brand/40 dark:from-brand/20 dark:to-brand/30 dark:text-brand/90 dark:hover:from-brand/30 dark:hover:to-brand/40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-brand/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-brand/10 dark:to-brand/20" />
                    <div className="relative flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <i className="fas fa-lock text-brand/70 transition-transform duration-300 group-hover:scale-110 dark:text-brand/80" />
                        <span className="transition-colors duration-300 group-hover:text-brand dark:group-hover:text-brand">Alterar senha</span>
                      </span>
                      <i className="fas fa-arrow-right text-brand/50 transition-transform duration-300 group-hover:translate-x-1 dark:text-brand/60" />
                    </div>
                  </button>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800 lg:hidden">
                  <label className="ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-400">Temas</label>
                  <div className="flex justify-between">
                    {themeColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onColorChange(color)}
                        className={`h-8 w-8 rounded-xl border-4 transition-all ${
                          brandColor === color ? 'scale-110 border-brand/30 shadow-lg' : 'border-transparent opacity-80'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTheme}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 py-3 text-[8px] font-black uppercase tracking-widest text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <i className={`fas ${isDarkMode ? 'fa-sun text-brand-gold' : 'fa-moon text-brand'}`} />
                    Alternar Modo
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-[8px] font-black uppercase tracking-widest text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  >
                    <i className="fas fa-sign-out-alt" />
                    Sair do Sistema
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-800"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={handleSaveProfile}
                  className="flex-1 rounded-xl bg-brand py-3.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingProfile ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPasswordOpen && (
        <div className="fixed inset-0 z-[760] overflow-y-auto px-3 py-4 pb-24 sm:p-4 lg:p-8">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsPasswordOpen(false)} />
          <div className="flex min-h-full items-start justify-center sm:items-center">
            <div className="relative mx-auto mt-2 max-h-[calc(100dvh-7rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-slate-100 bg-white p-5 shadow-2xl animate-fade-in no-scrollbar dark:border-slate-800 dark:bg-slate-900 sm:max-h-[90vh] sm:rounded-[2.5rem] sm:p-6 lg:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800 dark:text-white">Alterar Senha</h2>
                <button type="button" onClick={() => setIsPasswordOpen(false)} className="text-slate-400 transition-colors hover:text-red-500">
                  <i className="fas fa-times text-lg" />
                </button>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-400">Nova Senha</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Digite a nova senha"
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 ml-1 block text-[8px] font-black uppercase tracking-widest text-slate-400">Confirmar Senha</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirme a nova senha"
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  disabled={isSavingProfile}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={handleChangePassword}
                  className="flex-1 rounded-xl bg-brand py-3.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingProfile ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchShell;
