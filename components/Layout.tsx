
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
  History
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

  // Define all possible menu items
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

  // Filter items based on permissions
  const menuItems = allMenuItems.filter(item => {
      // 1. Admin gets everything
      if (user.role === Role.ADMIN) return true;

      // 2. Strict Admin Only pages are always hidden for regular users
      if (item.adminOnly) return false;

      // 3. Check specific permissions
      if (user.permissions && user.permissions.includes(item.path)) {
          return true;
      }

      return false;
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-900 text-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* LOGO AREA - Maximized Visibility */}
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-center items-center shrink-0">
             <div className="w-full bg-white rounded-2xl p-2 shadow-xl shadow-black/20 transform hover:scale-[1.02] transition-transform duration-300 overflow-hidden border border-slate-700/30">
                 <img 
                    src={LOGO_URL}
                    alt="Mahaveer Logo" 
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain max-h-20" 
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }} 
                />
             </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isActive(item.path) && <ChevronRight className="w-4 h-4 text-indigo-200" />}
                </Link>
              ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0">
            <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between group hover:bg-slate-750 transition-colors mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md uppercase">
                    {user.username.charAt(0)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors truncate w-24">{user.username}</span>
                  <span className="text-xs text-slate-400">{user.role}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 transition-colors p-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Professional Footer Credits */}
            <div className="pt-3 border-t border-slate-800 text-center opacity-70 hover:opacity-100 transition-opacity">
                 <p className="text-[10px] text-slate-500 font-medium">
                    Copyright © {new Date().getFullYear()} Mahaveer Hair Solution
                 </p>
                 <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-wider">
                    Developed by <span className="text-slate-400 font-bold">Deepak Sahu</span>
                 </p>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm lg:hidden flex items-center justify-between p-4 z-10 border-b border-slate-200">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-slate-600 focus:outline-none hover:bg-slate-100 p-2 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-slate-800 text-lg">Mahaveer</span>
          <div className="w-6" />
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 lg:p-8">
           <div className="max-w-7xl mx-auto">
              {children}
           </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
