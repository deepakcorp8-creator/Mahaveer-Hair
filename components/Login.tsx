
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Lock, Eye, EyeOff, Mail, ArrowRight, ShieldCheck, Zap, Sparkles, Fingerprint, Activity, MousePointer2, Code2 } from 'lucide-react';

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
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;
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
      if (user) { onLogin(user); } else { setError('Access Denied. Invalid Credentials.'); }
    } catch (err) { setError('Connection lost. Please try again.'); } finally { setLoading(false); }
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#0B0F1A] text-[#FFA586] selection:bg-[#B51A2B] selection:text-white">
      
      {/* PROFESSIONAL BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#B51A2B]/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-indigo-900/20 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center py-10">
        
        {/* LEFT BRANDING */}
        <div className="flex flex-col items-center lg:items-start space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000">
           <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="p-1.5 bg-[#B51A2B] rounded-lg shadow-lg shadow-[#B51A2B]/30">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Mahaveer Hair Solution</span>
           </div>

           <div className="space-y-6 text-center lg:text-left">
              <h1 className="text-5xl md:text-8xl xl:text-[8.5rem] font-black tracking-tighter leading-[0.8] uppercase select-none">
                <span className="block text-white">REDEFINE</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#B51A2B] via-[#FFA586] to-[#B51A2B] animate-shimmer">ESTHETICS</span>
              </h1>
              
              <div className="relative lg:pl-12 space-y-5 flex flex-col items-center lg:items-start">
                <div className="hidden lg:block absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-[#B51A2B] via-[#FFA586] to-transparent rounded-full" />
                <p className="text-xl md:text-3xl font-extrabold text-[#FFA586] max-w-md leading-tight italic drop-shadow-2xl">
                  "Where Art Meets Scientific Precision."
                </p>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                   <Activity className="w-4 h-4 text-[#B51A2B] animate-bounce" />
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Node 09 Secured</span>
                </div>
              </div>
           </div>

           <div className="flex gap-5">
              {[MousePointer2, Zap, ShieldCheck].map((Icon, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#B51A2B]/20 hover:border-[#B51A2B] transition-all transform hover:-translate-y-2 group cursor-pointer">
                      <Icon className="w-6 h-6 text-slate-500 group-hover:text-[#B51A2B] transition-colors" />
                  </div>
              ))}
           </div>
        </div>

        {/* RIGHT LOGIN CARD */}
        <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="w-full max-w-[480px] mx-auto transition-transform duration-300 ease-out animate-in fade-in slide-in-from-right-10 duration-1000 z-20">
            <div className="relative">
                <div className="absolute -inset-4 bg-[#B51A2B]/30 rounded-[4rem] blur-3xl opacity-20" />
                <div className="relative bg-[#161B2E]/80 backdrop-blur-3xl rounded-[3.5rem] border-2 border-white/10 p-8 md:p-14 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
                    
                    <div className="flex justify-center mb-10 -mt-20 lg:-mt-28">
                        <div className="relative p-1 rounded-[2rem] bg-gradient-to-br from-[#B51A2B] to-transparent">
                            <div className="bg-white p-5 rounded-[1.8rem] shadow-2xl border-2 border-slate-800">
                                <img src={LOGO_URL} alt="Mahaveer Logo" className="h-12 md:h-16 w-auto object-contain" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-3">
                           <Fingerprint className="w-8 h-8 text-[#B51A2B]" />
                           SECURE LOGIN
                        </h2>
                        <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Employee Authorization</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-30">
                        <div className="space-y-2 group/input">
                            <label className="text-[10px] font-black text-slate-200 uppercase tracking-widest ml-4">User Identity</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-[#B51A2B] transition-colors"><Mail className="h-5 w-5" /></div>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-[#0B0F1A]/90 border-2 border-slate-700 rounded-[1.5rem] text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/10 focus:border-[#B51A2B] transition-all" placeholder="Enter User ID" required />
                            </div>
                        </div>

                        <div className="space-y-2 group/input">
                            <label className="text-[10px] font-black text-slate-200 uppercase tracking-widest ml-4">Security Key</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-[#B51A2B] transition-colors"><Lock className="h-5 w-5" /></div>
                                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-14 pr-16 py-5 bg-[#0B0F1A]/90 border-2 border-slate-700 rounded-[1.5rem] text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/10 focus:border-[#B51A2B] transition-all" placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-6 text-slate-500 hover:text-white transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 animate-shake"><div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />{error}</div>
                        )}

                        <button type="submit" disabled={loading} className="w-full group py-5.5 bg-gradient-to-r from-[#B51A2B] via-[#851A2B] to-[#B51A2B] hover:scale-[1.03] text-white font-black text-xl rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(181,26,43,0.5)] transition-all active:scale-95 flex items-center justify-center uppercase tracking-[0.3em] border-t border-white/20">
                            {loading ? <RefreshCw className="w-7 h-7 animate-spin" /> : <span className="flex items-center gap-4">Verify <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" /></span>}
                        </button>

                        <div className="text-center pt-8 border-t border-white/5">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] leading-relaxed italic">Managed by <br/><span className="text-slate-400 not-italic">MAHAVEER HAIR SOLUTION PVT LTD</span></p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>

      {/* FIXED PROFESSIONAL FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 z-50 pointer-events-none select-none">
         <div className="flex items-center gap-3 px-6 py-2.5 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#B51A2B] animate-pulse" />
            Security Node Active
         </div>
         
         <div className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-[#161B2E]/60 to-[#B51A2B]/10 backdrop-blur-3xl rounded-full border border-[#B51A2B]/40 shadow-2xl">
            <div className="bg-[#B51A2B] p-1.5 rounded-lg shadow-xl"><Code2 className="w-4 h-4 text-white" /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
              Developed by <span className="text-[#FFA586] border-b border-[#FFA586]/30 ml-1">Deepak Sahu</span>
            </span>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .animate-shimmer { background-size: 200% auto; animation: shimmer 8s linear infinite; }
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