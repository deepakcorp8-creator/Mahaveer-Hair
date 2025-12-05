import React, { useState } from 'react';
import { authService } from '../services/auth';
import { User } from '../types';
import { Lock, Eye, EyeOff, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic trim to help with accidental spaces
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
    <div className="min-h-screen flex w-full bg-white font-sans">
      
      {/* Left Side - Hero / Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
         {/* Abstract shapes/Background */}
         <div className="absolute top-0 left-0 w-full h-full z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px] opacity-40"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px] opacity-40"></div>
            <div className="absolute top-[40%] left-[20%] w-[200px] h-[200px] bg-purple-500 rounded-full blur-[80px] opacity-30 animate-pulse"></div>
         </div>

         {/* Content */}
         <div className="relative z-10 mt-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
                  <ShieldCheck className="w-6 h-6 text-indigo-300" />
               </div>
               <span className="font-bold tracking-widest text-sm uppercase text-indigo-200">Secure Portal</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight leading-tight mb-6">
               Manage Your <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                 Hair Solutions
               </span> <br/>
               Professionally.
            </h1>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
               Welcome to the Mahaveer Hair Solution management dashboard. Streamline appointments, track inventory, and manage client relations efficiently.
            </p>
         </div>

         <div className="relative z-10 flex items-center gap-4 text-sm text-slate-500 font-medium">
             <span>© 2025 Mahaveer</span>
             <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
             <span>v1.0.0</span>
         </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 lg:bg-white relative">
        {/* Mobile background decoration */}
         <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 lg:hidden rounded-b-[3rem] z-0">
             <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
         </div>

         <div className="max-w-md w-full bg-white lg:bg-transparent rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none p-8 lg:p-0 relative z-10">
            
            <div className="text-center lg:text-left mb-10">
               <div className="mx-auto lg:mx-0 w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100 overflow-hidden relative group">
                  <img 
                    src="https://i.ibb.co/9mktdv75/LOGO-1080x1080.png" 
                    alt="Logo" 
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        // Show fallback
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                            parent.className = 'mx-auto lg:mx-0 w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-md';
                            const fallback = document.createElement('span');
                            fallback.innerText = 'M';
                            fallback.className = 'text-white font-black text-4xl';
                            parent.appendChild(fallback);
                        }
                    }} 
                  />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
               <p className="text-slate-500 mt-2 font-medium">Please enter your details to sign in.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Username</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                      <input 
                         type="text"
                         value={username}
                         onChange={(e) => setUsername(e.target.value)}
                         className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold text-slate-800 placeholder:font-normal"
                         placeholder="Enter username"
                         required
                      />
                  </div>
               </div>

               {/* Password */}
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Password</label>
                  <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                      <input 
                         type={showPassword ? "text" : "password"}
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-semibold text-slate-800 placeholder:font-normal"
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

               {/* Error Message */}
               {error && (
                   <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-bold flex items-center animate-in fade-in slide-in-from-top-2 border border-red-100">
                       <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                       {error}
                   </div>
               )}

               <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-300 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center text-base"
               >
                   {loading ? (
                       <span className="flex items-center">
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                           Authenticating...
                       </span>
                   ) : (
                       <span className="flex items-center">
                           Sign In <ArrowRight className="ml-2 w-5 h-5" />
                       </span>
                   )}
               </button>

            </form>

             {/* Footer / Demo Creds */}
             <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                 <p className="text-xs text-slate-400 mb-3 font-semibold uppercase tracking-wider">Developed by Deepak Sahu</p>
                 <div className="inline-flex items-center justify-center px-4 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-xs font-mono text-slate-500">
                        Demo: <strong className="text-slate-800">admin</strong> / <strong className="text-slate-800">admin</strong>
                    </span>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Login;