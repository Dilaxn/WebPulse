import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonitorsPage from './pages/MonitorsPage';
import MonitorFormPage from './pages/MonitorFormPage';
import MonitorDetailPage from './pages/MonitorDetailPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import './styles/global.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#111120', color: '#e8e8f0', border: '1px solid #1e1e35', fontSize: 14 }
      }} />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/monitors" element={<ProtectedRoute><MonitorsPage /></ProtectedRoute>} />
        <Route path="/monitors/new" element={<ProtectedRoute><MonitorFormPage /></ProtectedRoute>} />
        <Route path="/monitors/:id" element={<ProtectedRoute><MonitorDetailPage /></ProtectedRoute>} />
        <Route path="/monitors/:id/edit" element={<ProtectedRoute><MonitorFormPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
