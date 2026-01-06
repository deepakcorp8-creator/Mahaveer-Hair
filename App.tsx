
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NewEntryForm from './components/NewEntryForm';
import ClientMaster from './components/ClientMaster';
import AppointmentBooking from './components/AppointmentBooking';
import ServicePackages from './components/ServicePackages';
import DailyReport from './components/DailyReport';
import ClientHistory from './components/ClientHistory'; 
import PendingPayments from './components/PendingPayments';
import AdminPanel from './components/AdminPanel';
import ReportsAnalytics from './components/ReportsAnalytics';
import Login from './components/Login';
import { User, Role } from './types';
import { Clock } from 'lucide-react';
import { api } from './services/api';

const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM;

// Define props for ProtectedRoute
interface ProtectedRouteProps {
  user: User;
  children: React.ReactElement;
  path: string;
}

// ProtectedRoute Logic
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children, path }) => {
     if (user.role === Role.ADMIN) return children;
     
     // Auth service now guarantees permissions array is populated (even with defaults)
     const userPerms = user.permissions || [];
     
     if (userPerms.includes(path)) {
         return children;
     }

     // If denied, redirect to the first allowed page or empty
     const firstAllowed = userPerms[0] || '/';
     return <Navigate to={firstAllowed} replace />;
};

function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('mahaveer_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
      return null;
    }
  });

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UPDATED TIME: 20 Minutes Total
  const TIMEOUT_DURATION = 20 * 60 * 1000; 
  const WARNING_DURATION = 19 * 60 * 1000; 
  const CHECK_INTERVAL = 10 * 1000; 

  // Pre-fetch data on load
  useEffect(() => {
    if (user) {
        // Initial fetch to populate cache with error handling
        api.getOptions().catch(console.error);
        api.getEntries().catch(console.error);
        api.getAppointments().catch(console.error);
    }
  }, [user]);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mahaveer_user');
    setShowTimeoutWarning(false);
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('mahaveer_user', JSON.stringify(loggedInUser));
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      if (showTimeoutWarning) {
        setShowTimeoutWarning(false);
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    checkIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity > TIMEOUT_DURATION) {
        handleLogout();
      } else if (timeSinceLastActivity > WARNING_DURATION) {
        if (!showTimeoutWarning) setShowTimeoutWarning(true);
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [user, showTimeoutWarning, handleLogout]);

  const stayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    setShowTimeoutWarning(false);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
       {showTimeoutWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Session Expiring</h3>
              <p className="text-slate-500 text-sm mb-6">
                You have been inactive for a while. For security, you will be logged out in <span className="font-bold text-amber-600">1 minute</span>.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Log Out
                </button>
                <button 
                  onClick={stayLoggedIn}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
                >
                  Stay Logged In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route 
            path="/" 
            element={user.role === Role.ADMIN ? <Dashboard /> : <Navigate to="/new-entry" replace />} 
          />
          
          <Route path="/new-entry" element={
              <ProtectedRoute user={user} path="/new-entry"><NewEntryForm /></ProtectedRoute>
          } />
          
          <Route path="/pending-dues" element={
              <ProtectedRoute user={user} path="/pending-dues"><PendingPayments /></ProtectedRoute>
          } />

          <Route path="/daily-report" element={
              <ProtectedRoute user={user} path="/daily-report"><DailyReport /></ProtectedRoute>
          } />
          
          <Route path="/appointments" element={
              <ProtectedRoute user={user} path="/appointments"><AppointmentBooking /></ProtectedRoute>
          } />

          <Route path="/history" element={
              <ProtectedRoute user={user} path="/history"><ClientHistory /></ProtectedRoute>
          } />
          
          <Route path="/packages" element={
              <ProtectedRoute user={user} path="/packages"><ServicePackages /></ProtectedRoute>
          } /> 
          
          <Route path="/clients" element={
              <ProtectedRoute user={user} path="/clients"><ClientMaster /></ProtectedRoute>
          } />
          
          <Route 
            path="/admin" 
            element={user.role === Role.ADMIN ? <AdminPanel /> : <Navigate to="/new-entry" />} 
          />
          <Route 
            path="/reports" 
            element={user.role === Role.ADMIN ? <ReportsAnalytics /> : <Navigate to="/new-entry" />} 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
