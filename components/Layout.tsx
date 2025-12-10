
import React from 'react';
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
  Sparkles,
  X,
  Zap,
  Briefcase
} from 'lucide-react';
import { User, Role } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  if (!user) return <>{children}</>;

  const allMenuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
    { path: '/new-entry', label: 'New Entry', icon: PlusCircle, adminOnly: false },
    { path: '/daily-report', label: 'Today Report', icon: FileText, adminOnly: false },
    { path: '/history', label: 'Client History', icon: History, adminOnly: false },
    { path: '/appointments', label: 'Bookings', icon: Calendar, adminOnly: false },
    { path: '/packages', label: 'Service Packages', icon: PackageCheck, adminOnly: false },
    { path: '/clients', label: 'Clients', icon: Users, adminOnly: false }, 
    { path: '/reports', label: 'Analysis', icon: BarChart3, adminOnly: true },
    { path: '/admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
  ];

  const LOGO_URL = "https://i.ibb.co/hhB5D9r/MAHAVEER-Logo-1920x1080-1.png";

  const menuItems = allMenuItems.filter(item => {
      if (user.role === Role.ADMIN) return true;
      if (item.adminOnly) return false;
      if (user.permissions && user.permissions.includes(item.path)) return true;
      return false;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-[#F0F4F8] overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay - High Z-Index */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-[90] lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ADVANCED 3D SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[100] w-[280px] 
        bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-slate-100 
        shadow-[10px_0_40px_-10px_rgba(0,0,0,0.5)] border-r border-slate-700/50
        transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* 3D Lighting Effect */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute -top-[20%] -left-[20%] w-[150%] h-[50%] bg-indigo-600/10 blur-[100px] rotate-12"></div>
             <div className="absolute bottom-0 right-0 w-[80%] h-[40%] bg-purple-600/10 blur-[80px]"></div>
        </div>

        {/* Mobile Close Button */}
        <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
        >
            <X className="w-6 h-6" />
        </button>

        {/* LOGO AREA - Enhanced Visibility */}
        <div className="pt-8 pb-6 px-6 relative z-10 shrink-0">
             {/* White Container for Logo Visibility */}
             <div className="w-full bg-white rounded-2xl p-3 shadow-[0_10px_20px_rgba(0,0,0,0.2)] border-b-4 border-indigo-500 group hover:scale-[1.02] transition-transform duration-300 flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-100 z-0"></div>
                 <img 
                    src={LOGO_URL}
                    alt="Mahaveer Logo" 
                    className="w-full h-auto object-contain max-h-12 relative z-10 drop-shadow-sm" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
             </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-hide relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 px-4 pt-2 flex items-center gap-2 opacity-80">
                 Menu
                 <div className="h-px bg-slate-700/50 flex-1"></div>
              </div>
              
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`relative group flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 overflow-hidden ${
                      active
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_5px_15px_-3px_rgba(79,70,229,0.4)] translate-x-1 border border-indigo-400/30'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white hover:translate-x-1 border border-transparent'
                    }`}
                  >
                    {/* Active Indicator Line */}
                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30"></div>}

                    <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${active ? 'scale-110 text-white drop-shadow-md' : 'group-hover:scale-110 group-hover:text-indigo-300'}`} />
                    <span className={`font-bold text-sm tracking-wide relative z-10 ${active ? 'text-shadow-sm' : ''}`}>{item.label}</span>
                    
                    {active && <ChevronRight className="w-4 h-4 ml-auto text-white/80 animate-in fade-in slide-in-from-left-2" />}
                  </Link>
                );
              })}
        </nav>

        {/* USER PROFILE FOOTER - 3D Card */}
        <div className="p-4 relative z-10 shrink-0">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl p-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.2)] border border-slate-700/50 relative overflow-hidden group">
                {/* Glass sheen */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg">
                                <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center text-white font-black text-sm uppercase">
                                    {user.username.charAt(0)}
                                </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-slate-900 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{user.username}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                <Shield className="w-3 h-3" /> {user.role}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-white/5 transition-all active:scale-95 border border-transparent hover:border-white/10"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Version Info */}
            <div className="mt-3 text-center opacity-30 hover:opacity-100 transition-opacity">
                 <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-1">
                    <Briefcase className="w-3 h-3 text-indigo-500" /> Mahaveer v2.2
                 </p>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F0F4F8]">
        {/* Top Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0 z-50 shadow-[0_2px_10px_rgba(99,102,241,0.5)]"></div>

        {/* Mobile Header - High Visibility */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm lg:hidden flex items-center justify-between p-4 z-40 sticky top-0 border-b border-slate-200">
          <div className="flex items-center gap-3">
               <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-slate-700 hover:text-indigo-600 focus:outline-none bg-slate-100 p-2.5 rounded-xl transition-colors border border-slate-200 active:bg-slate-200 shadow-sm"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="font-black text-slate-800 text-lg tracking-tight flex items-center gap-2">
                 Mahaveer <span className="text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-widest">App</span>
              </span>
          </div>
          
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md">
             <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-indigo-700 font-black text-sm">
                 {user.username.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8 scroll-smooth relative perspective-1000">
           <div className="max-w-7xl mx-auto space-y-8 pb-20">
              {children}
           </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
