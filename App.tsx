import React, { Suspense, lazy, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/layout/Toolbar';
import OfflineSyncBanner from './components/layout/OfflineSyncBanner';
import SplashScreen from './components/auth/SplashScreen';
import LoginScreen from './components/auth/LoginScreen';
import { LocalStorageFirstInitializer } from './components/LocalStorageFirstInitializer';
import { MinistryProvider, useMinistryContext } from './contexts/MinistryContext';
import LocalStorageFirstService from './services/LocalStorageFirstService';
import { ViewType } from './types';
import { getDefaultViewForModules, getModuleForView } from './utils/ministry';
import { isMusicView, isTeamView, isToolsView } from './utils/views';

const NotificationCenterModal = lazy(() => import('./components/layout/NotificationCenterModal'));
const DashboardView = lazy(() => import('./components/dashboard/DashboardView'));
const ListView = lazy(() => import('./components/escalas/ListView'));
const CalendarView = lazy(() => import('./components/escalas/CalendarView'));
const CleaningView = lazy(() => import('./components/ui/CleaningView'));
const TeamView = lazy(() => import('./components/equipe/TeamView'));
const MusicView = lazy(() => import('./components/musicas/MusicView'));
const ToolsView = lazy(() => import('./components/tools/ToolsView'));
const AvisoModal = lazy(() => import('./components/ui/AvisoModal'));

const LoadingBlock = ({ label = 'Carregando...' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center py-40">
    <div className="h-12 w-12 animate-spin rounded-full border-[6px] border-brand border-t-transparent" />
    <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
  </div>
);

type AppState = 'splash' | 'login' | 'main';

interface AppContentProps {
  currentView: ViewType;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewType>>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  brandColor: string;
  setBrandColor: React.Dispatch<React.SetStateAction<string>>;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAvisoModalOpen: boolean;
  setIsAvisoModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedEventId: string | null;
  openAviso: (eventId: string) => void;
  handleSync: () => Promise<void>;
  isLoading: boolean;
}

const getAccentColor = (primaryColor: string) => {
  const hex = primaryColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const accentR = Math.min(255, r + 40);
  const accentG = Math.min(255, g + 40);
  const accentB = Math.min(255, b + 40);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(accentR)}${toHex(accentG)}${toHex(accentB)}`;
};

const AppContent: React.FC<AppContentProps> = ({
  currentView,
  setCurrentView,
  isDarkMode,
  toggleDarkMode,
  brandColor,
  setBrandColor,
  isProfileModalOpen,
  setIsProfileModalOpen,
  isAvisoModalOpen,
  setIsAvisoModalOpen,
  isNotificationsOpen,
  setIsNotificationsOpen,
  selectedEventId,
  openAviso,
  handleSync,
  isLoading
}) => {
  const { activeModules, isGlobalAdmin, loading: ministryLoading } = useMinistryContext();

  useEffect(() => {
    const targetModule = getModuleForView(currentView);
    const canAccessTools = isGlobalAdmin;

    if (targetModule === 'tools' && !canAccessTools) {
      setCurrentView(getDefaultViewForModules(activeModules, canAccessTools));
      return;
    }

    if (targetModule !== 'tools' && !activeModules.includes(targetModule)) {
      setCurrentView(getDefaultViewForModules(activeModules, canAccessTools));
    }
  }, [activeModules, currentView, isGlobalAdmin, setCurrentView]);

  if (ministryLoading) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300 ${
          isDarkMode ? 'dark' : ''
        }`}
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Carregando ministerio...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 transition-colors duration-300 ${
        isDarkMode ? 'dark' : ''
      }`}
    >
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
          onOpenNotifications={() => setIsNotificationsOpen(true)}
        />

        <div className="flex flex-1 flex-col overflow-hidden pt-16 lg:ml-[280px] lg:pt-0">
          <Header
            onSync={handleSync}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />

          <Toolbar currentView={currentView} onViewChange={setCurrentView} />

          <OfflineSyncBanner />

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-800">
            <div className="container mx-auto px-4 py-6 pb-28 sm:px-6 sm:pb-32 lg:px-8 lg:pb-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="h-12 w-12 animate-spin rounded-full border-[6px] border-brand border-t-transparent" />
                  <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Sincronizando...
                  </p>
                </div>
              ) : (
                <Suspense fallback={<LoadingBlock />}>
                  <div className="fade-in">
                  {currentView === 'dashboard' && <DashboardView />}
                  {currentView === 'list' && <ListView onReportAbsence={openAviso} />}
                  {currentView === 'calendar' && <CalendarView />}
                  {currentView === 'cleaning' && <CleaningView />}
                  {isTeamView(currentView) && <TeamView currentView={currentView} />}
                  {isMusicView(currentView) && <MusicView subView={currentView} />}
                  {isToolsView(currentView) && <ToolsView subView={currentView} />}
                  </div>
                </Suspense>
              )}
            </div>
          </main>
        </div>
      </div>

      <Suspense fallback={null}>
        {isAvisoModalOpen && selectedEventId && (
          <AvisoModal eventId={selectedEventId} onClose={() => setIsAvisoModalOpen(false)} />
        )}

        {isNotificationsOpen && <NotificationCenterModal onClose={() => setIsNotificationsOpen(false)} />}
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [brandColor, setBrandColor] = useState(() => {
    if (typeof window === 'undefined') return '#3b82f6';
    return localStorage.getItem('brandColor') || '#3b82f6';
  });

  const [appState, setAppState] = useState<AppState>('splash');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCached, setSessionCached] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('supabase_session_cache');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', brandColor);
    document.documentElement.style.setProperty('--brand-accent', getAccentColor(brandColor));
  }, [brandColor]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('brandColor', brandColor);
  }, [brandColor]);

  useEffect(() => {
    if (isProfileModalOpen || isAvisoModalOpen || isNotificationsOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isAvisoModalOpen, isNotificationsOpen, isProfileModalOpen]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSplashContinue = async () => {
    if (!navigator.onLine) {
      setAppState(sessionCached ? 'main' : 'login');
      return;
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session) {
        localStorage.setItem('supabase_session_cache', JSON.stringify(session));
        setSessionCached(session);
        setAppState('main');
        return;
      }

      setAppState('login');
    } catch (error) {
      if (sessionCached) {
        console.warn('Erro ao verificar sessao, usando cache local:', error);
        setAppState('main');
        return;
      }

      setAppState('login');
    }
  };

  useEffect(() => {
    if (!navigator.onLine) {
      return;
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('supabase_session_cache', JSON.stringify(session));
        setSessionCached(session);

        if (appState === 'splash') {
          setAppState('main');
        }

        return;
      }

      localStorage.removeItem('supabase_session_cache');
      setSessionCached(null);

      if (appState !== 'splash') {
        setAppState('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [appState]);

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

  const toggleDarkMode = () => {
    setIsDarkMode((previous) => !previous);
  };

  if (appState === 'splash') {
    return <SplashScreen onComplete={handleSplashContinue} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLogin={() => setAppState('main')} />;
  }

  return (
    <LocalStorageFirstInitializer
      config={{
        syncInterval: 2 * 60 * 1000,
        enableBackgroundSync: true,
        priorityLocal: true
      }}
      onReady={() => undefined}
      onError={(error) => console.error('Erro na inicializacao:', error)}
    >
      <MinistryProvider>
        <AppContent
          currentView={currentView}
          setCurrentView={setCurrentView}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          brandColor={brandColor}
          setBrandColor={setBrandColor}
          isProfileModalOpen={isProfileModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
          isAvisoModalOpen={isAvisoModalOpen}
          setIsAvisoModalOpen={setIsAvisoModalOpen}
          isNotificationsOpen={isNotificationsOpen}
          setIsNotificationsOpen={setIsNotificationsOpen}
          selectedEventId={selectedEventId}
          openAviso={openAviso}
          handleSync={handleSync}
          isLoading={isLoading}
        />
      </MinistryProvider>
    </LocalStorageFirstInitializer>
  );
};

export default App;
