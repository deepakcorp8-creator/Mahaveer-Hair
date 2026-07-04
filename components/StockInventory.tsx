import React, { useState, useEffect, useRef } from 'react';
import { Package, Boxes } from 'lucide-react';

const StockInventory: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const [animKey, setAnimKey] = useState(0);

    // Loop the Coming Soon text animation every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setAnimKey(k => k + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setMousePos({ x, y });
        const rotateX = (y - 0.5) * -12;
        const rotateY = (x - 0.5) * 12;
        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
            transition: 'transform 0.1s ease-out'
        });
    };

    const handleMouseLeave = () => {
        setTiltStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
            transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)'
        });
        setMousePos({ x: 0.5, y: 0.5 });
    };

    // Particle canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        const particles: Array<{
            x: number; y: number; vx: number; vy: number;
            size: number; opacity: number; hue: number; life: number; maxLife: number;
        }> = [];

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2.5 + 0.5,
                opacity: Math.random() * 0.5 + 0.1,
                hue: Math.random() > 0.5 ? 240 : 270,
                life: Math.random() * 200,
                maxLife: 200 + Math.random() * 200
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life++;

                if (p.life > p.maxLife) {
                    p.life = 0;
                    p.x = Math.random() * canvas.width;
                    p.y = Math.random() * canvas.height;
                }

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                const lifeFrac = p.life / p.maxLife;
                const alpha = p.opacity * (lifeFrac < 0.1 ? lifeFrac * 10 : lifeFrac > 0.9 ? (1 - lifeFrac) * 10 : 1);

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`;
                ctx.fill();

                // Glow
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha * 0.15})`;
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `hsla(255, 70%, 65%, ${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="w-full h-full">
            {/* Full Page Coming Soon */}
            <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="relative w-full h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0f0e17 0%, #1a1145 40%, #0d1b2a 100%)' }}
            >
                {/* Particle Canvas */}
                <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full pointer-events-none" />

                {/* Animated gradient orbs */}
                <style>{`
                    @keyframes orbFloat1 {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(60px, -40px) scale(1.1); }
                        66% { transform: translate(-30px, 30px) scale(0.95); }
                    }
                    @keyframes orbFloat2 {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        33% { transform: translate(-50px, 50px) scale(1.15); }
                        66% { transform: translate(40px, -20px) scale(0.9); }
                    }
                    @keyframes orbFloat3 {
                        0%, 100% { transform: translate(0, 0) scale(1); }
                        50% { transform: translate(30px, 60px) scale(1.05); }
                    }
                    @keyframes shimmer {
                        0% { background-position: -200% center; }
                        100% { background-position: 200% center; }
                    }
                    @keyframes pulseRing {
                        0% { transform: scale(0.8); opacity: 0.6; }
                        50% { transform: scale(1.2); opacity: 0; }
                        100% { transform: scale(0.8); opacity: 0; }
                    }
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes letterLoop {
                        0% { opacity: 0; transform: translateY(-50px) rotateX(90deg) scale(0.5); filter: blur(8px); }
                        15% { opacity: 1; transform: translateY(5px) rotateX(-5deg) scale(1.05); filter: blur(0); }
                        20% { transform: translateY(0) rotateX(0deg) scale(1); filter: blur(0); }
                        75% { opacity: 1; transform: translateY(0) rotateX(0deg) scale(1); filter: blur(0); }
                        90% { opacity: 0; transform: translateY(30px) rotateX(-40deg) scale(0.8); filter: blur(6px); }
                        100% { opacity: 0; transform: translateY(30px) rotateX(-40deg) scale(0.8); filter: blur(6px); }
                    }
                    .letter-animate {
                        display: inline-block;
                        opacity: 0;
                        animation: letterLoop 5s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                    }
                    .animate-fadeInUp { animation: fadeInUp 1s ease-out forwards; }
                    .delay-200 { animation-delay: 0.2s; opacity: 0; }
                    .delay-400 { animation-delay: 0.4s; opacity: 0; }
                    .delay-600 { animation-delay: 0.6s; opacity: 0; }
                    .delay-800 { animation-delay: 0.8s; opacity: 0; }
                `}</style>

                {/* Floating orbs */}
                <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0 opacity-30 blur-[100px]"
                    style={{
                        background: 'radial-gradient(circle, rgba(99,102,241,0.8), transparent 70%)',
                        top: '10%', left: '10%',
                        animation: 'orbFloat1 12s ease-in-out infinite',
                        transform: `translate(${(mousePos.x - 0.5) * 20}px, ${(mousePos.y - 0.5) * 20}px)`
                    }}
                />
                <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none z-0 opacity-25 blur-[80px]"
                    style={{
                        background: 'radial-gradient(circle, rgba(168,85,247,0.8), transparent 70%)',
                        bottom: '10%', right: '10%',
                        animation: 'orbFloat2 15s ease-in-out infinite',
                        transform: `translate(${(mousePos.x - 0.5) * -15}px, ${(mousePos.y - 0.5) * -15}px)`
                    }}
                />
                <div className="absolute w-[300px] h-[300px] rounded-full pointer-events-none z-0 opacity-20 blur-[60px]"
                    style={{
                        background: 'radial-gradient(circle, rgba(59,130,246,0.6), transparent 70%)',
                        top: '50%', right: '30%',
                        animation: 'orbFloat3 10s ease-in-out infinite'
                    }}
                />

                {/* Main Content */}
                <div
                    className="relative z-10 flex flex-col items-center text-center px-6"
                    style={{ ...tiltStyle, transformStyle: 'preserve-3d' }}
                >
                    {/* Pulsing icon ring */}
                    <div className="relative mb-10 animate-fadeInUp" style={{ transform: 'translateZ(30px)' }}>
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30" style={{ animation: 'pulseRing 3s ease-in-out infinite' }} />
                        <div className="absolute -inset-4 rounded-full border border-indigo-400/10" style={{ animation: 'pulseRing 3s ease-in-out infinite 0.5s' }} />
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.3)]">
                            <Boxes className="w-10 h-10 md:w-12 md:h-12 text-indigo-300" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="animate-fadeInUp delay-200" style={{ transform: 'translateZ(50px)' }}>
                        <p className="text-indigo-300/80 text-sm md:text-base font-semibold tracking-[0.4em] uppercase mb-4">Stock Inventory</p>
                    </div>

                    <h1 key={animKey} className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mb-6 leading-[0.9]" style={{ transform: 'translateZ(60px)' }}>
                        <span className="block text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]">
                            {'Coming'.split('').map((char, i) => (
                                <span key={`c-${i}`} className="letter-animate" style={{ animationDelay: `${i * 0.12}s` }}>{char}</span>
                            ))}
                        </span>
                        <span className="block mt-2">
                            {'Soon'.split('').map((char, i) => (
                                <span key={`s-${i}`} className="letter-animate" style={{
                                    animationDelay: `${0.8 + i * 0.14}s`,
                                    background: 'linear-gradient(90deg, #818cf8, #a78bfa, #c084fc, #a78bfa, #818cf8)',
                                    backgroundSize: '200% auto',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>{char}</span>
                            ))}
                        </span>
                    </h1>

                    {/* Divider line */}
                    <div className="animate-fadeInUp delay-600 w-24 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent mb-8" style={{ transform: 'translateZ(40px)' }} />

                    {/* Description */}
                    <p className="animate-fadeInUp delay-600 text-white/40 text-sm md:text-base max-w-md leading-relaxed mb-10 font-medium" style={{ transform: 'translateZ(35px)' }}>
                        We're crafting something extraordinary. This module will transform how you manage your inventory.
                    </p>

                    {/* Designer credit */}
                    <div className="animate-fadeInUp delay-800" style={{ transform: 'translateZ(70px)' }}>
                        <div className="px-8 py-3.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                            <p className="text-white/50 text-[11px] md:text-xs font-bold tracking-[0.35em] uppercase">
                                Designed By <span className="text-indigo-300/90">Deepak Sahu</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom gradient fade */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f0e17] to-transparent pointer-events-none z-10" />
            </div>
        </div>
    );
};

export default StockInventory;
