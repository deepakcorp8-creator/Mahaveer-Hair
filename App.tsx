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
          {/* Dashboard only for ADMIN. USER goes to /new-entry */}
          <Route 
            path="/" 
            element={user.role === Role.ADMIN ? <Dashboard /> : <Navigate to="/new-entry" replace />} 
          />
          
          <Route path="/new-entry" element={<NewEntryForm />} />
          <Route path="/daily-report" element={<DailyReport />} />
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