
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { 
  Lock, Eye, EyeOff, Mail, ArrowRight, ShieldCheck, Zap, Sparkles, 
  Fingerprint, Activity, MousePointer2, Code2, Database, Cloud, 
  LineChart, Smartphone, Layers
} from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Key to re-trigger animations on click
  const [animationKey, setAnimationKey] = useState(0);
  
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

  const triggerAnimation = () => {
    setAnimationKey(prev => prev + 1);
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
    <div 
      onClick={triggerAnimation}
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#0B0F1A] text-[#FFA586] selection:bg-[#B51A2B] selection:text-white cursor-pointer"
    >
      
      {/* BACKGROUND CINEMATIC EFFECTS */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-[#B51A2B]/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] bg-indigo-900/15 rounded-full blur-[140px]" />
        
        {/* PRECISION GRID */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_80%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-0 items-center py-12">
        
        {/* LEFT BRANDING AREA - SHIFTED LEFT */}
        <div 
          key={animationKey}
          className="flex flex-col items-center lg:items-start space-y-12 lg:-ml-12 lg:pr-4 perspective-3d overflow-visible"
        >
           
           <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl shadow-2xl animate-3d-slide-top duration-1000">
              <div className="p-1.5 bg-[#B51A2B] rounded-lg shadow-lg shadow-[#B51A2B]/40">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.6em] text-white">Mahaveer Hair Solution</span>
           </div>

           <div className="space-y-4 text-center lg:text-left relative w-full overflow-visible">
              <h1 className="text-5xl md:text-7xl xl:text-[6.2rem] font-black tracking-tighter leading-[0.95] uppercase select-none flex flex-col items-center lg:items-start overflow-visible whitespace-nowrap">
                <span className="block text-white opacity-0 animate-3d-slide-left filter blur-sm">
                  Manage Your
                </span>
                <span className="block text-[#7DD3FC] opacity-0 animate-3d-slide-right delay-200 filter blur-sm drop-shadow-[0_0_30px_rgba(125,211,252,0.5)]">
                  Hair Solutions
                </span>
                <span className="block text-white opacity-0 animate-3d-slide-bottom delay-500 filter blur-sm relative z-20">
                  Professionally.
                </span>
              </h1>
              
              <div className="relative lg:pl-2 mt-12 flex flex-col items-center lg:items-start space-y-6 animate-in fade-in duration-1000 delay-1000">
                <p className="text-xl md:text-3xl font-extrabold text-[#FFA586]/90 max-w-lg leading-tight italic drop-shadow-lg">
                  "Where Art Meets Scientific Precision."
                </p>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md">
                        <div className="w-2 h-2 rounded-full bg-[#B51A2B] animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Auth Secure</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">V.2.4 Verified</span>
                    </div>
                </div>
              </div>

              {/* FLOATING GEOMETRY */}
              <div className="hidden xl:block absolute -left-20 bottom-[-60px] opacity-20 animate-float-slow">
                 <Database className="w-16 h-16 text-white" />
              </div>
           </div>

           {/* TECH CHIPS */}
           <div className="flex gap-5 animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-1200">
              {[MousePointer2, Zap, Smartphone, Layers].map((Icon, idx) => (
                  <div key={idx} className="p-4.5 bg-white/5 border border-white/10 rounded-[1.25rem] hover:bg-[#B51A2B]/20 hover:border-[#B51A2B]/40 transition-all transform hover:-translate-y-2 group">
                      <Icon className="w-5.5 h-5.5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
              ))}
           </div>
        </div>

        {/* RIGHT LOGIN CARD */}
        <div className="w-full relative z-30" onClick={(e) => e.stopPropagation()}>
            <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="w-full max-w-[480px] mx-auto transition-transform duration-500 ease-out animate-in fade-in slide-in-from-right-10 duration-1000 relative">
                
                <div className="absolute -inset-8 bg-[#B51A2B]/20 rounded-[5rem] blur-[60px] opacity-30 animate-pulse" />
                
                <div className="relative bg-[#161B2E]/90 backdrop-blur-[60px] rounded-[4rem] border border-white/10 p-10 md:p-14 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]">
                    
                    <div className="flex justify-center mb-12 -mt-24 lg:-mt-28">
                        <div className="relative p-2 rounded-[2.5rem] bg-gradient-to-br from-[#B51A2B] via-indigo-900 to-slate-800 shadow-2xl scale-110">
                            <div className="bg-white p-6 rounded-[2rem] shadow-inner border border-slate-700">
                                <img src={LOGO_URL} alt="Mahaveer Logo" className="h-12 md:h-14 w-auto object-contain" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center gap-4 mb-3">
                            <div className="h-px w-8 bg-slate-700"></div>
                            <Fingerprint className="w-9 h-9 text-[#B51A2B] animate-pulse" />
                            <div className="h-px w-8 bg-slate-700"></div>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-[0.2em] uppercase">SYSTEM ACCESS</h2>
                        <p className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]">Secure Employee Node</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-30">
                        <div className="space-y-3 group/input">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Protocol Identity</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-[#B51A2B] transition-colors"><Mail className="h-5.5 w-5.5" /></div>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-16 pr-6 py-5 bg-[#0B0F1A]/80 border-2 border-slate-800/50 rounded-[2rem] text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-8 focus:ring-[#B51A2B]/5 focus:border-[#B51A2B] transition-all text-lg" placeholder="Enter ID" required />
                            </div>
                        </div>

                        <div className="space-y-3 group/input">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-5">Security Cipher</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-[#B51A2B] transition-colors"><Lock className="h-5.5 w-5.5" /></div>
                                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-16 pr-16 py-5 bg-[#0B0F1A]/80 border-2 border-slate-800/50 rounded-[2rem] text-white font-bold placeholder:text-slate-700 focus:outline-none focus:ring-8 focus:ring-[#B51A2B]/5 focus:border-[#B51A2B] transition-all text-lg" placeholder="••••••••" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-6 text-slate-500 hover:text-white transition-colors">{showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}</button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-5 bg-red-950/40 border border-red-500/30 text-red-200 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl flex items-center gap-4 animate-shake"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" />{error}</div>
                        )}

                        <button type="submit" disabled={loading} className="w-full group py-5.5 bg-gradient-to-r from-[#B51A2B] to-[#851A2B] hover:shadow-[0_20px_45px_-10px_rgba(181,26,43,0.5)] text-white font-black text-xl rounded-[2rem] transition-all active:scale-[0.97] flex items-center justify-center uppercase tracking-[0.4em] border-t border-white/20 shadow-2xl">
                            {loading ? <RefreshCw className="w-7 h-7 animate-spin" /> : <span className="flex items-center gap-5">INITIALIZE <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" /></span>}
                        </button>
                    </form>
                    
                    <div className="mt-14 pt-10 border-t border-white/5 text-center">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] leading-relaxed mb-1">Central Authorization Hub</p>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Mahaveer Hair Solution Pvt Ltd</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* FOOTER SYSTEM INFO */}
      <div className="fixed bottom-0 left-0 right-0 p-10 flex flex-col md:flex-row items-center justify-between gap-6 z-50 pointer-events-none select-none opacity-60">
         <div className="flex items-center gap-4 px-8 py-3 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Core Connection: Active
         </div>
         <div className="flex items-center gap-4 px-8 py-3 bg-gradient-to-r from-[#B51A2B]/10 to-indigo-900/10 backdrop-blur-2xl rounded-full border border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Design by <span className="text-white border-b border-[#B51A2B] ml-2">Deepak Sahu</span>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-3d { perspective: 2500px; }
        
        /* 3D Directional Motion Animations */
        @keyframes slideIn3DLeft {
          0% { transform: translateX(-300px) rotateY(60deg) translateZ(-200px); opacity: 0; filter: blur(20px); }
          100% { transform: translateX(0) rotateY(0deg) translateZ(0); opacity: 1; filter: blur(0); }
        }
        
        @keyframes slideIn3DRight {
          0% { transform: translateX(300px) rotateY(-60deg) translateZ(-200px); opacity: 0; filter: blur(20px); }
          100% { transform: translateX(0) rotateY(0deg) translateZ(0); opacity: 1; filter: blur(0); }
        }
        
        @keyframes slideIn3DBottom {
          0% { transform: translateY(300px) rotateX(-60deg) translateZ(-200px); opacity: 0; filter: blur(20px); }
          100% { transform: translateY(0) rotateX(0deg) translateZ(0); opacity: 1; filter: blur(0); }
        }

        @keyframes slideIn3DTop {
          0% { transform: translateY(-100px) rotateX(60deg); opacity: 0; filter: blur(10px); }
          100% { transform: translateY(0) rotateX(0deg); opacity: 1; filter: blur(0); }
        }

        .animate-3d-slide-left { animation: slideIn3DLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-3d-slide-right { animation: slideIn3DRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-3d-slide-bottom { animation: slideIn3DBottom 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-3d-slide-top { animation: slideIn3DTop 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-30px) rotate(10deg) scale(1.1); }
        }
        .animate-float-slow { animation: float 10s ease-in-out infinite; }
        .animate-float-medium { animation: float 7s ease-in-out infinite; }

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
