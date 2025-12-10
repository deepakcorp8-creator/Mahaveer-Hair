
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Sparkles
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
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ADVANCED 3D SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 
        bg-[#0F172A] text-slate-100 shadow-[20px_0_50px_-10px_rgba(0,0,0,0.3)] 
        transform transition-transform duration-300 ease-in-out flex flex-col
        border-r border-slate-800/50 relative overflow-hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 -left-20 w-60 h-60 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 -right-20 w-60 h-60 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* LOGO AREA - 3D Glass Effect */}
        <div className="p-6 relative z-10 shrink-0">
             <div className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/10 flex items-center justify-center group hover:bg-white/10 transition-all duration-500 hover:scale-[1.02]">
                 <img 
                    src={LOGO_URL}
                    alt="Mahaveer Logo" 
                    className="w-full h-auto object-contain max-h-14 drop-shadow-lg filter brightness-110" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
             </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 relative z-10">
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                      active
                        ? 'text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.5)] translate-x-1'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1'
                    }`}
                  >
                    {/* Active Background Gradient with 3D Depth */}
                    {active && (
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 opacity-100 transition-opacity border-l-4 border-indigo-300"></div>
                    )}

                    <div className="flex items-center relative z-10">
                      <item.icon className={`w-5 h-5 mr-3.5 transition-transform duration-300 ${active ? 'text-white scale-110' : 'text-slate-500 group-hover:text-indigo-400 group-hover:scale-110'}`} />
                      <span className={`font-bold tracking-wide text-sm ${active ? 'text-white' : ''}`}>{item.label}</span>
                    </div>
                    
                    {active && <ChevronRight className="w-4 h-4 text-white relative z-10 animate-in slide-in-from-left-2" />}
                  </Link>
                );
              })}
        </nav>

        {/* USER PROFILE FOOTER */}
        <div className="p-4 relative z-10 shrink-0">
            <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-slate-700/50 shadow-lg group hover:border-slate-600 transition-all hover:bg-slate-800/60">
              <div className="flex items-center space-x-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shadow-lg text-lg border border-white/10">
                        {user.username.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{user.username}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase bg-slate-900/80 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-slate-700/50">{user.role}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Credits */}
            <div className="mt-4 text-center opacity-30 hover:opacity-100 transition-opacity pb-2">
                 <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                    MAHAVEER HAIR SOLUTION © {new Date().getFullYear()}
                 </p>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0 z-50 shadow-[0_2px_10px_rgba(99,102,241,0.5)]"></div>

        {/* Mobile Header */}
        <header className="bg-white/90 backdrop-blur-md shadow-sm lg:hidden flex items-center justify-between p-4 z-20 sticky top-0 border-b border-slate-200/60">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-slate-600 hover:text-indigo-600 focus:outline-none bg-slate-50 p-2.5 rounded-xl transition-colors border border-slate-200"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-100" />
              <span className="font-black text-slate-800 text-xl tracking-tight">Mahaveer</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FAFC] p-4 lg:p-8 scroll-smooth">
           <div className="max-w-7xl mx-auto space-y-8">
              {children}
           </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
