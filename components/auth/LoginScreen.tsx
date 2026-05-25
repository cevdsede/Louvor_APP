import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { logger } from '../../utils/logger';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Entrando...');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingMessage('Autenticando...');

    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.username,
        password: formData.password
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('Email ou senha incorretos. Tente novamente.');
        } else {
          setError(`Erro ao fazer login: ${error.message}`);
        }
      } else {
        const { error: memberError } = await supabase
          .from('membros')
          .select('id, nome')
          .eq('id', data.user.id)
          .maybeSingle();

        if (memberError) {
          logger.warn('Login autenticado, mas nao foi possivel carregar o cadastro do membro:', memberError, 'database');
        }

        LocalStorageFirstService.requestFullSync();
        setLoadingMessage('Preparando acesso...');

        try {
          LocalStorageFirstService.init({
            syncInterval: 2 * 60 * 1000,
            enableBackgroundSync: true,
            priorityLocal: true
          });
          await LocalStorageFirstService.syncPriorityTables([
            'membros',
            'ministerios',
            'membros_ministerios',
            'cultos',
            'escalas',
            'avisos_cultos',
            'nome_cultos',
            'funcao'
          ]);
        } catch (syncError) {
          logger.warn('Login concluido, mas o bootstrap local falhou. O app continuara com os dados ja salvos.', syncError, 'database');
        }

        onLogin();
        void LocalStorageFirstService.bootstrapApplication({
          force: true,
          preloadImages: true
        }).catch((syncError) => {
          logger.warn('Sincronizacao completa em segundo plano falhou apos o login.', syncError, 'database');
        });
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
      logger.error('Erro no login:', err, 'auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = () => {
    window.history.pushState({}, '', '/#/cadastro');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <div className="bg-app-shell relative flex min-h-screen items-center justify-center overflow-hidden p-6 transition-colors duration-300">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/45 to-transparent dark:from-white/5" />
      <div className="absolute -right-16 top-[-8%] h-[320px] w-[320px] rounded-full bg-brand/10 blur-[100px]" />
      <div className="absolute -left-16 bottom-[-8%] h-[320px] w-[320px] rounded-full bg-brand-gold/10 blur-[100px]" />

      <div className="app-card relative w-full max-w-md rounded-[3rem] border p-10 backdrop-blur-xl animate-fade-in lg:p-14">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-brand/10 p-2 shadow-md dark:bg-brand/20">
              <img src="/VC.svg" alt="Valentes Connected" className="h-full w-full object-contain" />
            </div>
          </div>
          <h2 className="text-app text-center text-2xl font-black uppercase leading-none tracking-tighter">
            Valentes <span className="text-brand">Connected</span>
          </h2>
          <p className="text-app-muted mt-3 text-[10px] font-bold uppercase tracking-widest">Acesso Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 animate-fade-in dark:border-red-500/20 dark:bg-red-950/30">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/60">
              <i className="fas fa-exclamation-triangle text-xs text-red-500 dark:text-red-400"></i>
            </div>
            <p className="flex-1 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-red-600 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-app-muted ml-1 text-[10px] font-black uppercase tracking-widest">Email</label>
            <div className="group relative">
              <div className="text-app-muted absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-brand">
                <i className="fas fa-envelope text-sm"></i>
              </div>
              <input
                type="email"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="seu@email.com"
                className="app-input-strong w-full rounded-2xl py-4 pl-14 pr-6 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-app-muted ml-1 text-[10px] font-black uppercase tracking-widest">Senha</label>
            <div className="group relative">
              <div className="text-app-muted absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-brand">
                <i className="fas fa-lock text-sm"></i>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="........"
                className="app-input-strong w-full rounded-2xl py-4 pl-14 pr-14 text-sm font-medium outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-app-muted absolute right-5 top-1/2 -translate-y-1/2 p-1 transition-colors hover:text-brand"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="group flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-200 text-brand focus:ring-brand dark:border-slate-700" />
              <span className="text-app-muted text-[10px] font-black uppercase tracking-widest transition-colors group-hover:text-brand">
                Lembrar-me
              </span>
            </label>
            <button type="button" className="text-[10px] font-black uppercase tracking-widest text-brand-gold transition-all hover:text-brand">
              Esqueceu a senha?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand py-5 text-[12px] font-black uppercase tracking-widest text-white shadow-2xl shadow-brand/20 transition-all hover:brightness-110 active:scale-95"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
            ) : (
              <>
                Acessar Painel <i className="fas fa-arrow-right text-[10px]"></i>
              </>
            )}
          </button>
          {isLoading && (
            <p className="text-app-muted text-center text-[10px] font-black uppercase tracking-widest">{loadingMessage}</p>
          )}
        </form>

        <div className="border-app mt-10 border-t pt-8 text-center">
          <p className="text-app-muted text-[10px] font-black uppercase tracking-widest">
            Ainda nao tem conta?
            <button
              type="button"
              onClick={handleCreateProfile}
              className="ml-1 text-brand transition-colors hover:text-brand/80"
            >
              Criar Perfil
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
