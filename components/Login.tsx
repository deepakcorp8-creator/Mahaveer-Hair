
import React, { useState } from 'react';
import { authService } from '../services/auth';
import { User } from '../types';
import { Lock, Eye, EyeOff, User as UserIcon, ArrowRight, ShieldCheck, LayoutDashboard, Mail, CheckCircle2 } from 'lucide-react';

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
      
      {/* LEFT PANEL - DESKTOP ONLY (Hero Section) */}
      <div className="hidden lg:flex w-[60%] relative flex-col justify-between p-16 text-white overflow-hidden bg-[#0F172A]">
         
         {/* Background Gradients */}
         <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#020617] opacity-95"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
         </div>

         {/* Content */}
         <div className="relative z-20 h-full flex flex-col">
            
            {/* Header Badge */}
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-lg">
                  <ShieldCheck className="w-5 h-5 text-indigo-300" />
               </div>
               <span className="font-bold tracking-[0.25em] text-xs uppercase text-indigo-100/70">Secure Portal</span>
            </div>

            {/* Typography */}
            <div className="mb-12">
                <h1 className="text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6 drop-shadow-xl">
                   Manage Your <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300">
                     Hair Solutions
                   </span> <br/>
                   Professionally.
                </h1>
                <p className="text-slate-400 text-lg max-w-lg leading-relaxed font-medium">
                   Smart dashboard to manage appointments, clients & inventory — all in one place.
                </p>
            </div>

            {/* 3D Dashboard Preview (CSS Transform) */}
            <div className="flex-1 relative perspective-[2000px] group pointer-events-none select-none">
                <div className="relative w-[110%] h-full transform rotate-x-[20deg] rotate-y-[-15deg] rotate-z-[5deg] translate-x-[5%] transition-transform duration-1000 ease-out group-hover:rotate-x-[10deg] group-hover:rotate-y-[-5deg]">
                    
                    {/* Glass Container */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-4 flex flex-col gap-4">
                        {/* Fake Header */}
                        <div className="h-10 w-full flex items-center gap-3 border-b border-white/5 pb-2 px-2">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                            </div>
                            <div className="ml-4 h-6 w-48 bg-white/5 rounded-lg"></div>
                        </div>
                        {/* Fake Content Grid */}
                        <div className="flex-1 grid grid-cols-4 gap-4 p-2">
                            <div className="col-span-1 h-32 bg-indigo-500/10 rounded-xl border border-white/5"></div>
                            <div className="col-span-1 h-32 bg-blue-500/10 rounded-xl border border-white/5"></div>
                            <div className="col-span-1 h-32 bg-emerald-500/10 rounded-xl border border-white/5"></div>
                            <div className="col-span-1 h-32 bg-amber-500/10 rounded-xl border border-white/5"></div>
                            <div className="col-span-3 h-64 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                                <LayoutDashboard className="w-24 h-24 text-white/5" />
                            </div>
                            <div className="col-span-1 h-64 bg-white/5 rounded-xl border border-white/5"></div>
                        </div>
                    </div>

                    {/* Reflection */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-2xl pointer-events-none"></div>
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

      {/* RIGHT PANEL - FORM (Mobile Optimized) */}
      <div className="w-full lg:w-[40%] flex items-center justify-center p-6 bg-white">
         <div className="max-w-sm w-full relative flex flex-col">
            
            <div className="text-center mb-10">
               <img 
                 src={LOGO_URL}
                 alt="Mahaveer Logo" 
                 className="h-16 mx-auto mb-6 object-contain"
                 onError={(e) => { e.currentTarget.style.display = 'none'; }} 
               />
               
               <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 mb-6">
                   <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secure Login</span>
               </div>

               <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Welcome Back</h2>
               <p className="text-slate-500 text-sm font-medium">Please enter your details to sign in.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
               <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">Email or Username</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                      </div>
                      <input 
                         type="text"
                         value={username}
                         onChange={(e) => setUsername(e.target.value)}
                         className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                         placeholder="Enter your email or username"
                         required
                      />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">Password</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                      </div>
                      <input 
                         type={showPassword ? "text" : "password"}
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-100 transition-all font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                         placeholder="••••••••••"
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

               {/* Error Message */}
               {error && (
                   <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold flex items-center border border-red-100 animate-in slide-in-from-top-1">
                       <CheckCircle2 className="w-4 h-4 mr-2" />
                       {error}
                   </div>
               )}

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#0F172A] hover:bg-black text-white font-bold rounded-2xl shadow-xl shadow-slate-200 transition-all transform active:scale-[0.98] flex items-center justify-center text-base tracking-wide mt-4 border border-slate-800"
               >
                   {loading ? (
                       <span className="flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Verifying...
                       </span>
                   ) : (
                       <span className="flex items-center">
                           Sign In <ArrowRight className="w-5 h-5 ml-2" />
                       </span>
                   )}
               </button>
            </form>

            <div className="mt-12 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Secure Login</span>
                <span className="w-px h-3 bg-slate-300"></span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Data Protected</span>
            </div>

             {/* Footer */}
             <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                 <p className="text-[10px] text-slate-400 font-medium">© {new Date().getFullYear()} Mahaveer Hair Solution</p>
                 <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Developed by <span className="text-indigo-600 font-black uppercase tracking-wide">Deepak Sahu</span>
                 </p>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Login;
