
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import Leads from './components/Leads';
import Calendar from './components/Calendar';
import Admin from './components/Admin';
import Integrations from './components/Integrations';
import Subscribers from './components/Subscribers';
import { NotificationProvider } from './components/NotificationContext';
import Conversations from './components/Conversations';
import Automations from './components/Automations';
import Sales from './components/Sales';
import Profile from './components/Profile';
import Chatbot from './components/Chatbot';
import { User } from './types';

import { initAutomationRunner } from './services/automationRunner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // FORCE CLEANUP of old session traces (v2.1)
    const dbVer = localStorage.getItem('inmocrm_db_ver');
    if (dbVer !== '2.1') {
      localStorage.clear();
      localStorage.setItem('inmocrm_db_ver', '2.1');
      return null;
    }
    const stored = localStorage.getItem('inmocrm_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Init automations on load if user is logged in
  useEffect(() => {
    if (currentUser?.organizationId) {
      initAutomationRunner();
    }
  }, [currentUser]);

  // Safety check: if user exists but has no organizationId (legacy data), force logout
  useEffect(() => {
    if (currentUser && !currentUser.organizationId) {
      console.warn("User detected with invalid session (missing organizationId). Forcing logout.");
      handleLogout();
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    localStorage.setItem('inmocrm_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('inmocrm_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <NotificationProvider>
      <Router>
        <Layout onLogout={handleLogout} currentUser={currentUser}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/profile" element={<Profile currentUser={currentUser} onUpdateUser={handleLogin} />} />
            {/* Agent-restricted routes */}
            <Route
              path="/conversations"
              element={currentUser.role !== 'Agent' ? <Conversations /> : <Navigate to="/" replace />}
            />
            <Route
              path="/sales"
              element={currentUser.role !== 'Agent' ? <Sales /> : <Navigate to="/" replace />}
            />
            <Route
              path="/automations"
              element={currentUser.role !== 'Agent' ? <Automations /> : <Navigate to="/" replace />}
            />
            <Route
              path="/integrations"
              element={currentUser.role !== 'Agent' ? <Integrations /> : <Navigate to="/" replace />}
            />
            <Route
              path="/chatbot"
              element={currentUser.role !== 'Agent' ? <Chatbot /> : <Navigate to="/" replace />}
            />
            <Route
              path="/admin"
              element={['Admin', 'SuperAdmin', 'Owner'].includes(currentUser.role) ? <Admin /> : <Navigate to="/" replace />}
            />
            <Route
              path="/subscribers"
              element={currentUser.role === 'Owner' ? <Subscribers /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </NotificationProvider >
  );
};

export default App;
