
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
import AvisoModal from './components/ui/AvisoModal';
import SplashScreen from './components/auth/SplashScreen';
import LoginScreen from './components/auth/LoginScreen';
import { ViewType } from './types';

type AppState = 'splash' | 'login' | 'main';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('splash');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [brandColor, setBrandColor] = useState('#1e3a8a');
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    document.documentElement.style.setProperty('--brand-primary', brandColor);
  }, [brandColor]);

  const handleSync = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const openAviso = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsAvisoModalOpen(true);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const isMusicView = (view: ViewType) => ['music-stats', 'music-list', 'music-repertoire', 'music-create', 'music-history'].includes(view);
  const isTeamView = (view: ViewType) => ['team', 'attendance'].includes(view);

  useEffect(() => {
    if (appState === 'splash') {
      const checkSession = async () => {
        // Wait a bit for splash effect
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setAppState('main');
        } else {
          setAppState('login');
        }
      };

      checkSession();
    }
  }, [appState]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAppState('main');
      } else if (appState !== 'splash') {
        // Only redirect to login if not in splash screen (to avoid conflict with initial check)
        setAppState('login');
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f4f7fa] dark:bg-[#0b1120] transition-colors duration-300">
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

      <div className="flex-grow flex flex-col lg:pl-[280px]">
        <Header
          onSync={handleSync}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        <main className="flex-grow pt-24 lg:pt-10 pb-20 lg:pb-10 px-6 lg:px-12 w-full">
          <Toolbar
            currentView={currentView}
            onViewChange={setCurrentView}
          />

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
                {isTeamView(currentView) && <TeamView currentView={currentView} />}
                {isMusicView(currentView) && <MusicView subView={currentView} />}
              </div>
            )}
          </div>
        </main>
      </div>

      {isAvisoModalOpen && <AvisoModal eventId={selectedEventId} onClose={() => setIsAvisoModalOpen(false)} />}
    </div>
  );
};

export default App;
