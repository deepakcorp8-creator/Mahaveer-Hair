import React, { useState } from 'react';
import { authService } from '../services/auth';
import { User } from '../types';
import { Lock, Eye, EyeOff, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden relative z-10 transition-all hover:shadow-3xl">
        
        {/* Header Section */}
        <div className="pt-10 pb-6 text-center px-8">
          <div className="mx-auto w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 p-2 transform transition-transform duration-300 hover:scale-105">
             <img 
               src="https://i.ibb.co/9mktdv75/LOGO-1080x1080.png" 
               alt="Mahaveer Logo" 
               className="w-full h-full object-contain"
             />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mahaveer Hair Solution</h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">Hair Replacement & Styling Experts</p>
        </div>
        
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl text-center font-medium animate-pulse">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {/* Username Input */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Username</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:text-sm font-semibold text-slate-800"
                        placeholder="Enter your username"
                        required
                    />
                </div>
            </div>
            
            {/* Password Input */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 sm:text-sm font-semibold text-slate-800"
                        placeholder="••••••••"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                        {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                        ) : (
                        <Eye className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                </>
            ) : (
                <>
                    Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </>
            )}
          </button>

          <div className="pt-2 text-center">
            <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="font-semibold mb-1">Demo Credentials:</p>
                <div className="flex justify-center gap-4">
                    <span>Admin: admin / admin</span>
                    <span>User: DEEPAK / DEEPAK123</span>
                </div>
            </div>
          </div>
        </form>
      </div>

      {/* Developer Footer */}
      <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
         <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1.5 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Developed By
         </p>
         <div className="flex items-center justify-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/60 shadow-sm">
            <span className="text-sm font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                DEEPAK SAHU
            </span>
            <span className="text-slate-300 font-light">|</span>
            <span className="text-sm font-bold text-slate-600">
                AI AUTOMATION
            </span>
         </div>
      </div>
    </div>
  );
};

export default Login;