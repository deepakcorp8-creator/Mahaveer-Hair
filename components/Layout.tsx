
import React, { useEffect, useState, useRef } from 'react';
// Fix: Use named imports for react-router-dom as namespace destructuring was failing
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Calendar,
  Users,
  Shield,
  LogOut,
  BarChart3,
  Menu,
  ChevronRight,
  PackageCheck,
  FileText,
  History,
  X,
  Code2,
  Wallet,
  Bell,
  Home,
  User as UserIcon,
  Camera,
  Save,
  Loader2,
  UploadCloud,
  Terminal,
  Cpu
} from 'lucide-react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayApptCount, setTodayApptCount] = useState(0);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    dpUrl: '',
    gender: 'Male',
    dob: '',
    address: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // SCROLL TO TOP ON ROUTE CHANGE
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Sync profile form with user data when modal opens
  useEffect(() => {
    if (isProfileModalOpen && user) {
      setProfileForm({
        dpUrl: user.dpUrl || '',
        gender: user.gender || 'Male',
        dob: user.dob || '',
        address: user.address || ''
      });
    }
  }, [isProfileModalOpen, user]);

  useEffect(() => {
    // Check for pending packages if user is Admin
    if (user?.role === Role.ADMIN) {
      const checkPending = async () => {
        try {
          const pkgs = await api.getPackages();
          const count = pkgs.filter(p => p.status === 'PENDING' || !p.status).length;
          setPendingCount(count);
        } catch (e) {
          console.error("Failed to check pending packages", e);
        }
      };

      checkPending();
      const interval = setInterval(checkPending, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // POLL APPOINTMENTS FOR BADGE
  useEffect(() => {
    const checkAppointments = async () => {
      try {
        const appts = await api.getAppointments();
        const todayStr = new Date().toISOString().split('T')[0];
        // Local normalization check just in case, similar to Booking component
        // But simplest is to check raw strings if they match today or normalized
        const count = appts.filter(a => {
          if (a.status === 'CANCELLED' || a.status === 'CLOSED') return false;

          // Check exact ISO match or DD/MM/YYYY match if needed
          // For badge simplicity, let's trust the store or do simple check
          if (a.date === todayStr) return true;

          // Handle DD/MM/YYYY
          if (a.date && a.date.includes('/')) {
            const parts = a.date.split('/');
            if (parts.length === 3) {
              const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              return iso === todayStr;
            }
          }
          return false;
        }).length;
        setTodayApptCount(count);
      } catch (e) { console.error("Appt Badge Error", e); }
    };

    checkAppointments();
    const interval = setInterval(checkAppointments, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setProfileForm(prev => ({ ...prev, dpUrl: dataUrl }));
      };
    };
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const result = await api.updateUserProfile({
        username: user.username,
        ...profileForm
      });
      if (result) {
        const updatedUser = { ...user, ...profileForm };
        localStorage.setItem('mahaveer_user', JSON.stringify(updatedUser));
        window.location.reload();
      } else { alert("Failed to update profile on server."); }
    } catch (e) { alert("Failed to save profile."); }
    finally { setSavingProfile(false); setIsProfileModalOpen(false); }
  };

  if (!user) return <>{children}</>;

  const allMenuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { path: '/new-entry', label: 'New Entry', icon: PlusCircle, adminOnly: false },
    { path: '/pending-dues', label: 'Payment Follow-up', icon: Wallet, adminOnly: false },
    { path: '/daily-report', label: 'Today Report', icon: FileText, adminOnly: false },
    { path: '/history', label: 'Client History', icon: History, adminOnly: false },
    { path: '/appointments', label: 'Appointments', icon: Calendar, adminOnly: false },
    { path: '/packages', label: 'Service Packages', icon: PackageCheck, adminOnly: false },
    { path: '/clients', label: 'Clients', icon: Users, adminOnly: false },
    { path: '/reports', label: 'Analysis', icon: BarChart3, adminOnly: true },
    { path: '/admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
  ];

  const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

  const menuItems = allMenuItems.filter(item => {
    if (user.role === Role.ADMIN) return true;
    if (item.adminOnly) return false;
    if (user.permissions && user.permissions.includes(item.path)) return true;
    return false;
  });

  const isActive = (path: string) => location.pathname === path;
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden font-sans">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[90] lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[100] w-[240px] 
        bg-[#020617] text-slate-100 
        shadow-2xl border-r border-white/5
        transform transition-transform duration-300 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Dynamic Background Elements - Enhanced */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-20%] w-[120%] h-[40%] bg-indigo-600/10 blur-[100px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[100%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full mix-blend-screen"></div>
          <div className="absolute top-[40%] left-[20%] w-[50%] h-[20%] bg-blue-500/5 blur-[80px] rounded-full mix-blend-screen"></div>
        </div>

        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden absolute top-4 right-4 text-slate-400 p-2 z-50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>

        <div className="pt-6 pb-4 px-4 relative z-10 shrink-0">
          <div className="w-full bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md rounded-2xl p-[1px] shadow-2xl relative group overflow-hidden transition-all duration-500 hover:shadow-indigo-500/20">
            <div className="bg-white/95 rounded-xl flex items-center justify-center h-16 w-full overflow-hidden relative group-hover:bg-white transition-colors duration-500">
               {/* Enhanced Shine Effect */}
               <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
              <img
                src={LOGO_URL}
                alt="Mahaveer Logo"
                className="w-full h-full object-contain p-1 drop-shadow-sm relative z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-hide relative z-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 px-3 pt-2 flex items-center gap-2">
            <span className="opacity-80">Nav</span>
            <div className="h-px bg-gradient-to-r from-slate-800 via-slate-700 to-transparent flex-1"></div>
          </div>
          {menuItems.map((item, idx) => {
            const active = isActive(item.path);
            const showBadge = (item.path === '/packages' && user.role === Role.ADMIN && pendingCount > 0) ||
              (item.path === '/appointments' && todayApptCount > 0);
            const badgeCount = item.path === '/packages' ? pendingCount : todayApptCount;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ animationDelay: `${idx * 40}ms` }}
                className={`relative group flex items-center px-3 py-2.5 rounded-lg transition-all duration-300 animate-in slide-in-from-left-4 fade-in fill-mode-backwards overflow-hidden
                      ${active
                    ? 'bg-indigo-600 text-white shadow-[0_4px_12px_-4px_rgba(79,70,229,0.4)] translate-x-1'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                  }`}
              >
                {/* Active Lighting Effect */}
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-50 blur-sm"></div>
                )}
                
                {/* Selection Indicator */}
                 {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white rounded-r-lg shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}

                <item.icon className={`w-4 h-4 mr-3 transition-transform duration-300 group-hover:scale-110 relative z-10 ${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                <span className={`font-semibold text-xs tracking-wide relative z-10 ${active ? 'text-white' : ''}`}>{item.label}</span>

                {/* Badge */}
                {showBadge && (
                  <span className="absolute right-3 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0 rounded-md border border-rose-400/50 shadow-lg animate-pulse z-10">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 relative z-10 shrink-0 space-y-3 pt-3 border-t border-white/5 bg-[#020617]/50 backdrop-blur-sm">
          {/* Copyright / Credits */}
          <div className="px-1">
             <div className="flex items-center justify-between text-[9px] text-slate-600">
                <span className="opacity-60 font-medium">© 2025 Mahaveer</span>
                <span className="opacity-40">v2.1</span>
             </div>
          </div>
        </div>
      </aside>

      {/* Profile Modal & Main Content */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full transition-colors hover:bg-slate-200"><X className="w-5 h-5 text-slate-500" /></button>
            <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
            <div className="pt-14 px-8 pb-8">
              <div className="text-center mb-6"><h3 className="text-2xl font-black text-slate-800">{user.username}</h3><p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{user.role}</p></div>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"><UploadCloud className="w-5 h-5" /> Change Photo</button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <button type="submit" disabled={savingProfile} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl flex items-center justify-center hover:bg-slate-800 shadow-lg transition-all active:scale-95">{savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F0F4F8]">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0 z-50"></div>

        <header className="hidden lg:flex items-center justify-between px-6 py-2 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 shrink-0 h-14 shadow-sm">
          <div className="flex items-center text-slate-400 text-[10px] font-black uppercase bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-inner"><Calendar className="w-3 h-3 mr-1.5 text-indigo-500" />{todayDate}</div>
          <div className="flex items-center gap-3">
            {user.role === Role.ADMIN && pendingCount > 0 && <Link to="/packages" className="p-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse"><Bell className="w-4 h-4" /></Link>}
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* Header Profile Pill */}
            <div onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-2.5 pl-1 pr-3 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:bg-slate-50">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                     {user.dpUrl ? <img src={user.dpUrl} className="w-full h-full object-cover" /> : <span className="text-indigo-600 font-black text-[10px]">{user.username.charAt(0)}</span>}
                  </div>
               </div>
               <div className="flex flex-col items-start mr-0.5">
                   <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{user.username}</span>
                   <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{user.role}</span>
               </div>
               <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>

            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100" title="Logout">
                <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <header className="bg-white/90 shadow-md lg:hidden flex items-center justify-between p-3 z-40 sticky top-0 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700 bg-slate-100 p-2 rounded-lg border border-slate-200 shadow-sm"><Menu className="w-5 h-5" /></button>
            <span className="font-black text-slate-800 text-base tracking-tight">Mahaveer</span>
          </div>
          <div className="flex items-center gap-3">
            {user.role === Role.ADMIN && pendingCount > 0 && <Link to="/packages" className="p-1.5 text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100"><Bell className="w-4 h-4" /></Link>}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md"><div className="w-full h-full rounded-full bg-white flex items-center justify-center text-indigo-700 font-black text-xs overflow-hidden">{user.dpUrl ? <img src={user.dpUrl} className="w-full h-full object-cover" /> : user.username.charAt(0)}</div></div>
          </div>
        </header>

        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
