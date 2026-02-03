import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/layout/Toolbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ListView } from './components/escalas/ListView';
import { CalendarView } from './components/escalas/CalendarView';
import { CleaningView } from './components/ui/CleaningView';
import { TeamView } from './components/equipe/TeamView';
import { MusicView } from './components/musicas/MusicView';
import AvisoModal from './components/ui/AvisoModal';
import { SplashScreen } from './components/auth/SplashScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { CreateProfileScreen } from './components/auth/CreateProfileScreen';
import PageTransition from './components/ui/PageTransition';
import { ViewType } from './types';

const AppContent: React.FC = () => {
  const { appState, user } = useAuth();
  const { isDarkMode, brandColor, toggleDarkMode, setBrandColor } = useTheme();
  const [isAvisoModalOpen, setIsAvisoModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  // Sincronizar currentView com a rota atual
  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard') setCurrentView('dashboard');
    else if (path.startsWith('/escalas')) {
      if (path.includes('/lista')) setCurrentView('list');
      else if (path.includes('/calendario')) setCurrentView('calendar');
      else setCurrentView('list');
    }
    else if (path.startsWith('/musicas')) {
      if (path.includes('/estatisticas')) setCurrentView('music-stats');
      else if (path.includes('/lista')) setCurrentView('music-list');
      else if (path.includes('/repertorio')) setCurrentView('music-repertoire');
      else if (path.includes('/historico')) setCurrentView('music-history');
      else setCurrentView('music-stats');
    }
    else if (path.startsWith('/equipe')) {
      if (path.includes('/presenca')) setCurrentView('attendance');
      else setCurrentView('team');
    }
  }, [location.pathname]);

  // Função para mudar de view
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    
    // Navegar para a rota correspondente
    switch (view) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'list':
        navigate('/escalas/lista');
        break;
      case 'calendar':
        navigate('/escalas/calendario');
        break;
      case 'cleaning':
        navigate('/limpeza');
        break;
      case 'team':
        navigate('/equipe');
        break;
      case 'attendance':
        navigate('/equipe/presenca');
        break;
      case 'music-stats':
        navigate('/musicas/estatisticas');
        break;
      case 'music-list':
        navigate('/musicas/lista');
        break;
      case 'music-repertoire':
        navigate('/musicas/repertorio');
        break;
      case 'music-history':
        navigate('/musicas/historico');
        break;
      default:
        break;
    }
  };

  // Monitora modais para travar scroll do body
  useEffect(() => {
    if (isProfileModalOpen || isAvisoModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }, [isProfileModalOpen, isAvisoModalOpen]);

  const handleSync = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1200);
  };

  const openAviso = (eventId: string) => {
    setSelectedEventId(eventId);
    setIsAvisoModalOpen(true);
  };

  const isMusicView = (view: ViewType) => ['music-stats', 'music-list', 'music-repertoire', 'music-create', 'music-history'].includes(view);
  const isTeamView = (view: ViewType) => ['team', 'attendance'].includes(view);

  if (appState === 'splash') {
    return <SplashScreen onComplete={() => {}} />;
  }

  if (appState === 'login') {
    return <LoginScreen onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f4f7fa] dark:bg-[#0b1120] transition-colors duration-300">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
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
            onViewChange={handleViewChange}
          />

          <div className="">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-40">
                <div className="w-12 h-12 border-[6px] border-brand border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sincronizando...</p>
              </div>
            ) : (
              <div className="fade-in">
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardView />} />
                    <Route path="/escalas/lista" element={<ListView onReportAbsence={openAviso} />} />
                    <Route path="/escalas/calendario" element={<CalendarView />} />
                    <Route path="/limpeza" element={<CleaningView />} />
                    <Route path="/equipe" element={<TeamView currentView="team" />} />
                    <Route path="/equipe/presenca" element={<TeamView currentView="attendance" />} />
                    <Route path="/musicas/estatisticas" element={<MusicView subView="music-stats" />} />
                    <Route path="/musicas/lista" element={<MusicView subView="music-list" />} />
                    <Route path="/musicas/repertorio" element={<MusicView subView="music-repertoire" />} />
                    <Route path="/musicas/criar" element={<MusicView subView="music-create" />} />
                    <Route path="/musicas/historico" element={<MusicView subView="music-history" />} />
                    <Route path="/profile" element={<CreateProfileScreen />} />
                  </Routes>
                </PageTransition>
              </div>
            )}
          </div>
        </main>
      </div>

      {isAvisoModalOpen && <AvisoModal eventId={selectedEventId} onClose={() => setIsAvisoModalOpen(false)} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
