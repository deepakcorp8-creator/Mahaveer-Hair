import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NewEntryForm from './components/NewEntryForm';
import ClientMaster from './components/ClientMaster';
import AppointmentBooking from './components/AppointmentBooking';
import ServicePackages from './components/ServicePackages';
import DailyReport from './components/DailyReport';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { User, Role } from './types';

function App() {
  // Initialize user state from localStorage to persist session across refreshes
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('mahaveer_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      return null;
    }
  });

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('mahaveer_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mahaveer_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          {/* Dashboard only for ADMIN. USER goes to /new-entry */}
          <Route 
            path="/" 
            element={user.role === Role.ADMIN ? <Dashboard /> : <Navigate to="/new-entry" replace />} 
          />
          
          <Route path="/new-entry" element={<NewEntryForm />} />
          
          {/* Protect Daily Report */}
          <Route 
            path="/daily-report" 
            element={user.role === Role.ADMIN ? <DailyReport /> : <Navigate to="/new-entry" />} 
          />
          
          <Route path="/appointments" element={<AppointmentBooking />} />
          <Route path="/packages" element={<ServicePackages />} /> 
          
          {/* Admin Protected Routes */}
          <Route 
            path="/clients" 
            element={user.role === Role.ADMIN ? <ClientMaster /> : <Navigate to="/new-entry" />} 
          />
          <Route 
            path="/admin" 
            element={user.role === Role.ADMIN ? <AdminPanel /> : <Navigate to="/new-entry" />} 
          />
          <Route 
            path="/reports" 
            element={user.role === Role.ADMIN ? <div className="p-4">Reports & Analysis Module</div> : <Navigate to="/new-entry" />} 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;