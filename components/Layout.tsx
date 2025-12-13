
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
  X,
  Code2,
  Wallet
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
    { path: '/pending-dues', label: 'Pending Dues', icon: Wallet, adminOnly: false },
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

      {/* PREMIUM SIDEBAR DESIGN */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[100] w-[280px] 
        bg-[#0B1120] text-slate-100 
        shadow-[10px_0_40px_-10px_rgba(0,0,0,0.5)] border-r border-slate-800
        transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Ambient Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-10%] left-[-20%] w-[150%] h-[40%] bg-indigo-900/20 blur-[80px] rounded-full"></div>
             <div className="absolute bottom-0 right-0 w-[100%] h-[30%] bg-blue-900/10 blur-[60px] rounded-full"></div>
        </div>

        {/* Mobile Close Button */}
        <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
        >
            <X className="w-6 h-6" />
        </button>

        {/* LOGO AREA - Maximized Visibility */}
        <div className="pt-6 pb-6 px-4 relative z-10 shrink-0">
             <div className="w-full bg-white rounded-xl p-1 shadow-[0_0_25px_rgba(255,255,255,0.1)] border border-slate-700/50 group hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all duration-500 overflow-hidden relative">
                 {/* Subtle shine effect */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                 
                 <div className="bg-white rounded-lg flex items-center justify-center h-20 w-full overflow-hidden">
                     <img 
                        src={LOGO_URL}
                        alt="Mahaveer Logo" 
                        className="w-full h-full object-contain p-1" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    />
                 </div>
             </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-hide relative z-10">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 px-3 pt-2 flex items-center gap-2">
                 Menu
                 <div className="h-px bg-slate-800 flex-1"></div>
              </div>
              
              {menuItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`relative group flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                      active
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.6)] translate-x-1 border border-indigo-400/50'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400 group-hover:scale-110'}`} />
                    <span className={`font-bold text-sm tracking-wide ${active ? 'text-white' : ''}`}>{item.label}</span>
                    
                    {active && <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></div>}
                  </Link>
                );
              })}
        </nav>

        {/* USER PROFILE FOOTER */}
        <div className="p-4 relative z-10 shrink-0 bg-gradient-to-t from-[#0B1120] to-transparent">
            {/* User Card */}
            <div className="bg-[#131C2E] rounded-xl p-3 shadow-lg border border-slate-700/50 flex items-center justify-between group hover:border-indigo-500/30 transition-colors">
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-md">
                        <div className="w-full h-full rounded-[7px] bg-[#131C2E] flex items-center justify-center text-white font-black text-sm uppercase">
                            {user.username.charAt(0)}
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{user.username}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</span>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            {/* Footer Text - Professional Style */}
            <div className="mt-5 text-center pb-1 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                 <p className="text-[10px] text-slate-400 font-black tracking-[0.1em] uppercase">
                    MAHAVEER HAIR SOLUTION © 2025
                 </p>
                 <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[9px] text-slate-500 font-bold tracking-wider uppercase bg-[#131C2E] py-1 px-2 rounded-full inline-flex border border-slate-800">
                    <Code2 className="w-3 h-3 text-indigo-500" />
                    <span>Developed by <span className="text-slate-300">Deepak Sahu</span></span>
                 </div>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F0F4F8]">
        {/* Top Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0 z-50 shadow-[0_2px_10px_rgba(99,102,241,0.5)]"></div>

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
