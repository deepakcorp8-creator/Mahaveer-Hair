
import React, { useEffect, useState, useRef } from 'react';
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
  Loader2
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
                // Force refresh true only occasionally, otherwise use cache for speed
                const pkgs = await api.getPackages(); 
                const count = pkgs.filter(p => p.status === 'PENDING' || !p.status).length;
                setPendingCount(count);
            } catch (e) {
                console.error("Failed to check pending packages", e);
            }
        };
        
        checkPending();
        // Poll every 60 seconds
        const interval = setInterval(checkPending, 60000);
        return () => clearInterval(interval);
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      setSavingProfile(true);
      try {
          // Update Backend
          await api.updateUserProfile({
              username: user.username,
              ...profileForm
          });
          
          // Update Local User State (Hack: We mutate the user object stored in localstorage for instant update without re-login)
          const updatedUser = { ...user, ...profileForm };
          localStorage.setItem('mahaveer_user', JSON.stringify(updatedUser));
          
          // Reload page to reflect changes in app state (simplest way to propagate 'user' prop update from App.tsx)
          // Or we could pass a setUser prop down, but reload is safe here.
          window.location.reload();
          
      } catch (e) {
          console.error("Failed to save profile", e);
          alert("Failed to save profile.");
      } finally {
          setSavingProfile(false);
          setIsProfileModalOpen(false);
      }
  };

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

  const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

  const menuItems = allMenuItems.filter(item => {
      if (user.role === Role.ADMIN) return true;
      if (item.adminOnly) return false;
      if (user.permissions && user.permissions.includes(item.path)) return true;
      return false;
  });

  const isActive = (path: string) => location.pathname === path;

  // Formatting date for header
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

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
                const isPackageItem = item.path === '/packages';
                const showBadge = isPackageItem && user.role === Role.ADMIN && pendingCount > 0;
                
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

                    {/* Pending Count Badge for Packages */}
                    {showBadge && (
                        <span className="absolute right-3 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse border border-red-400">
                            {pendingCount}
                        </span>
                    )}
                  </Link>
                );
              })}
        </nav>

        {/* USER PROFILE FOOTER - NOW CLICKABLE */}
        <div className="p-4 relative z-10 shrink-0 bg-gradient-to-t from-[#0B1120] to-transparent">
            {/* User Card */}
            <div 
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-[#131C2E] rounded-xl p-3 shadow-lg border border-slate-700/50 flex items-center justify-between group hover:border-indigo-500/50 hover:bg-[#1A263E] transition-all cursor-pointer"
                title="Click to Edit Profile"
            >
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-md">
                        <div className="w-full h-full rounded-[7px] bg-[#131C2E] flex items-center justify-center overflow-hidden">
                            {user.dpUrl ? (
                                <img src={user.dpUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-white font-black text-sm uppercase">{user.username.charAt(0)}</span>
                            )}
                        </div>
                        {/* Edit Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <Camera className="w-3 h-3 text-white" />
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors">{user.username}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</span>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onLogout(); }}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition-colors z-20"
                    title="Logout"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            {/* Footer Text */}
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

      {/* PROFILE SETTINGS MODAL */}
      {isProfileModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200">
                  <button 
                    onClick={() => setIsProfileModalOpen(false)}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
                  >
                      <X className="w-5 h-5 text-slate-500" />
                  </button>

                  {/* Header with Background */}
                  <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                          <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-100 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                              <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 relative group">
                                  {profileForm.dpUrl ? (
                                      <img src={profileForm.dpUrl} alt="Preview" className="w-full h-full object-cover" />
                                  ) : (
                                      <UserIcon className="w-8 h-8 text-slate-300" />
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="pt-14 px-8 pb-8">
                      <div className="text-center mb-6">
                          <h3 className="text-2xl font-black text-slate-800">{user.username}</h3>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{user.role} Account</p>
                      </div>

                      <form onSubmit={handleProfileSave} className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Profile Image URL</label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                      placeholder="https://imgur.com/..."
                                      value={profileForm.dpUrl}
                                      onChange={(e) => setProfileForm({...profileForm, dpUrl: e.target.value})}
                                  />
                                  <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 ml-1">Paste a direct link to an image (e.g., from Imgur, Pinterest).</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Gender</label>
                                  <select 
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={profileForm.gender}
                                      onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                                  >
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                      <option value="Other">Other</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Date of Birth</label>
                                  <input 
                                      type="date" 
                                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={profileForm.dob}
                                      onChange={(e) => setProfileForm({...profileForm, dob: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Full Address</label>
                              <textarea 
                                  rows={2}
                                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                  placeholder="Enter your address..."
                                  value={profileForm.address}
                                  onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                              />
                          </div>

                          <button 
                              type="submit" 
                              disabled={savingProfile}
                              className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg active:scale-95 mt-2"
                          >
                              {savingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
                          </button>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F0F4F8]">
        {/* Top Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 absolute top-0 left-0 z-50 shadow-[0_2px_10px_rgba(99,102,241,0.5)]"></div>

        {/* DESKTOP TOP BAR (Sticky Header) - Prevents Overlap */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 shrink-0 h-16 shadow-sm">
             {/* Left: Breadcrumb / Date */}
             <div className="flex items-center gap-2">
                 <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    <Calendar className="w-3 h-3 mr-1.5" />
                    {todayDate}
                 </div>
             </div>

             {/* Right: Notification Area */}
             <div className="flex items-center gap-4">
                 {/* Notification Icon */}
                 {user.role === Role.ADMIN && pendingCount > 0 && (
                    <Link 
                        to="/packages" 
                        className="relative p-2.5 rounded-full bg-white text-indigo-600 border border-indigo-100 shadow-sm hover:shadow-md hover:bg-indigo-50 transition-all group hover:border-indigo-200"
                        title={`${pendingCount} Approvals Pending`}
                    >
                        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                        
                        {/* Red Dot Badge */}
                        <span className="absolute top-1.5 right-2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                        </span>
                    </Link>
                 )}
             </div>
        </header>

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
          
          <div className="flex items-center gap-3">
             {/* NOTIFICATION BELL FOR ADMIN (Mobile) */}
             {user.role === Role.ADMIN && pendingCount > 0 && (
                <Link to="/packages" className="relative p-2 mr-1 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100 shadow-sm">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                        {pendingCount}
                    </span>
                </Link>
             )}

             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-md">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-indigo-700 font-black text-sm overflow-hidden">
                    {user.dpUrl ? (
                        <img src={user.dpUrl} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        user.username.charAt(0).toUpperCase()
                    )}
                </div>
             </div>
          </div>
        </header>

        {/* Content Area - Added ref for scrolling */}
        <main 
            ref={mainContentRef}
            className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8 scroll-smooth relative perspective-1000"
        >
           <div className="max-w-7xl mx-auto space-y-8 pb-20">
              {children}
           </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
