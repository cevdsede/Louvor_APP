import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardView } from '../components/dashboard/DashboardView';
import { ListView } from '../components/escalas/ListView';
import { CalendarView } from '../components/escalas/CalendarView';
import { CleaningView } from '../components/ui/CleaningView';
import { TeamView } from '../components/equipe/TeamView';
import { MusicView } from '../components/musicas/MusicView';
import { LoginScreen } from '../components/auth/LoginScreen';
import { SplashScreen } from '../components/auth/SplashScreen';
import { CreateProfileScreen } from '../components/auth/CreateProfileScreen';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/splash" element={<SplashScreen onComplete={() => {}} />} />
      <Route path="/login" element={<LoginScreen onLogin={() => {}} />} />
      <Route path="/profile" element={<CreateProfileScreen />} />
      
      {/* Main App Routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardView />} />
      <Route path="/escalas/lista" element={<ListView onReportAbsence={() => {}} />} />
      <Route path="/escalas/calendario" element={<CalendarView />} />
      <Route path="/limpeza" element={<CleaningView />} />
      <Route path="/equipe" element={<TeamView currentView="team" />} />
      <Route path="/equipe/presenca" element={<TeamView currentView="attendance" />} />
      <Route path="/musicas/estatisticas" element={<MusicView subView="music-stats" />} />
      <Route path="/musicas/lista" element={<MusicView subView="music-list" />} />
      <Route path="/musicas/repertorio" element={<MusicView subView="music-repertoire" />} />
      <Route path="/musicas/criar" element={<MusicView subView="music-create" />} />
      <Route path="/musicas/historico" element={<MusicView subView="music-history" />} />
    </Routes>
  );
};

export default AppRoutes;
