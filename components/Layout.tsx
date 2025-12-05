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
  FileText
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
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN] },
    { path: '/new-entry', label: 'New Entry', icon: PlusCircle, roles: [Role.ADMIN, Role.USER] },
    { path: '/daily-report', label: 'Today Report', icon: FileText, roles: [Role.ADMIN] },
    { path: '/appointments', label: 'Bookings', icon: Calendar, roles: [Role.ADMIN, Role.USER] },
    { path: '/packages', label: 'Service Packages', icon: PackageCheck, roles: [Role.ADMIN, Role.USER] },
    { path: '/clients', label: 'Clients', icon: Users, roles: [Role.ADMIN] },
    { path: '/reports', label: 'Analysis', icon: BarChart3, roles: [Role.ADMIN] },
    { path: '/admin', label: 'Admin Panel', icon: Shield, roles: [Role.ADMIN] },
  ];

  // Filter items based on current user role
  const menuItems = allMenuItems.filter(item => item.roles.includes(user.role));

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

      {/* Sidebar - Dark Modern Theme */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-900 text-slate-100 shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-8 pb-4">
            <div className="flex items-center space-x-3 mb-1">
                {/* Updated Logo Logic */}
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/30 p-0.5">
                     <img 
                        src="https://i.ibb.co/9mktdv75/LOGO-1080x1080.png" 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerText = 'M';
                            e.currentTarget.parentElement!.style.color = '#4f46e5';
                            e.currentTarget.parentElement!.style.fontWeight = 'bold';
                        }} 
                    />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Mahaveer</h1>
            </div>
            <p className="text-xs text-slate-400 ml-16">Hair Solution Manager</p>
          </div>

          <div className="px-6 py-2">
            <div className="h-px bg-slate-800 w-full"></div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
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
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between group hover:bg-slate-750 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors">{user.username}</span>
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
          <span className="font-semibold text-slate-800">Mahaveer</span>
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