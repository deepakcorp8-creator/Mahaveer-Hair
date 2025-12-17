
import React, { useState } from 'react';
import { authService } from '../services/auth';
import { User } from '../types';
import { Lock, Eye, EyeOff, User as UserIcon, ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authService.login(username.trim(), password.trim());
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans overflow-hidden">
      
      {/* Left Side - Hero / Branding */}
      <div className="hidden lg:flex w-[55%] relative flex-col justify-between p-16 text-white overflow-hidden bg-[#0a0e27]">
         
         {/* Background Gradients & Effects */}
         <div className="absolute inset-0 z-0">
            {/* Main Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#020617] opacity-90"></div>
            
            {/* Glowing Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]"></div>
            
            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
         </div>

         {/* Content Layer */}
         <div className="relative z-20 h-full flex flex-col">
            
            {/* Header Badge */}
            <div className="flex items-center gap-3 mb-12">
               <div className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
                  <ShieldCheck className="w-5 h-5 text-indigo-300" />
               </div>
               <span className="font-bold tracking-[0.2em] text-xs uppercase text-indigo-200/80">Secure Portal</span>
            </div>

            {/* Typography */}
            <div className="mb-10">
                <h1 className="text-6xl font-black tracking-tight leading-[1.1] mb-6 drop-shadow-2xl">
                   Manage Your <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-300 to-sky-300 animate-pulse">
                     Hair Solutions
                   </span> <br/>
                   Professionally.
                </h1>
                <p className="text-slate-400 text-lg max-w-lg leading-relaxed font-medium">
                   Smart dashboard to manage appointments, clients & inventory — all in one place.
                </p>
            </div>

            {/* 3D Dashboard Preview Mockup */}
            <div className="flex-1 relative perspective-1000 group">
                <div className="relative w-full h-full transform rotate-x-12 rotate-y-6 rotate-z-[-2deg] scale-90 transition-transform duration-700 ease-out group-hover:rotate-x-0 group-hover:rotate-y-0 group-hover:rotate-z-0 group-hover:scale-100 origin-top-left">
                    
                    {/* Glass Container */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-4 flex flex-col gap-4">
                        {/* Fake Header */}
                        <div className="h-8 w-full flex items-center gap-2 border-b border-white/5 pb-2">
                            <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-400/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-400/80"></div>
                            <div className="ml-4 h-4 w-32 bg-white/10 rounded-full"></div>
                        </div>
                        {/* Fake Content Grid */}
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div className="col-span-2 h-32 bg-indigo-500/20 rounded-xl border border-white/5"></div>
                            <div className="h-32 bg-blue-500/20 rounded-xl border border-white/5"></div>
                            <div className="col-span-3 h-40 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                                <LayoutDashboard className="w-16 h-16 text-white/10" />
                            </div>
                        </div>
                    </div>

                    {/* Reflection/Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-2xl"></div>
                </div>
            </div>

            {/* Footer Text */}
            <div className="mt-8 flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>© 2025 Mahaveer</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                <span>v1.0.0</span>
            </div>
         </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 bg-slate-50/50">
         <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-8 md:p-12 relative flex flex-col border border-slate-100">
            
            <div className="text-center mb-8">
               <img 
                 src={LOGO_URL}
                 alt="Mahaveer Logo" 
                 className="h-16 mx-auto mb-6 object-contain"
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} 
               />
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Welcome Back</h2>
               <p className="text-slate-500 text-sm font-bold mt-2">Sign in to your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
               <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                      <input 
                         type="text"
                         value={username}
                         onChange={(e) => setUsername(e.target.value)}
                         className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                         placeholder="Enter ID"
                         required
                      />
                  </div>
               </div>

               <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                      <input 
                         type={showPassword ? "text" : "password"}
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                         placeholder="••••••••"
                         required
                      />
                      <button 
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                         {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                  </div>
               </div>

               {error && (
                   <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold flex items-center border border-red-100 animate-in slide-in-from-top-1">
                       <ShieldCheck className="w-4 h-4 mr-2" />
                       {error}
                   </div>
               )}

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#0f172a] hover:bg-black text-white font-bold rounded-xl shadow-xl shadow-slate-200 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center text-sm tracking-wide mt-2"
               >
                   {loading ? (
                       <span className="flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Verifying...
                       </span>
                   ) : (
                       <span className="flex items-center">
                           Sign In 
                       </span>
                   )}
               </button>
            </form>

            <div className="my-8 flex items-center justify-center gap-6 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Secure Login</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Data Protected</span>
            </div>

             {/* Footer */}
             <div className="pt-6 border-t border-slate-100 text-center">
                 <p className="text-[10px] text-slate-400 font-medium">Copyright © {new Date().getFullYear()} Mahaveer Hair Solution</p>
                 <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-wider font-bold">
                    Developed by <span className="text-indigo-500">Deepak Sahu</span>
                 </p>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Login;
