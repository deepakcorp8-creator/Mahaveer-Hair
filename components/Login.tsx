
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { 
  Lock, Eye, EyeOff, Mail, ArrowRight, ShieldCheck, Sparkles, 
  Fingerprint, Code2, Shield, Leaf, Cpu 
} from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const BokehBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[120px] animate-bokeh-slow" />
      <div className="absolute bottom-[20%] left-[15%] w-[300px] h-[300px] bg-red-800/15 rounded-full blur-[100px] animate-bokeh-reverse" />
      <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[110px] animate-bokeh-medium" />
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-[130px] animate-bokeh-slow" />
      <div className="absolute bottom-[10%] right-[30%] w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-[120px] animate-bokeh-medium" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
    const rotateX = (y - centerY) / 40;
    const rotateY = (centerX - x) / 40;
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
        setError('Verification Failed. Invalid Credentials.'); 
      }
    } catch (err) { 
        setError('Server node unreachable.'); 
    } finally { 
        setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#060811] text-white selection:bg-[#B51A2B] selection:text-white">
      
      <BokehBackground />

      {/* Main Content Wrapper with Bottom Padding to prevent footer overlap */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center py-20 pb-40 lg:pb-20">
        
        {/* LEFT PANEL: SLIDE FROM LEFT */}
        <div className="flex flex-col items-center lg:items-start space-y-12 animate-slide-left">
           <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl backdrop-blur-xl shadow-2xl">
              <div className="p-1.5 bg-[#B51A2B] rounded-lg shadow-lg shadow-[#B51A2B]/30">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">Premium Management</span>
           </div>

           <div className="space-y-8 text-center lg:text-left">
              <h1 className="text-5xl md:text-7xl xl:text-[5rem] font-black tracking-tighter leading-[1] uppercase select-none">
                <span className="block text-white opacity-90">Manage Your</span>
                <span className="block text-[#7DD3FC] drop-shadow-[0_0_30px_rgba(125,211,252,0.4)]">Hair Solutions</span>
                <span className="block text-white">Professionally.</span>
              </h1>
              
              {/* FEATURE LIST: SLIDE FROM BOTTOM STAGGERED */}
              <div className="space-y-6 pt-4">
                  {[
                    { icon: Shield, text: "Premium Quality", color: "#B51A2B" },
                    { icon: Leaf, text: "Fur-Look", color: "#10B981" },
                    { icon: Cpu, text: "Advanced Technology", color: "#7DD3FC" }
                  ].map((feat, idx) => (
                    <div key={idx} className={`flex items-center gap-6 group animate-slide-up`} style={{ animationDelay: `${(idx + 2) * 150}ms` }}>
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl backdrop-blur-md group-hover:border-white/30 transition-all duration-500">
                          <feat.icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="h-px w-8 bg-white/10 hidden md:block" />
                      <h3 className="text-xl md:text-2xl font-black text-white/60 tracking-tight group-hover:text-white transition-colors uppercase">{feat.text}</h3>
                    </div>
                  ))}
              </div>
           </div>

           <div className="relative lg:pl-10 py-4 flex flex-col items-center lg:items-start animate-slide-up" style={{ animationDelay: '800ms' }}>
              <div className="hidden lg:block absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-[#B51A2B] to-transparent rounded-full" />
              <p className="text-lg md:text-xl font-bold text-[#FFA586]/70 max-w-md leading-relaxed italic tracking-wide">
                "Where Art Meets Scientific Precision."
              </p>
           </div>
        </div>

        {/* RIGHT PANEL: SLIDE FROM RIGHT */}
        <div 
          ref={cardRef} 
          onMouseMove={handleMouseMove} 
          onMouseLeave={handleMouseLeave} 
          className="w-full max-w-[460px] mx-auto transition-transform duration-500 ease-out animate-slide-right z-20"
        >
            <div className="relative group">
                {/* Glow Backdrop */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#B51A2B] to-transparent rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                
                <div className="relative bg-[#0F121D]/80 backdrop-blur-3xl rounded-[3rem] border-2 border-white/10 p-8 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-visible">
                    
                    {/* LOGO: DROP FROM TOP */}
                    <div className="flex justify-center mb-10 -mt-20 lg:-mt-24 animate-slide-down" style={{ animationDelay: '400ms' }}>
                        <div className="relative p-1 rounded-[2rem] bg-gradient-to-br from-[#B51A2B]/40 to-transparent">
                            <div className="bg-white p-5 rounded-[1.8rem] shadow-2xl border border-white/10">
                                <img src={LOGO_URL} alt="Mahaveer Logo" className="h-10 md:h-12 w-auto object-contain" />
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase flex items-center justify-center gap-3">
                           <Fingerprint className="w-6 h-6 text-[#B51A2B]" />
                           SECURE LOGIN
                        </h2>
                        <p className="mt-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.5em]">Employee Authorization</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2 group/input">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">User Identity</label>
                            <div className="relative transition-transform duration-200 active:scale-[0.98]">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-600 group-focus-within/input:text-[#B51A2B] transition-colors"><Mail className="h-4 h-4" /></div>
                                <input 
                                  type="text" 
                                  value={username} 
                                  onChange={(e) => setUsername(e.target.value)} 
                                  className="w-full pl-14 pr-6 py-4.5 bg-[#060811]/60 border-2 border-slate-800 rounded-2xl text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/5 focus:border-[#B51A2B]/60 transition-all" 
                                  placeholder="Enter User ID" 
                                  required 
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group/input">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Security Key</label>
                            <div className="relative transition-transform duration-200 active:scale-[0.98]">
                                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-600 group-focus-within/input:text-[#B51A2B] transition-colors"><Lock className="h-4 h-4" /></div>
                                <input 
                                  type={showPassword ? "text" : "password"} 
                                  value={password} 
                                  onChange={(e) => setPassword(e.target.value)} 
                                  className="w-full pl-14 pr-16 py-4.5 bg-[#060811]/60 border-2 border-slate-800 rounded-2xl text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:ring-4 focus:ring-[#B51A2B]/5 focus:border-[#B51A2B]/60 transition-all" 
                                  placeholder="••••••••" 
                                  required 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-6 text-slate-600 hover:text-white transition-colors">
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3.5 bg-red-950/30 border border-red-500/20 text-red-200 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-3 animate-shake">
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              {error}
                            </div>
                        )}

                        <button 
                          type="submit" 
                          disabled={loading} 
                          className="w-full group py-4.5 bg-gradient-to-r from-[#B51A2B] to-[#851A2B] hover:to-[#B51A2B] text-white font-black text-lg rounded-2xl shadow-2xl shadow-[#B51A2B]/20 transition-all active:scale-95 flex items-center justify-center uppercase tracking-[0.3em] border-t border-white/10 hover:shadow-[#B51A2B]/40"
                        >
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <span className="flex items-center gap-4">Verify <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" /></span>}
                        </button>

                        <div className="text-center pt-8 border-t border-white/5">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] leading-relaxed">
                              Managed by <br/>
                              <span className="text-slate-400">Mahaveer Hair Solution Pvt Ltd</span>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      </div>

      {/* DEVELOPER PILL: SLIDE FROM BOTTOM CENTER */}
      {/* Fixed z-index and spacing to prevent button overlap */}
      <div className="fixed bottom-8 left-0 right-0 flex flex-col md:flex-row items-center justify-center gap-4 z-50 pointer-events-none animate-slide-up-long">
         
         <div className="pointer-events-auto flex items-center gap-3 px-6 py-2.5 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B51A2B] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Security Node Active</span>
         </div>

         <div className="pointer-events-auto flex items-center gap-3 px-6 py-2.5 bg-[#131C2E]/80 backdrop-blur-2xl rounded-full border border-white/5 shadow-2xl group hover:border-[#B51A2B]/40 transition-colors">
            <div className="bg-[#B51A2B] p-1.5 rounded-lg shadow-xl"><Code2 className="w-3.5 h-3.5 text-white" /></div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
              Developed by <span className="text-[#FFA586] ml-1">Deepak Sahu</span>
            </span>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bokeh {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .animate-bokeh-slow { animation: bokeh 15s ease-in-out infinite; }
        .animate-bokeh-medium { animation: bokeh 12s ease-in-out infinite; }
        .animate-bokeh-reverse { animation: bokeh 18s ease-in-out infinite reverse; }
        
        @keyframes slideLeft {
          from { transform: translateX(-60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideRight {
          from { transform: translateX(60px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slide-left { animation: slideLeft 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-right { animation: slideRight 1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-up-long { animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-down { animation: slideDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" /></svg>
);

export default Login;
