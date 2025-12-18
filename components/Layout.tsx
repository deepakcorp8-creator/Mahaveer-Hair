
import React, { useEffect, useState, useRef } from 'react';
// Fix: Use namespace import for react-router-dom to resolve named export resolution issues
import * as RouterDom from 'react-router-dom';
const { Link, useLocation } = RouterDom;
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
  UploadCloud
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
    { path: '/appointments', label: 'Bookings', icon: Calendar, adminOnly: false },
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
        fixed lg:static inset-y-0 left-0 z-[100] w-[280px] 
        bg-[#0B1120] text-slate-100 
        shadow-[10px_0_40px_-10px_rgba(0,0,0,0.5)] border-r border-slate-800
        transform transition-transform duration-300 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-10%] left-[-20%] w-[150%] h-[40%] bg-indigo-900/20 blur-[80px] rounded-full"></div>
        </div>

        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden absolute top-4 right-4 text-slate-400 p-2 z-50"><X className="w-6 h-6" /></button>

        <div className="pt-6 pb-6 px-4 relative z-10 shrink-0">
             <div className="w-full bg-white rounded-2xl p-1.5 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] border-2 border-white/20 group overflow-hidden relative">
                 {/* LOGO CONTAINER - ADJUSTED HEIGHT AND PADDING TO REMOVE EXCESSIVE WHITE SPACE */}
                 <div className="bg-white rounded-xl flex items-center justify-center h-24 w-full overflow-hidden p-0.5">
                     <img 
                        src={LOGO_URL}
                        alt="Mahaveer Logo" 
                        className="w-full h-full object-contain" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    />
                 </div>
             </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-hide relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 px-3 pt-2 flex items-center gap-2">Menu <div className="h-px bg-slate-800 flex-1"></div></div>
              {menuItems.map((item) => {
                const active = isActive(item.path);
                const showBadge = item.path === '/packages' && user.role === Role.ADMIN && pendingCount > 0;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`relative group flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                      active ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-lg translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                    {showBadge && <span className="absolute right-3 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-red-400">{pendingCount}</span>}
                  </Link>
                );
              })}
        </nav>

        <div className="p-4 relative z-10 shrink-0 bg-gradient-to-t from-[#0B1120] to-transparent">
            <div onClick={() => setIsProfileModalOpen(true)} className="bg-[#131C2E] rounded-xl p-3 border border-slate-700/50 flex items-center justify-between group hover:bg-[#1A263E] transition-all cursor-pointer">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-md">
                        <div className="w-full h-full rounded-[7px] bg-[#131C2E] flex items-center justify-center overflow-hidden">
                            {user.dpUrl ? <img src={user.dpUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white font-black text-sm uppercase">{user.username.charAt(0)}</span>}
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">{user.username}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{user.role}</span>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onLogout(); }} className="text-slate-500 hover:text-red-400 p-2"><LogOut className="w-4 h-4" /></button>
            </div>
            <div className="mt-5 text-center pb-1">
                 <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[9px] text-slate-500 font-bold bg-[#131C2E] py-1 px-2 rounded-full border border-slate-800">
                    <Code2 className="w-3 h-3 text-indigo-500" />
                    <span>Developed by <span className="text-slate-300">Deepak Sahu</span></span>
                 </div>
            </div>
        </div>
      </aside>

      {/* Profile Modal & Main Content */}
      {isProfileModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative">
                  <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
                  <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                  <div className="pt-14 px-8 pb-8">
                      <div className="text-center mb-6"><h3 className="text-2xl font-black text-slate-800">{user.username}</h3><p className="text-sm font-bold text-slate-400 uppercase">{user.role}</p></div>
                      <form onSubmit={handleProfileSave} className="space-y-4">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-600 font-bold rounded-xl flex items-center justify-center gap-2"><UploadCloud className="w-5 h-5" /> Change Photo</button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                          <button type="submit" disabled={savingProfile} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center">{savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}</button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F0F4F8]">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-pink-500 absolute top-0 left-0 z-50"></div>
        <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 shrink-0 h-16">
             <div className="flex items-center text-slate-400 text-xs font-bold uppercase bg-slate-50 px-2 py-1 rounded border border-slate-200"><Calendar className="w-3 h-3 mr-1.5" />{todayDate}</div>
             <div className="flex items-center gap-4">{user.role === Role.ADMIN && pendingCount > 0 && <Link to="/packages" className="p-2.5 rounded-full bg-indigo-50 text-indigo-600"><Bell className="w-5 h-5" /></Link>}</div>
        </header>

        <header className="bg-white/90 shadow-sm lg:hidden flex items-center justify-between p-4 z-40 sticky top-0">
          <div className="flex items-center gap-3">
               <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200"><Menu className="w-6 h-6" /></button>
               <span className="font-black text-slate-800 text-lg">Mahaveer</span>
          </div>
          <div className="flex items-center gap-3">
             {user.role === Role.ADMIN && pendingCount > 0 && <Link to="/packages" className="p-2 text-indigo-600 bg-indigo-50 rounded-full"><Bell className="w-5 h-5" /></Link>}
             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]"><div className="w-full h-full rounded-full bg-white flex items-center justify-center text-indigo-700 font-black text-sm overflow-hidden">{user.dpUrl ? <img src={user.dpUrl} className="w-full h-full object-cover" /> : user.username.charAt(0)}</div></div>
          </div>
        </header>

        <main ref={mainContentRef} className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8">
           <div className="max-w-7xl mx-auto space-y-8 pb-20">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
