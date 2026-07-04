import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const [phase, setPhase] = useState<'logo' | 'version' | 'exit'>('logo');

    const LOGO_URL = "https://i.ibb.co/wFDKjmJS/MAHAVEER-Logo-1920x1080.png";

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('version'), 1200);
        const t2 = setTimeout(() => setPhase('exit'), 3200);
        const t3 = setTimeout(() => onComplete(), 3900);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}`}
            style={{ background: 'linear-gradient(135deg, #0f0e17 0%, #1a1145 40%, #0d1b2a 100%)' }}
        >
            <style>{`
                @keyframes splashPulseRing {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    50% { transform: scale(1.5); opacity: 0; }
                    100% { transform: scale(0.8); opacity: 0; }
                }
                @keyframes splashLogoIn {
                    0% { opacity: 0; transform: scale(0.5) translateY(20px); filter: blur(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                }
                @keyframes splashVersionIn {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes splashShine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes splashLineExpand {
                    0% { width: 0; }
                    100% { width: 120px; }
                }
                .splash-logo { animation: splashLogoIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .splash-version { animation: splashVersionIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
                .splash-line { animation: splashLineExpand 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
            `}</style>

            {/* Background orbs */}
            <div className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[100px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.8), transparent 70%)', top: '15%', left: '20%' }} />
            <div className="absolute w-[300px] h-[300px] rounded-full opacity-15 blur-[80px] pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.8), transparent 70%)', bottom: '20%', right: '15%' }} />

            {/* Pulse rings behind logo */}
            <div className="absolute" style={{ animation: 'splashPulseRing 2.5s ease-in-out infinite' }}>
                <div className="w-52 h-52 rounded-full border border-indigo-400/20" />
            </div>
            <div className="absolute" style={{ animation: 'splashPulseRing 2.5s ease-in-out infinite 0.8s' }}>
                <div className="w-64 h-64 rounded-full border border-purple-400/10" />
            </div>

            {/* Content */}
            <div className="flex flex-col items-center text-center relative z-10">
                {/* Logo */}
                <div className="splash-logo mb-8">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/10 p-4 shadow-[0_0_80px_rgba(99,102,241,0.2)] flex items-center justify-center">
                        <img src={LOGO_URL} alt="Mahaveer Logo" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]" />
                    </div>
                </div>

                {/* Version info - appears after logo */}
                {(phase === 'version' || phase === 'exit') && (
                    <div className="flex flex-col items-center">
                        {/* Line divider */}
                        <div className="splash-line h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent mb-6" />

                        {/* Version badge */}
                        <div className="splash-version mb-4" style={{ animationDelay: '0.15s' }}>
                            <div className="px-6 py-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 backdrop-blur-md">
                                <span className="text-sm md:text-base font-black tracking-[0.3em] uppercase"
                                    style={{
                                        background: 'linear-gradient(90deg, #818cf8, #a78bfa, #c084fc, #a78bfa, #818cf8)',
                                        backgroundSize: '200% auto',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        animation: 'splashShine 3s linear infinite'
                                    }}>
                                    Version 2.2
                                </span>
                            </div>
                        </div>

                        {/* What's new label */}
                        <p className="splash-version text-white/30 text-[11px] font-bold tracking-[0.25em] uppercase" style={{ animationDelay: '0.35s' }}>
                            System Updated Successfully
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom branding */}
            <div className="absolute bottom-8 left-0 right-0 text-center">
                <p className="text-white/20 text-[10px] font-bold tracking-[0.3em] uppercase">
                    Mahaveer Hair Management
                </p>
            </div>
        </div>
    );
};

export default SplashScreen;
