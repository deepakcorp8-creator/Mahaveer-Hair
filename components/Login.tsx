
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Lock, Eye, EyeOff, Mail, ArrowRight, ShieldCheck, Zap, Sparkles, Fingerprint, Activity, MousePointer2, Code2, Terminal } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current || window.innerWidth < 1024) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { authService } = await import('../services/auth');
      const user = await authService.login(username.trim(), password.trim());
      if (user) { onLogin(user); } else { setError('Security credentials rejected.'); }
    } catch (err) { setError('System connection error. Retry.'); } finally { setLoading(false); }
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#0F1423] text-[#FFA586] selection:bg-[#B51A2B] selection:text-white">
      
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-[#B51A2B]/15 rounded-full blur-[140px] animate-blob-morph" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#541A2E]/30 rounded-full blur-[140px] animate-blob-morph-delayed" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-12">
        
        {/* LEFT BRANDING */}
        <div className="flex flex-col items-center lg:items-start space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
           <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="p-1.5 bg-[#B51A2B] rounded-lg shadow-lg shadow-[#B51A2B]/40">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-100">Elite Restoration Hub</span>
           </div>

           <div className="space-y-4 text-center lg:text-left">
              <h1 className="text-5xl md:text-7xl xl:text-[7.5rem] font-black tracking-tighter leading-[0.85] uppercase select-none">
                <span className="block text-white transition-all hover:tracking-widest duration-700">REDEFINE</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#B51A2B] via-[#FFA586] to-[#B51A2B] animate-shimmer-text">ESTHETICS</span>
              </h1>
              
              <div className="relative lg:pl-10 space-y-4 flex flex-col items-center lg:items-start">
                <div className="hidden lg:block absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-[#B51A2B] to-transparent rounded-full shadow-[0_0_15px_rgba(181,26,43,0.5)]" />
                <p className="text-xl md:text-3xl font-bold text-[#FFA586] max-w-md leading-tight italic drop-shadow-2xl">
                  "Where Art Meets Scientific Precision."
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                   <Activity className="w-3.5 h-3.5 text-[#B51A2B]" /> Bio-Metric Node 09 Active
                </p>
              </div>
           </div>

           <div className="flex gap-4">
              {[MousePointer2, Zap, ShieldCheck].map((Icon, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#B51A2B]/10 hover:border-[#B51A2B] transition-all transform hover:-translate-y-2 group cursor-pointer shadow-xl">
                      <Icon className="w-6 h-6 text-slate-400 group-hover:text-[#B51A2B] transition-colors" />
                  </div>
              ))}
           </div>
        </div>

        {/* RIGHT LOGIN CARD */}
        <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="w-full max-w-[480px] mx-auto transition-transform duration-300 ease-out animate-in fade-in slide-in-from-right-10 duration-1000 z-20">
            <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-[#B51A2B]/40 to-transparent rounded-[4rem] blur-3xl opacity-30 animate-pulse-slow" />
                <div className="relative bg-[#1A2138]/70 backdrop-blur-[60px] rounded-[3rem] border-2 border-white/10 p-8 md:p-12 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
                    
                    <div className="flex justify-center mb-10 -mt-20 lg:-mt-24">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative bg-white p-5 rounded-2xl shadow-2xl border-4 border-[#242F49] transform group-hover:scale-105 transition-transform duration-500">
                                <img src={LOGO_URL} alt="Mahaveer Logo" className="h-14 md:h-16 w-auto object-contain" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-3">
                           <Fingerprint className="w-7 h-7 text-[#B51A2B]" />
                           SECURE LOGIN
                        </h2>
                        <div className="mt-2 flex items-center justify-center gap-3">
                           <div className="h-[1px] w-8 bg-slate-700" />
                           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Staff Identification</p>
                           <div className="h-[1px] w-8 bg-slate-700" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-30">
                        <div className="space-y-1.5 group/input">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-3">User ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-[#B51A2B] transition-colors"><Mail className="h-5 w-5" /></div>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-14 pr-6 py-4.5 bg-[#0F1423]/80 border-2 border-slate-700 rounded-2xl text-white font-black placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/10 focus:border-[#B51A2B] transition-all shadow-inner" placeholder="Enter ID" required />
                            </div>
                        </div>

                        <div className="space-y-1.5 group/input">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-3">Security Key</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-[#B51A2B] transition-colors"><Lock className="h-5 w-5" /></div>
                                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-14 py-4.5 bg-[#0F1423]/80 border-2 border-slate-700 rounded-2xl text-white font-black placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/10 focus:border-[#B51A2B] transition-all shadow-inner" placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-5 text-slate-500 hover:text-white transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 animate-shake"><div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />{error}</div>
                        )}

                        <button type="submit" disabled={loading} className="w-full group py-5 bg-gradient-to-r from-[#B51A2B] via-[#851A2B] to-[#B51A2B] hover:scale-[1.02] text-white font-black text-lg rounded-2xl shadow-[0_15px_30px_-5px_rgba(181,26,43,0.5)] transition-all active:scale-95 flex items-center justify-center uppercase tracking-[0.2em] border-t border-white/20">
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <span className="flex items-center gap-3">Verify <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></span>}
                        </button>

                        <div className="text-center pt-6 border-t border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] leading-relaxed">Managed & Protected by <br/><span className="text-[#B51A2B] opacity-80">@MAHAVEER HUB V.5.0.2</span></p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>

      {/* FOOTER - MOBILE OPTIMIZED DEVELOPER CREDIT */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 z-50 pointer-events-none select-none">
         <div className="flex items-center gap-3 px-6 py-2.5 bg-[#1A2138]/60 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B51A2B] animate-pulse" />
            Security Node Active
         </div>
         
         <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#B51A2B]/20 to-[#1A2138]/40 backdrop-blur-3xl rounded-full border border-[#B51A2B]/40 shadow-[0_0_20px_rgba(181,26,43,0.2)]">
            <div className="bg-[#B51A2B] p-1.5 rounded-lg shadow-lg"><Code2 className="w-3.5 h-3.5 text-white" /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Developed by <span className="text-[#FFA586] border-b border-[#FFA586]/40">Deepak Sahu</span>
            </span>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-morph {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 40% 60% 60%; transform: translate(0, 0) scale(1); }
          50% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(5%, -5%) scale(1.1); }
        }
        .animate-blob-morph { animation: blob-morph 20s ease-in-out infinite; }
        .animate-blob-morph-delayed { animation: blob-morph 20s ease-in-out 3s infinite reverse; }
        @keyframes shimmer-text { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .animate-shimmer-text { background-size: 200% auto; animation: shimmer-text 6s linear infinite; }
        .animate-pulse-slow { animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}} />
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>
);

export default Login;
