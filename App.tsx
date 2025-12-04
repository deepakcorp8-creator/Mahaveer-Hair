import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NewEntryForm from './components/NewEntryForm';
import ClientMaster from './components/ClientMaster';
import AppointmentBooking from './components/AppointmentBooking';
import ServicePackages from './components/ServicePackages';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { User, Role } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-entry" element={<NewEntryForm />} />
          <Route path="/clients" element={<ClientMaster />} />
          <Route path="/appointments" element={<AppointmentBooking />} />
          <Route path="/packages" element={<ServicePackages />} /> {/* New Route */}
          
          {/* Admin Protected Route */}
          <Route 
            path="/admin" 
            element={user.role === Role.ADMIN ? <AdminPanel /> : <Navigate to="/" />} 
          />

          {/* Fallback for analysis/reports (placeholder for now) */}
          <Route path="/reports" element={<div className="p-4">Reports & Analysis Module (Coming Soon)</div>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
