
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/layout/Toolbar';
import DashboardView from './components/dashboard/DashboardView';
import ListView from './components/escalas/ListView';
import CalendarView from './components/escalas/CalendarView';
import CleaningView from './components/ui/CleaningView';
import TeamView from './components/equipe/TeamView';
import MusicView from './components/musicas/MusicView';
import ToolsView from './components/tools/ToolsView';
import AvisoModal from './components/ui/AvisoModal';
import SplashScreen from './components/auth/SplashScreen';
import LoginScreen from './components/auth/LoginScreen';
import { LocalStorageFirstInitializer } from './components/LocalStorageFirstInitializer';
import { ViewType } from './types';
import LocalStorageFirstService from './services/LocalStorageFirstService';

type AppState = 'splash' | 'login' | 'main';

const App: React.FC = () => {
  // Carregar tema e cor do localStorage PRIMEIRO
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [brandColor, setBrandColor] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brandColor');
      return saved || '#1e3a8a';
    }
    return '#1e3a8a';
  });

  const [appState, setAppState] = useState<AppState>('splash');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Aplicar a cor inicial imediatamente quando o componente montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--brand-primary', brandColor);
      // Adicionar cor complementar para modo escuro
      const accentColor = getAccentColor(brandColor);
      document.documentElement.style.setProperty('--brand-accent', accentColor);
    }
  }, []);

  // Função para gerar cor complementar
  const getAccentColor = (primaryColor: string) => {
    // Converter hex para RGB
    const hex = primaryColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Gerar cor complementar (invertendo e ajustando)
    const accentR = Math.min(255, r + 40);
    const accentG = Math.min(255, g + 40);
    const accentB = Math.min(255, b + 40);
    
    // Converter de volta para hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(accentR)}${toHex(accentG)}${toHex(accentB)}`;
  };

  // Salvar tema no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }
  }, [isDarkMode]);

  // Salvar cor do tema no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('brandColor', brandColor);
    }
  }, [brandColor]);

  // Monitora modais para travar scroll do body
  useEffect(() => {
    if (isProfileModalOpen || isAvisoModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isProfileModalOpen, isAvisoModalOpen]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Aplicar a variável CSS
    document.documentElement.style.setProperty('--brand-primary', brandColor);
    // Atualizar também a cor complementar
    const accentColor = getAccentColor(brandColor);
    document.documentElement.style.setProperty('--brand-accent', accentColor);
  }, [brandColor]);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await LocalStorageFirstService.forceSync();
    } catch (error) {
      console.error('Erro ao sincronizar dados manualmente:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openAviso = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsAvisoModalOpen(true);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const isMusicView = (view: ViewType) => ['music-stats', 'music-list', 'music-repertoire', 'music-create', 'music-history'].includes(view);
  const isTeamView = (view: ViewType) => ['team', 'attendance'].includes(view);
  const isToolsView = (view: ViewType) => ['tools-admin', 'tools-users', 'tools-approvals', 'tools-performance'].includes(view);

  // Cache da sessão para offline
  const [sessionCached, setSessionCached] = useState<any>(() => {
    const saved = localStorage.getItem('supabase_session_cache');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (appState === 'splash') {
      const checkSession = async () => {
        // Delay inicial para o efeito da splash screen
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Se estiver offline, usar cache se disponível, senão ir para login
        if (!navigator.onLine) {
          if (sessionCached) {
            console.log('📶 Offline: Usando cache de sessão para entrar.');
            setAppState('main');
          } else {
            console.log('📶 Offline: Sem cache de sessão, indo para login.');
            setAppState('login');
          }
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            localStorage.setItem('supabase_session_cache', JSON.stringify(session));
            setSessionCached(session);
            setAppState('main');
          } else {
            setAppState('login');
          }
        } catch (err) {
          if (sessionCached) {
            console.warn('Erro ao verificar sessão, usando cache:', err);
            setAppState('main');
          } else {
            setAppState('login');
          }
        }
      };

      checkSession();
    }
  }, [appState, sessionCached]);

  // Escutar mudança de Auth e atualizar cache
  useEffect(() => {
    if (!navigator.onLine) {
      console.log('📶 Offline: Pulando listener de auth.');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('supabase_session_cache', JSON.stringify(session));
        setSessionCached(session);
        if (appState === 'splash') {
          setAppState('main');
        }
      } else {
        if (appState !== 'splash') {
          // Se não houver sessão e não estiver em splash, ir para login
          localStorage.removeItem('supabase_session_cache');
          setAppState('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [appState]);

  if (appState === 'splash') {
    return <SplashScreen onComplete={() => setAppState('login')} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLogin={() => setAppState('main')} />;
  }

  return (
    <LocalStorageFirstInitializer
      config={{
        syncInterval: 2 * 60 * 1000, // 2 minutos
        enableBackgroundSync: true,
        priorityLocal: true
      }}
      onReady={() => console.log('🏠 Sistema localStorage-first pronto!')}
      onError={(error) => console.error('❌ Erro na inicialização:', error)}
    >
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300 ${isDarkMode ? 'dark' : ''}`}>
        {appState === 'main' && (
          <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-900">
            <Sidebar 
              currentView={currentView} 
              onViewChange={setCurrentView} 
              isDarkMode={isDarkMode}
              onToggleTheme={toggleDarkMode}
              brandColor={brandColor}
              onColorChange={setBrandColor}
              isProfileModalOpen={isProfileModalOpen}
              setIsProfileModalOpen={setIsProfileModalOpen}
            />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header 
                onSync={handleSync}
                onOpenProfile={() => setIsProfileModalOpen(true)}
              />
              
              <Toolbar 
                currentView={currentView} 
                onViewChange={setCurrentView}
              />
              
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-800">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-40">
                        <div className="w-12 h-12 border-[6px] border-brand border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sincronizando...</p>
                      </div>
                    ) : (
                      <div className="fade-in">
                        {currentView === 'dashboard' && <DashboardView />}
                        {currentView === 'list' && <ListView onReportAbsence={openAviso} />}
                        {currentView === 'calendar' && <CalendarView />}
                        {currentView === 'cleaning' && <CleaningView />}
                        {isTeamView(currentView) && <TeamView currentView={currentView as any} />}
                        {isMusicView(currentView) && <MusicView subView={currentView as any} />}
                        {isToolsView(currentView) && <ToolsView subView={currentView as any} />}
                      </div>
                    )}
                  </div>
                </div>
              </main>
            </div>
          </div>
        )}

        {isAvisoModalOpen && <AvisoModal eventId={selectedEventId} onClose={() => setIsAvisoModalOpen(false)} />}
      </div>
    </LocalStorageFirstInitializer>
  );
};

export default App;
