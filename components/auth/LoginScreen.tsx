
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { logger } from '../../utils/logger';
import CreateProfileScreen from './CreateProfileScreen';
import LocalStorageFirstService from '../../services/LocalStorageFirstService';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
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
        password: formData.password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('Email ou senha incorretos. Tente novamente.');
        } else {
          setError('Erro ao fazer login: ' + error.message);
        }
      } else {
        LocalStorageFirstService.requestFullSync();
        setLoadingMessage('Sincronizando dados e imagens...');

        try {
          LocalStorageFirstService.init({
            syncInterval: 2 * 60 * 1000,
            enableBackgroundSync: true,
            priorityLocal: true
          });
          await LocalStorageFirstService.bootstrapApplication({
            force: true,
            preloadImages: true
          });
        } catch (syncError) {
          logger.warn('Login concluído, mas o bootstrap local falhou. O app continuará com os dados já salvos.', syncError, 'database');
        }

        onLogin();
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
      logger.error('Erro no login:', err, 'auth');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = () => {
    setShowCreateProfile(true);
  };

  const handleBackToLogin = () => {
    setShowCreateProfile(false);
    setError('');
  };

  const handleProfileCreated = () => {
    setShowCreateProfile(false);
    setError('');
    // Opcional: mostrar mensagem de sucesso
  };

  if (showCreateProfile) {
    return (
      <CreateProfileScreen
        onBack={handleBackToLogin}
        onSuccess={handleProfileCreated}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] flex items-center justify-center p-6 relative transition-colors duration-300">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-brand/5 rounded-full blur-[80px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-brand-gold/5 rounded-full blur-[80px]"></div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-10 lg:p-14 animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="flex flex-col items-center mb-6">
            <i className="fas fa-cloud text-brand text-5xl"></i>
            <div className="flex gap-1.5 mt-2.5">
              <div className="w-1.5 h-4 bg-brand-gold rounded-full animate-pulse"></div>
              <div className="w-1.5 h-7 bg-brand-gold rounded-full animate-pulse delay-150"></div>
              <div className="w-1.5 h-4 bg-brand-gold rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center leading-none">
            Cloud <span className="text-brand">Worship</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-3">Acesso Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center shrink-0">
              <i className="fas fa-exclamation-triangle text-red-500 dark:text-red-400 text-xs"></i>
            </div>
            <p className="text-[10px] font-bold text-red-600 dark:text-red-300 uppercase tracking-wide leading-relaxed flex-1">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                <i className="fas fa-envelope text-sm"></i>
              </div>
              <input
                type="email"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="seu@email.com"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-6 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                <i className="fas fa-lock text-sm"></i>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl py-4 pl-14 pr-14 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand/10 focus:border-brand transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-200 dark:border-slate-700 text-brand focus:ring-brand" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Lembrar-me</span>
            </label>
            <button type="button" className="text-[10px] font-black text-brand-gold uppercase tracking-widest hover:text-brand transition-all">Esqueceu a senha?</button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-brand text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl shadow-brand/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Acessar Painel <i className="fas fa-arrow-right text-[10px]"></i></>
            )}
          </button>
          {isLoading && (
            <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {loadingMessage}
            </p>
          )}
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 text-center">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Ainda não tem conta? <button 
              type="button"
              onClick={handleCreateProfile}
              className="text-brand ml-1 hover:text-brand/80 transition-colors"
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
