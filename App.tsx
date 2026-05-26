import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/layout/Toolbar';
import OfflineSyncBanner from './components/layout/OfflineSyncBanner';
import LoginScreen from './components/auth/LoginScreen';
import { LocalStorageFirstInitializer } from './components/LocalStorageFirstInitializer';
import { MinistryProvider, useMinistryContext } from './contexts/MinistryContext';
import LocalStorageFirstService from './services/LocalStorageFirstService';
import { ViewType } from './types';
import { getDefaultViewForModules, getModuleForView } from './utils/ministry';
import { isMusicView, isTeamView, isToolsView } from './utils/views';
import { AppBackgroundThemeId, getAppBackgroundTheme } from './utils/appBackgroundThemes';
import type { ChurchView } from './components/church/ChurchShell';

const NotificationCenterModal = lazy(() => import('./components/layout/NotificationCenterModal'));
const PublicMemberRegistration = lazy(() => import('./components/auth/PublicMemberRegistration'));
const ChurchShell = lazy(() => import('./components/church/ChurchShell'));
const PublicChurchShell = lazy(() => import('./components/church/PublicChurchShell'));
const GlobalSearchModal = lazy(() => import('./components/search/GlobalSearchModal'));
const DesignLabView = lazy(() => import('./components/lab/DesignLabView'));
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
    <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-app-muted">{label}</p>
  </div>
);

const getCurrentRoute = () => {
  if (typeof window === 'undefined') return '/';

  const normalizedHash = window.location.hash.replace(/^#/, '');
  if (normalizedHash.startsWith('/')) {
    return normalizedHash;
  }

  return window.location.pathname || '/';
};

const isInternalRoute = (path: string) =>
  path === '/login' || path === '/cadastro' || path === '/design-lab' || path.startsWith('/app');

interface AppContentProps {
  currentView: ViewType;
  setCurrentView: React.Dispatch<React.SetStateAction<ViewType>>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  brandColor: string;
  setBrandColor: React.Dispatch<React.SetStateAction<string>>;
  backgroundTheme: AppBackgroundThemeId;
  setBackgroundTheme: (theme: AppBackgroundThemeId) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAvisoModalOpen: boolean;
  setIsAvisoModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedEventId: string | null;
  onBackToChurch: () => void;
  openAviso: (eventId: string) => void;
  handleSync: () => Promise<void>;
  isLoading: boolean;
  onOpenSearch: () => void;
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
  backgroundTheme,
  setBackgroundTheme,
  isProfileModalOpen,
  setIsProfileModalOpen,
  isAvisoModalOpen,
  setIsAvisoModalOpen,
  isNotificationsOpen,
  setIsNotificationsOpen,
  selectedEventId,
  onBackToChurch,
  openAviso,
  handleSync,
  isLoading,
  onOpenSearch
}) => {
  const { activeMinisterioId, activeModules, isGlobalAdmin, loading: ministryLoading } = useMinistryContext();
  const previousMinisterioIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (ministryLoading || !activeMinisterioId) {
      return;
    }

    if (previousMinisterioIdRef.current === null) {
      previousMinisterioIdRef.current = activeMinisterioId;
      return;
    }

    if (previousMinisterioIdRef.current !== activeMinisterioId) {
      previousMinisterioIdRef.current = activeMinisterioId;
      setCurrentView(getDefaultViewForModules(activeModules, isGlobalAdmin));
    }
  }, [activeMinisterioId, activeModules, isGlobalAdmin, ministryLoading, setCurrentView]);

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
        className={`bg-app-shell min-h-screen transition-colors duration-300 ${
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
      className={`bg-app-shell min-h-screen transition-colors duration-300 ${
        isDarkMode ? 'dark' : ''
      }`}
    >
      <div className="flex h-screen overflow-hidden bg-transparent">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onBackToChurch={onBackToChurch}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleDarkMode}
          brandColor={brandColor}
          onColorChange={setBrandColor}
          backgroundTheme={backgroundTheme}
          onBackgroundThemeChange={setBackgroundTheme}
          isProfileModalOpen={isProfileModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenSearch={onOpenSearch}
        />

        <div className="flex flex-1 flex-col overflow-hidden pt-16 lg:ml-[280px] lg:pt-0">
          <Header
            onSync={handleSync}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenSearch={onOpenSearch}
          />

          <Toolbar currentView={currentView} onViewChange={setCurrentView} />

          <OfflineSyncBanner />

          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent">
            <div className="container mx-auto px-4 py-6 pb-28 sm:px-6 sm:pb-32 lg:px-8 lg:pb-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40">
                  <div className="h-12 w-12 animate-spin rounded-full border-[6px] border-brand border-t-transparent" />
                  <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-app-muted">
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
  const [routePath, setRoutePath] = useState(() => getCurrentRoute());
  const isPublicRegistrationRoute = routePath === '/cadastro';
  const isNativeApp = Capacitor.isNativePlatform();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [brandColor, setBrandColor] = useState(() => {
    if (typeof window === 'undefined') return '#3b82f6';
    return localStorage.getItem('brandColor') || '#3b82f6';
  });
  const [backgroundTheme, setBackgroundTheme] = useState<AppBackgroundThemeId>(() => {
    if (typeof window === 'undefined') return 'warm';
    return (localStorage.getItem('backgroundTheme') as AppBackgroundThemeId) || 'warm';
  });

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeArea, setActiveArea] = useState<'church' | 'ministry'>('church');
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [requestedChurchView, setRequestedChurchView] = useState<ChurchView | null>(null);
  const [sessionCached, setSessionCached] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('supabase_session_cache');
    return saved ? JSON.parse(saved) : null;
  });

  const navigateTo = (path: string) => {
    if (typeof window === 'undefined') return;

    if (path === '/') {
      window.history.pushState({}, '', '/');
      window.location.hash = '';
      setRoutePath('/');
      return;
    }

    if (isInternalRoute(path)) {
      window.history.pushState({}, '', `/#${path}`);
      setRoutePath(path);
      return;
    }

    window.history.pushState({}, '', path);
    setRoutePath(path);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.location.hash && isInternalRoute(window.location.pathname)) {
      const legacyPath = window.location.pathname;
      window.history.replaceState({}, '', `/#${legacyPath}`);
      setRoutePath(legacyPath);
    }

    const syncRoute = () => setRoutePath(getCurrentRoute());

    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);

    syncRoute();

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-brand-primary', brandColor);
    document.documentElement.style.setProperty('--app-brand-accent', getAccentColor(brandColor));
  }, [brandColor]);

  useEffect(() => {
    const theme = getAppBackgroundTheme(backgroundTheme);
    const gradient = isDarkMode ? theme.darkGradient : theme.lightGradient;
    const tokens = isDarkMode ? theme.darkTokens : theme.lightTokens;
    document.documentElement.style.setProperty('--app-shell-gradient', gradient);
    document.documentElement.style.setProperty('--app-bg', tokens.bg);
    document.documentElement.style.setProperty('--app-bg-strong', tokens.bgStrong);
    document.documentElement.style.setProperty('--app-surface', tokens.surface);
    document.documentElement.style.setProperty('--app-surface-strong', tokens.surfaceStrong);
    document.documentElement.style.setProperty('--app-surface-muted', tokens.surfaceMuted);
    document.documentElement.style.setProperty('--app-border', tokens.border);
    document.documentElement.style.setProperty('--app-shadow', tokens.shadow);
    document.body.style.setProperty('--app-shell-gradient', gradient);
    document.body.style.setProperty('--app-bg', tokens.bg);
    document.body.style.setProperty('--app-bg-strong', tokens.bgStrong);
    document.body.style.setProperty('--app-surface', tokens.surface);
    document.body.style.setProperty('--app-surface-strong', tokens.surfaceStrong);
    document.body.style.setProperty('--app-surface-muted', tokens.surfaceMuted);
    document.body.style.setProperty('--app-border', tokens.border);
    document.body.style.setProperty('--app-shadow', tokens.shadow);
  }, [backgroundTheme, isDarkMode]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('brandColor', brandColor);
  }, [brandColor]);

  useEffect(() => {
    localStorage.setItem('backgroundTheme', backgroundTheme);
  }, [backgroundTheme]);

  const handleBackgroundThemeChange = (themeId: AppBackgroundThemeId) => {
    const theme = getAppBackgroundTheme(themeId);
    setBackgroundTheme(theme.id);
    setBrandColor(theme.recommendedBrand);
  };

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

  const handleOpenLogin = async () => {
    if (sessionCached) {
      navigateTo('/app');
      return;
    }

    if (!navigator.onLine) {
      navigateTo('/login');
      return;
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session) {
        localStorage.setItem('supabase_session_cache', JSON.stringify(session));
        setSessionCached(session);
        navigateTo('/app');
        return;
      }
    } catch (error) {
      console.warn('Erro ao verificar sessao antes do login:', error);
    }

    navigateTo('/login');
  };

  const handleLoginSuccess = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session) {
        localStorage.setItem('supabase_session_cache', JSON.stringify(session));
        setSessionCached(session);
      }
    } catch (error) {
      console.warn('Erro ao atualizar sessao apos login:', error);
    }

    navigateTo('/app');
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

        return;
      }

      localStorage.removeItem('supabase_session_cache');
      setSessionCached(null);

      if (routePath.startsWith('/app')) {
        navigateTo('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [routePath]);

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

  const openChurchView = (view: ChurchView) => {
    setRequestedChurchView(view);
    setActiveArea('church');
    setIsSearchOpen(false);
  };

  const openMinistryView = (view: ViewType) => {
    setCurrentView(view);
    setActiveArea('ministry');
    setIsSearchOpen(false);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((previous) => !previous);
  };

  if (isPublicRegistrationRoute) {
    if (isNativeApp) {
      navigateTo('/app');
      return null;
    }

    return (
      <div className="site-theme">
        <Suspense fallback={<LoadingBlock label="Carregando cadastro..." />}>
          <PublicMemberRegistration />
        </Suspense>
      </div>
    );
  }

  if (routePath === '/' || routePath === '') {
    if (isNativeApp) {
      navigateTo('/app');
      return null;
    }

    return (
      <div className="site-theme">
        <Suspense fallback={<LoadingBlock />}>
          <PublicChurchShell onLoginClick={handleOpenLogin} />
        </Suspense>
      </div>
    );
  }

  if (routePath === '/login') {
    return (
      <div className="app-theme">
        <LoginScreen onLogin={handleLoginSuccess} />
      </div>
    );
  }

  if (routePath === '/design-lab') {
    if (isNativeApp) {
      navigateTo('/app');
      return null;
    }

    return (
      <div className="app-theme">
        <Suspense fallback={<LoadingBlock label="Carregando laboratorio..." />}>
          <DesignLabView onBack={() => navigateTo('/')} />
        </Suspense>
      </div>
    );
  }

  if (!routePath.startsWith('/app')) {
    navigateTo(isNativeApp ? '/app' : '/');
    return null;
  }

  if (!sessionCached) {
    return (
      <div className="app-theme">
        <LoginScreen onLogin={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="app-theme">
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
          {activeArea === 'church' ? (
            <Suspense fallback={<LoadingBlock />}>
              <ChurchShell
                onOpenMinistry={(targetView) => {
                  setCurrentView(targetView || 'dashboard');
                  setActiveArea('ministry');
                }}
                isDarkMode={isDarkMode}
                onToggleTheme={toggleDarkMode}
                brandColor={brandColor}
                onColorChange={setBrandColor}
                backgroundTheme={backgroundTheme}
                onBackgroundThemeChange={handleBackgroundThemeChange}
                requestedView={requestedChurchView}
                onRequestedViewHandled={() => setRequestedChurchView(null)}
                onOpenSearch={() => setIsSearchOpen(true)}
              />
            </Suspense>
          ) : (
            <AppContent
              currentView={currentView}
              setCurrentView={setCurrentView}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              brandColor={brandColor}
              setBrandColor={setBrandColor}
              backgroundTheme={backgroundTheme}
              setBackgroundTheme={handleBackgroundThemeChange}
              isProfileModalOpen={isProfileModalOpen}
              setIsProfileModalOpen={setIsProfileModalOpen}
              isAvisoModalOpen={isAvisoModalOpen}
              setIsAvisoModalOpen={setIsAvisoModalOpen}
              isNotificationsOpen={isNotificationsOpen}
              setIsNotificationsOpen={setIsNotificationsOpen}
              selectedEventId={selectedEventId}
              onBackToChurch={() => setActiveArea('church')}
              openAviso={openAviso}
              handleSync={handleSync}
              isLoading={isLoading}
              onOpenSearch={() => setIsSearchOpen(true)}
            />
          )}
        </MinistryProvider>
      </LocalStorageFirstInitializer>
      <Suspense fallback={null}>
        {isSearchOpen && (
          <GlobalSearchModal
            onClose={() => setIsSearchOpen(false)}
            onNavigate={(target) => {
              if (target.area === 'church') {
                openChurchView(target.view);
                return;
              }
              openMinistryView(target.view);
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

export default App;
