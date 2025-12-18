
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Lock, Eye, EyeOff, Mail, ArrowRight, ShieldCheck, Zap, Sparkles, Fingerprint, Activity, MousePointer2 } from 'lucide-react';

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

  /**
   * COLOR PALETTE (Requested):
   * #161B2F - Deepest Midnight
   * #242F49 - Deep Navy
   * #384358 - Slate
   * #FFA586 - Peach Highlight
   * #B51A2B - Crimson/Red
   * #541A2E - Deep Wine
   */

  // Subtle 3D Tilt Effect - Optimized to not block input focus
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
      if (user) { 
        onLogin(user);
      } else { 
        setError('Security credentials rejected.'); 
      }
    } catch (err) { 
      setError('System connection error. Retry.'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#161B2F] text-[#FFA586] selection:bg-[#B51A2B] selection:text-white"
    >
      
      {/* --- LAYER 0: ANIMATED BACKGROUND (Non-Interactive) --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Shifting Plasma Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#B51A2B]/20 rounded-full blur-[120px] animate-blob-morph" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#541A2E]/40 rounded-full blur-[120px] animate-blob-morph-delayed" />
        
        {/* Static Grid texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
        
        {/* Floating Particle Elements */}
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full animate-float-slow opacity-10 bg-white"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.2}s`
            }}
          />
        ))}
      </div>

      {/* --- LAYER 1: CONTENT WRAPPER --- */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        
        {/* LEFT: BRANDING (With Movementable Text) */}
        <div className="flex flex-col items-start space-y-10 animate-in fade-in slide-in-from-left-12 duration-1000">
           
           <div className="inline-flex items-center gap-4 bg-[#242F49]/60 border border-[#384358] px-6 py-3 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="p-1.5 bg-[#B51A2B] rounded-lg shadow-inner">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Elite Restoration Hub</span>
           </div>

           <div className="space-y-6">
              <h1 className="text-7xl md:text-[8rem] font-black tracking-tighter leading-[0.8] uppercase select-none cursor-default">
                <span className="block text-white transition-all hover:tracking-widest duration-700 animate-float-text">REDEFINE</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#B51A2B] via-[#FFA586] to-[#B51A2B] animate-shimmer-text">ESTHETICS</span>
              </h1>
              
              <div className="relative pl-10 space-y-5">
                <div className="absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b from-[#B51A2B] to-transparent rounded-full" />
                <p className="text-2xl md:text-3xl font-bold text-[#FFA586] max-w-md leading-tight italic drop-shadow-lg">
                  "Where Art Meets Scientific Precision."
                </p>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#384358] flex items-center gap-2">
                   <Activity className="w-4 h-4 text-[#B51A2B]" /> Bio-Metric Node 09 Active
                </p>
              </div>
           </div>

           <div className="flex gap-4">
              {[MousePointer2, Zap, ShieldCheck].map((Icon, idx) => (
                  <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-[#B51A2B] transition-all transform hover:-translate-y-2 group cursor-pointer">
                      <Icon className="w-6 h-6 text-[#384358] group-hover:text-[#B51A2B] animate-bounce-slow" />
                  </div>
              ))}
           </div>
        </div>

        {/* RIGHT: THE 3D LOGIN CARD */}
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full max-w-[500px] mx-auto transition-transform duration-300 ease-out animate-in fade-in slide-in-from-right-12 duration-1000 z-20"
        >
            <div className="relative">
                {/* 3D Inner Shadow & Glow */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[#B51A2B]/30 to-[#161B2F]/40 rounded-[4rem] blur-3xl opacity-40 animate-pulse-slow" />
                
                {/* Main Crystal Card */}
                <div className="relative bg-[#242F49]/50 backdrop-blur-[60px] rounded-[3.5rem] border-2 border-white/10 p-10 md:p-14 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-visible">
                    
                    {/* Interior Light Sweep */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[3.5rem] pointer-events-none" />

                    {/* LOGO PLATE (Floating Above Form) */}
                    <div className="flex justify-center mb-12 -mt-20 lg:-mt-24">
                        <div className="relative p-2 rounded-3xl transform hover:scale-110 transition-transform duration-700">
                            <div className="absolute inset-0 bg-white blur-3xl opacity-20" />
                            <div className="relative bg-white p-6 rounded-2xl shadow-2xl border-4 border-[#384358]">
                                <img 
                                    src={LOGO_URL} 
                                    alt="Mahaveer Logo" 
                                    className="h-16 md:h-20 w-auto object-contain" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-3">
                           <Fingerprint className="w-8 h-8 text-[#B51A2B] animate-pulse" />
                           SECURE LOGIN
                        </h2>
                        <div className="mt-2 flex items-center justify-center gap-3">
                           <div className="h-px w-8 bg-[#384358]" />
                           <p className="text-[10px] font-black text-[#384358] uppercase tracking-[0.5em]">Staff Identification</p>
                           <div className="h-px w-8 bg-[#384358]" />
                        </div>
                    </div>

                    {/* --- THE FORM (Guaranteed Interactive) --- */}
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-30">
                        
                        <div className="space-y-2 group/input">
                            <label className="text-[10px] font-black text-[#384358] uppercase tracking-widest ml-3">User ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-[#384358] group-focus-within/input:text-[#B51A2B] transition-colors" />
                                </div>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    className="w-full pl-14 pr-6 py-5 bg-[#161B2F]/80 border-2 border-[#384358] rounded-2xl text-white font-black placeholder:text-[#384358] focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/20 focus:border-[#B51A2B] transition-all shadow-inner" 
                                    placeholder="Enter Employee ID" 
                                    required 
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group/input">
                            <label className="text-[10px] font-black text-[#384358] uppercase tracking-widest ml-3">Security Key</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-[#384358] group-focus-within/input:text-[#B51A2B] transition-colors" />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="w-full pl-14 pr-16 py-5 bg-[#161B2F]/80 border-2 border-[#384358] rounded-2xl text-white font-black placeholder:text-[#384358] focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/20 focus:border-[#B51A2B] transition-all shadow-inner" 
                                    placeholder="••••••••" 
                                    required 
                                    autoComplete="current-password"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)} 
                                    className="absolute inset-y-0 right-0 pr-6 text-[#384358] hover:text-[#B51A2B] transition-colors z-40"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-950/30 border border-red-500/30 text-red-200 text-[11px] font-black uppercase tracking-widest rounded-xl animate-shake flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                               {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full group py-6 bg-gradient-to-r from-[#B51A2B] via-[#541A2E] to-[#B51A2B] hover:from-[#B51A2B] hover:to-[#B51A2B] text-white font-black text-xl rounded-2xl shadow-[0_20px_40px_-10px_rgba(181,26,43,0.5)] transition-all transform active:scale-[0.97] flex items-center justify-center uppercase tracking-[0.3em] border-t border-white/20 relative overflow-hidden"
                        >
                            {loading ? (
                                <RefreshCw className="w-8 h-8 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-4">
                                   Verify <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform text-[#FFA586]" />
                                </span>
                            )}
                        </button>

                        <div className="text-center pt-8 border-t border-white/5">
                            <p className="text-[10px] font-black text-[#384358] uppercase tracking-[0.5em] leading-relaxed">
                                Managed & Protected by <br/>
                                <span className="text-[#B51A2B]/60 font-black">@Mahaveer V.5.0.2</span>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-10 py-3 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl text-[10px] font-black uppercase tracking-[0.6em] text-[#384358] pointer-events-none select-none z-20">
         <ShieldCheck className="w-4 h-4 text-[#B51A2B] animate-pulse" />
         Bio-Tech Secure Active
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob-morph {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 40% 60% 60%; transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%; transform: translate(10%, -10%) scale(1.1) rotate(120deg); }
          66% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: translate(-10%, 10%) scale(0.95) rotate(240deg); }
        }
        .animate-blob-morph { animation: blob-morph 25s ease-in-out infinite; }
        .animate-blob-morph-delayed { animation: blob-morph 25s ease-in-out 4s infinite reverse; }

        @keyframes shimmer-text {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-shimmer-text { background-size: 200% auto; animation: shimmer-text 8s linear infinite; }

        @keyframes float-text {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float-text { animation: float-text 6s ease-in-out infinite; }

        .animate-bounce-slow { animation: bounce 3s infinite; }
        .animate-pulse-slow { animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
};

// Simple Refresh Icon locally to avoid import depth issues
const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" />
    </svg>
);

export default Login;
