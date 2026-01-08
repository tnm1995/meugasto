
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon, 
  CameraIcon, 
  ChevronRightIcon, 
  WalletIcon, 
  CheckIcon,
  ListIcon,
  ShowChartIcon,
  CategoryIcon,
  TargetIcon,
  InstallMobileIcon,
  PlusIcon,
  MoreVertIcon,
  IosShareIcon,
  ShieldCheckIcon, 
  LockIcon, 
  VisibilityOffIcon,
  XMarkIcon
} from './Icons';
import { useSystemSettings } from '../hooks/useSystemSettings';

interface LandingPageProps {
  onStart: (view: 'login' | 'register' | 'privacy' | 'terms') => void;
  scrollTarget?: string | null;
  clearScrollTarget?: () => void;
  onOpenSupport: () => void;
}

// --- ANIMATED GRADIENT BACKGROUND COMPONENT ---
const AnimatedGradientBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>(0);
  const ripplesRef = useRef<{ x: number; y: number; r: number; alpha: number; speed: number }[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; color: string; dr: number; maxR: number; minR: number }[]>([]);

  // Paleta Navy/Teal/Blue moderna e vibrante
  const colors = [
    "#1e3a8a", // Blue 900
    "#0f766e", // Teal 700
    "#0369a1", // Sky 700
    "#4338ca", // Indigo 700
    "#1d4ed8", // Blue 700
    "#042f2e"  // Teal 900 (Deep)
  ];

  const initParticles = (width: number, height: number) => {
    particlesRef.current = [];
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8, // Velocidade suave
        vy: (Math.random() - 0.5) * 0.8,
        r: 250 + Math.random() * 200, // Raio base grande
        minR: 200,
        maxR: 500,
        color: colors[i % colors.length],
        dr: (Math.random() - 0.5) * 0.4 // Velocidade de pulsação
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      if (particlesRef.current.length === 0) {
        initParticles(canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      // Background base escuro (Navy Profundo)
      ctx.fillStyle = "#020617"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- 1. Particles (Breathing Gradients) ---
      particlesRef.current.forEach(p => {
        // Movimento
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.dr;

        // Bater nas bordas (Bounce suave)
        if (p.x < -100 || p.x > canvas.width + 100) p.vx *= -1;
        if (p.y < -100 || p.y > canvas.height + 100) p.vy *= -1;

        // Pulsação (Breathing)
        if (p.r < p.minR || p.r > p.maxR) p.dr *= -1;

        // Desenhar Gradiente Radial
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, p.color + "cc"); // Cor central com transparência
        g.addColorStop(1, "transparent"); // Fade out

        // Blend mode para efeito de luz
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- 2. Ripples (Interação) ---
      ctx.globalCompositeOperation = "source-over"; // Reset blend mode para ondulações claras
      
      ripplesRef.current.forEach((ripple, i) => {
        ripple.r += ripple.speed; // Expandir
        ripple.alpha -= 0.015; // Desaparecer

        if (ripple.alpha <= 0) {
           ripplesRef.current.splice(i, 1); // Remover se invisível
        } else {
           ctx.beginPath();
           ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
           ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.alpha})`;
           ctx.lineWidth = 2;
           ctx.stroke();
           
           // Segundo anel mais fraco (eco)
           if (ripple.r > 20) {
               ctx.beginPath();
               ctx.arc(ripple.x, ripple.y, ripple.r - 20, 0, Math.PI * 2);
               ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.alpha * 0.5})`;
               ctx.lineWidth = 1;
               ctx.stroke();
           }
        }
      });

      animationFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Adiciona nova ondulação
    ripplesRef.current.push({ 
        x, 
        y, 
        r: 10, 
        alpha: 0.8, 
        speed: 4 
    });
  };

  return (
    <div 
        ref={containerRef} 
        className="absolute inset-0 z-0 overflow-hidden cursor-pointer" 
        onClick={handleClick}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Overlay sutil de ruído para textura (opcional) */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
    </div>
  );
};

const ScannerVisual = () => {
  return (
    <div className="relative w-full h-full bg-blue-50/30 flex items-center justify-center overflow-hidden rounded-t-[2.5rem]">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="relative w-48 bg-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col p-5 pb-8 z-10" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 95% 98%, 90% 100%, 85% 98%, 80% 100%, 75% 98%, 70% 100%, 65% 98%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 98%, 30% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0 100%)" }}>
        <div className="flex flex-col items-center mb-4 border-b border-dashed border-gray-200 pb-3">
           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2 shrink-0 aspect-square"><span className="font-bold text-gray-400 text-[10px]">LOGO</span></div>
           <div className="h-2 w-20 bg-gray-100 rounded mb-1"></div>
           <div className="h-2 w-12 bg-gray-50 rounded"></div>
        </div>
        <div className="space-y-3 flex-1">
           {[1, 2, 3].map((i) => (
             <div key={i} className="flex justify-between items-center">
                <motion.div className="h-2.5 rounded-sm" initial={{ backgroundColor: "#f3f4f6", width: "60%" }} animate={{ backgroundColor: ["#f3f4f6", "#1e293b", "#1e293b"], width: ["60%", "60%", "65%"] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, repeatDelay: 1 }} />
                <motion.div className="h-2.5 rounded-sm" initial={{ backgroundColor: "#f3f4f6", width: "20%" }} animate={{ backgroundColor: ["#f3f4f6", "#2563eb", "#2563eb"], width: ["20%", "20%", "25%"] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, repeatDelay: 1 }} />
             </div>
           ))}
           <div className="border-t border-dashed border-gray-200 my-3"></div>
           <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400">TOTAL</span>
                <motion.div className="h-4 w-16 rounded bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center" animate={{ scale: [1, 1.1, 1], backgroundColor: ["#eff6ff", "#dbeafe", "#eff6ff"] }} transition={{ duration: 2.5, repeat: Infinity, delay: 2, repeatDelay: 1 }}>R$ 128,90</motion.div>
           </div>
        </div>
      </motion.div>
      <motion.div className="absolute w-64 h-12 bg-gradient-to-b from-blue-400/0 via-blue-400/10 to-blue-400/0 z-20 pointer-events-none" style={{ borderTop: "1px solid rgba(59, 130, 246, 0.3)", borderBottom: "1px solid rgba(59, 130, 246, 0.3)" }} animate={{ top: ["-10%", "110%"] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }} />
      <motion.div className="absolute bottom-6 right-6 bg-white pl-2 pr-4 py-2 rounded-xl shadow-lg border border-blue-100 flex items-center gap-3 z-30" initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -10], scale: [0.9, 1, 1, 0.95] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1.8, repeatDelay: 1, times: [0, 0.2, 0.8, 1] }}>
        <div className="bg-green-100 p-1 rounded-full text-green-600 shrink-0 aspect-square flex items-center justify-center"><CheckIcon className="text-xs" /></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold text-gray-800">Processado</span><span className="text-[9px] text-gray-500">Dados extraídos</span></div>
      </motion.div>
    </div>
  );
};

const CategoriesVisual = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const transactions = [
    { id: 1, name: 'Burger King', amount: 'R$ 32,90', icon: 'lunch_dining', colorBg: 'bg-orange-100', colorText: 'text-orange-600', categoryId: 'food' },
    { id: 2, name: 'Uber Trip', amount: 'R$ 19,90', icon: 'local_taxi', colorBg: 'bg-blue-100', colorText: 'text-blue-600', categoryId: 'transport' },
    { id: 3, name: 'Riachuelo', amount: 'R$ 120,00', icon: 'checkroom', colorBg: 'bg-pink-100', colorText: 'text-pink-600', categoryId: 'clothes' }
  ];
  const categories = [
      { id: 'transport', label: 'Transp.', icon: 'directions_car', color: 'blue' },
      { id: 'food', label: 'Aliment.', icon: 'restaurant', color: 'orange' },
      { id: 'clothes', label: 'Roupas', icon: 'checkroom', color: 'pink' }
  ];
  useEffect(() => {
    const interval = setInterval(() => { setActiveIndex((prev) => (prev + 1) % transactions.length); }, 2800);
    return () => clearInterval(interval);
  }, []);
  const currentTx = transactions[activeIndex];
  return (
    <div className="relative w-full h-full bg-purple-50/40 flex items-center justify-center overflow-hidden rounded-t-[2.5rem]">
        <div className="absolute inset-0 overflow-hidden">
            <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-8 left-8 text-purple-200/50"><span className="material-symbols-outlined text-4xl">sell</span></motion.div>
            <motion.div animate={{ y: [10, -10, 10] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-10 right-10 text-purple-200/50"><span className="material-symbols-outlined text-4xl">receipt</span></motion.div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-6 w-full px-6">
            <div className="h-16 w-full flex justify-center items-end relative">
                <AnimatePresence mode='wait'>
                    <motion.div key={currentTx.id} className="bg-white px-4 py-3 rounded-2xl shadow-lg border border-purple-100 flex items-center gap-3 w-48 absolute" initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.8 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                        <div className={`w-8 h-8 rounded-full ${currentTx.colorBg} flex items-center justify-center ${currentTx.colorText} shrink-0 aspect-square`}><span className="material-symbols-outlined text-sm">{currentTx.icon}</span></div>
                        <div className="flex flex-col"><span className="text-xs font-bold text-gray-700">{currentTx.name}</span><span className="text-[10px] text-gray-400">{currentTx.amount}</span></div>
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="h-12 w-0.5 bg-gradient-to-b from-purple-200 to-purple-400 relative overflow-hidden rounded-full">
                <motion.div className="absolute top-0 left-0 w-full h-1/2 bg-white/90" animate={{ top: ["-50%", "150%"] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.3 }} />
            </div>
            <div className="flex gap-2 w-full justify-center">
                {categories.map((cat) => {
                    const isActive = currentTx.categoryId === cat.id;
                    let borderColor = 'border-purple-50'; let iconColor = 'text-gray-400'; let bgColor = 'bg-white';
                    if (isActive) {
                        if (cat.color === 'blue') { borderColor = 'border-blue-400'; iconColor = 'text-blue-600'; }
                        else if (cat.color === 'orange') { borderColor = 'border-orange-400'; iconColor = 'text-orange-600'; }
                        else if (cat.color === 'pink') { borderColor = 'border-pink-400'; iconColor = 'text-pink-600'; }
                    }
                    return (
                        <motion.div key={cat.id} className={`flex-1 p-2.5 rounded-2xl border-2 shadow-sm flex flex-col items-center gap-1.5 transition-colors duration-300 relative ${bgColor} ${borderColor} ${isActive ? 'shadow-md' : 'opacity-60'}`} animate={isActive ? { scale: 1.05 } : { scale: 1 }}>
                            <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${iconColor}`}>{cat.icon}</span>
                            <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{cat.label}</span>
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white shadow-sm shrink-0 aspect-square" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                                        <CheckIcon className="text-[8px] text-white" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

const GoalsVisual = () => {
  return (
    <div className="relative w-full h-full bg-emerald-50/40 flex items-center justify-center overflow-hidden rounded-t-[2.5rem]">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-100 w-64 relative z-10">
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">Orçamento Mensal</h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Ativo</span>
            </div>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0 aspect-square"><span className="material-symbols-outlined text-[10px]">restaurant</span></span>
                        <span className="font-medium text-gray-700">Alimentação</span>
                    </div>
                    <span className="text-gray-500 font-medium">R$ 850 / 1k</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                    <motion.div className="h-full bg-orange-400 rounded-full" initial={{ width: "0%" }} animate={{ width: "85%" }} transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity, repeatDelay: 3 }} />
                </div>
                <motion.div className="absolute right-0 top-[3.5rem] bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1" initial={{ opacity: 0, y: 5, scale: 0.8 }} animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -5], scale: [0.8, 1, 1, 0.9] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5, delay: 1 }}>
                    <span className="material-symbols-outlined text-[10px]">warning</span>85% do limite!
                </motion.div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 aspect-square"><span className="material-symbols-outlined text-[10px]">directions_car</span></span>
                        <span className="font-medium text-gray-700">Transporte</span>
                    </div>
                    <span className="text-gray-500 font-medium">R$ 200 / 500</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: "0%" }} animate={{ width: "40%" }} transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 3.3 }} />
                </div>
            </div>
        </div>
    </div>
  );
};

const FloatingBadge: React.FC<{ icon: React.ReactNode; text: string; subtext: string; color: string; delay: number; x: number; y: number }> = ({ icon, text, subtext, color, delay, x, y }) => (
  <motion.div initial={{ opacity: 0, x: x + 20, y: y + 20 }} animate={{ opacity: 1, x, y }} transition={{ delay, duration: 0.8, type: "spring" }} className="absolute bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 z-30 scale-[0.85] sm:scale-100 origin-center" style={{ maxWidth: '200px' }}>
    <div className={`w-10 h-10 flex items-center justify-center rounded-full text-white shadow-sm flex-shrink-0 aspect-square ${color}`}>{icon}</div>
    <div><p className="text-xs text-gray-500 font-semibold uppercase">{text}</p><p className="text-sm font-bold text-gray-800">{subtext}</p></div>
  </motion.div>
);

const SecurityStrip = () => (
    <div className="w-full bg-white border-y border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-80">
                <div className="flex items-center gap-2 text-gray-500 font-medium"><ShieldCheckIcon className="text-green-600 text-xl" /><span>Criptografia Bancária</span></div>
                <div className="flex items-center gap-2 text-gray-500 font-medium"><LockIcon className="text-blue-600 text-xl" /><span>Dados 100% Privados</span></div>
                <div className="flex items-center gap-2 text-gray-500 font-medium"><VisibilityOffIcon className="text-gray-400 text-xl" /><span>Seus dados não são vendidos</span></div>
            </div>
        </div>
    </div>
);

const ComparisonSection = () => {
  const gridVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.3 } } };
  const oldCardVariants = { hidden: { opacity: 0, x: -30, rotate: -1 }, visible: { opacity: 1, x: 0, rotate: -1, transition: { type: "spring" as const, stiffness: 50, damping: 20 } } };
  const newCardVariants = { hidden: { opacity: 0, x: 30, scale: 0.95 }, visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, stiffness: 70, damping: 15 } } };
  const itemVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } };

  return (
    <section className="py-24 bg-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
      <div className="absolute -left-20 top-40 w-96 h-96 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute -right-20 bottom-40 w-96 h-96 bg-cyan-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">Pare de jogar dinheiro fora</motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-lg text-gray-600">A maioria das pessoas perde o controle por usar métodos falhos. Veja a diferença.</motion.p>
        </div>
        <motion.div variants={gridVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div variants={oldCardVariants} className="relative group perspective-1000">
            <div className="absolute inset-0 bg-gray-100 transform rotate-2 rounded-[2rem] -z-10 transition-transform duration-500 group-hover:rotate-6"></div>
            <div className="relative bg-white p-8 sm:p-10 rounded-[2rem] border border-gray-200 shadow-xl h-full flex flex-col grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-gray-100 shrink-0 aspect-square"><span className="material-symbols-outlined">sentiment_dissatisfied</span></div>
                <div><h3 className="text-xl font-bold text-gray-700">O Jeito Antigo</h3><p className="text-sm text-gray-400 font-medium">Manual e cansativo</p></div>
              </div>
              <ul className="space-y-5 flex-1">
                {["Juntar papéis até perder a tinta", "Esquecer onde gastou o dinheiro", "Horas digitando em planilhas", "Sem noção de quanto sobra no mês"].map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-3" variants={itemVariants}><div className="mt-2.5 mr-1 flex-shrink-0"><div className="w-2 h-2 rounded-full bg-gray-300 aspect-square group-hover:bg-red-400 transition-colors"></div></div><span className="leading-relaxed text-gray-500 group-hover:text-gray-600 transition-colors">{item}</span></motion.li>
                ))}
              </ul>
              <div className="absolute bottom-[-20px] right-[-20px] opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><XMarkIcon className="text-9xl text-gray-900" /></div>
            </div>
          </motion.div>
          <motion.div variants={newCardVariants} className="relative z-10 h-full">
            <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl">
                <style>{`@keyframes rotacaodegrade { to { transform: translate(-50%, -50%) rotate(1turn); } }`}</style>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] z-0" style={{ background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, #2563eb 60deg, transparent 60.1deg), conic-gradient(from 0deg at 50% 50%, transparent 180deg, #2563eb 240deg, transparent 240.1deg)', filter: 'blur(20px)', animation: 'rotacaodegrade 4s linear infinite' }} />
                <div className="relative z-10 bg-white rounded-[calc(2rem-2px)] m-[2px] p-8 sm:p-10 h-[calc(100%-4px)] flex flex-col overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                    <motion.div initial={{ left: "-100%" }} whileInView={{ left: "200%" }} transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }} className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] pointer-events-none z-20" />
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                        <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.6 }} className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-blue-500/30 shrink-0 aspect-square"><SparklesIcon className="text-2xl" /></motion.div>
                        <div><h3 className="text-xl font-bold text-gray-900">O Jeito MeuGasto</h3><motion.p initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="text-sm text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-0.5">Automático & Inteligente</motion.p></div>
                    </div>
                    <ul className="space-y-5 relative z-10 flex-1">
                        {["Foto > Dados prontos em 3s", "IA Categoriza tudo sozinha", "Alertas antes de estourar a meta", "Controle total na palma da mão"].map((item, i) => (
                        <motion.li key={i} className="flex items-start gap-4" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + (i * 0.15), type: "spring" }}><motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 0.4 + (i * 0.15), type: "spring" }} className="mt-1 min-w-[20px] bg-green-100 rounded-full p-0.5 flex items-center justify-center shrink-0 aspect-square"><CheckIcon className="text-green-600 text-xs" /></motion.div><span className="font-semibold text-gray-800 leading-relaxed">{item}</span></motion.li>
                        ))}
                    </ul>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 1.2 }} className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex -space-x-2">{[1, 2, 3].map(i => (<motion.div key={i} whileHover={{ y: -5, scale: 1.1, zIndex: 10 }} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 shrink-0 aspect-square overflow-hidden shadow-sm"><img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="" className="w-full h-full object-cover" /></motion.div>))}</div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">5.000+ economizando</p>
                    </motion.div>
                    <div className="absolute top-1/2 right-[-50px] w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none -z-0"></div>
                </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.5, delayChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 30, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15, mass: 1 } } };
  const lineVariants = { hidden: { scaleX: 0 }, visible: { scaleX: [0, 0.5, 0.5, 1], transition: { duration: 2, times: [0, 0.35, 0.65, 1], ease: "easeInOut" as const } } };
  const lightVariants = { hidden: { left: "16.66%", opacity: 0 }, visible: { left: ["16.66%", "50%", "50%", "83.33%"], opacity: [0, 1, 1, 0], transition: { duration: 2, times: [0, 0.35, 0.65, 1], ease: "easeInOut" as const } } };

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Do papel para o gráfico em segundos</h2>
            <p className="text-lg text-gray-600">Veja como é fácil transformar aquele monte de notinhas amassadas em controle financeiro real.</p>
          </motion.div>
        </div>
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
          <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-1 bg-gray-100 rounded-full z-0 transform -translate-y-1/2"></div>
          <motion.div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 z-0 origin-left rounded-full transform -translate-y-1/2" variants={lineVariants}></motion.div>
          <motion.div className="hidden md:block absolute top-12 w-4 h-4 bg-white border-[3px] border-blue-600 rounded-full z-10 shrink-0 aspect-square transform -translate-y-1/2" style={{ boxShadow: "0 0 15px 2px rgba(37, 99, 235, 0.6)" }} variants={lightVariants} />
          <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative shrink-0 aspect-square">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 aspect-square"><CameraIcon className="text-3xl" /></div>
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md border-4 border-white shrink-0 aspect-square">1</div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tire uma foto</h3>
            <p className="text-gray-600 px-4">Abra o app e aponte a câmera para qualquer recibo, nota fiscal ou faça upload de um PDF bancário.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative shrink-0 aspect-square">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shrink-0 aspect-square"><SparklesIcon className="text-3xl animate-pulse" /></div>
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md border-4 border-white shrink-0 aspect-square">2</div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">A IA Processa</h3>
            <p className="text-gray-600 px-4">Nossa inteligência artificial lê os itens, identifica o estabelecimento, a data e categoriza tudo automaticamente.</p>
          </motion.div>
          <motion.div variants={itemVariants} className="relative z-10 flex flex-col items-center text-center group">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-lg border border-green-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative shrink-0 aspect-square">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shrink-0 aspect-square"><ShowChartIcon className="text-3xl" /></div>
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md border-4 border-white shrink-0 aspect-square">3</div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Você no Controle</h3>
            <p className="text-gray-600 px-4">Pronto! Seu gasto está registrado e seus gráficos atualizados. Acompanhe suas metas em tempo real.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const HeroVisual = () => {
  const [isSelfieMode, setIsSelfieMode] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleShutter = () => { setFlashTrigger(true); setTimeout(() => setFlashTrigger(false), 150); };
  const toggleCamera = () => { setIsSelfieMode(prev => !prev); if (!isSelfieMode) { setIsVideoLoaded(false); } };
  useEffect(() => { if (isSelfieMode && videoRef.current) { videoRef.current.play().catch(e => console.log("Autoplay preventido pelo navegador:", e)); } }, [isSelfieMode]);

  return (
    <div className="relative w-full max-w-sm mx-auto lg:max-w-md h-[550px] sm:h-[600px] flex items-center justify-center">
      <div className="absolute w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 top-0 right-0"></div>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative w-[260px] h-[530px] sm:w-[300px] sm:h-[600px] rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl z-20 p-[4px] ring-1 ring-black/40" style={{ background: 'linear-gradient(180deg, #344966 0%, #1B263B 40%, #0f1623 100%)', boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255,255,255,0.15)' }}>
        <motion.div whileTap={{ x: 1 }} className="absolute top-24 left-[-2px] w-[3px] h-8 bg-[#2A3C55] rounded-l-sm shadow-sm opacity-90 cursor-pointer"></motion.div>
        <motion.div whileTap={{ x: 1 }} className="absolute top-36 left-[-2px] w-[3px] h-12 bg-[#2A3C55] rounded-l-sm shadow-sm opacity-90 cursor-pointer"></motion.div>
        <motion.div whileTap={{ x: 1 }} className="absolute top-52 left-[-2px] w-[3px] h-12 bg-[#2A3C55] rounded-l-sm shadow-sm opacity-90 cursor-pointer"></motion.div>
        <motion.div whileTap={{ x: -1 }} className="absolute top-40 right-[-2px] w-[3px] h-20 bg-[#2A3C55] rounded-r-sm shadow-sm opacity-90 cursor-pointer"></motion.div>
        <div className="relative w-full h-full bg-black rounded-[2.25rem] sm:rounded-[3.25rem] overflow-hidden shadow-inner">
            <div className="relative w-full h-full bg-gray-900 flex flex-col overflow-hidden">
                <div className={`absolute inset-0 bg-white z-[60] pointer-events-none transition-opacity duration-100 ease-out ${flashTrigger ? 'opacity-90' : 'opacity-0'}`}></div>
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full flex items-center justify-between px-4 z-50 shadow-md ring-1 ring-white/5 pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-[#1a1a1a]/80 shadow-inner shrink-0 aspect-square"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-50 animate-pulse shrink-0 aspect-square"></div>
                </div>
                <div className="absolute top-14 w-full px-6 flex justify-between text-white font-medium text-sm z-40">
                    <span className="drop-shadow-md material-symbols-outlined text-[18px]">flash_off</span>
                    <span className="bg-black/20 px-2 rounded-full text-xs flex items-center backdrop-blur-sm">RAW</span>
                    <span className="drop-shadow-md material-symbols-outlined text-[18px]">motion_photos_on</span>
                </div>
                <div className="flex-1 relative flex items-center justify-center perspective-1000 z-10 overflow-hidden bg-black">
                    <AnimatePresence mode="wait">
                        {!isSelfieMode ? (
                            <motion.div key="rear" initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.4 }} className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-800">
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-400 z-0"><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-10"></div></div>
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none z-10">
                                    <div className="border-r border-white/50"></div><div className="border-r border-white/50"></div><div></div>
                                    <div className="border-t border-white/50 col-span-3"></div><div className="border-t border-white/50 col-span-3"></div>
                                </div>
                                <motion.div initial={{ scale: 0.9, rotateX: 10 }} animate={{ scale: 1, rotateX: 0 }} transition={{ repeat: Infinity, duration: 4, repeatType: "reverse", ease: "easeInOut" }} className="relative w-56 bg-white shadow-2xl rotate-[-2deg] p-5 pb-8 text-gray-800 z-20" style={{ transformStyle: 'preserve-3d', filter: 'drop-shadow(0px 15px 15px rgba(0,0,0,0.3))', maskImage: 'radial-gradient(circle at 10px bottom, transparent 8px, black 8.5px)', maskSize: '20px 100%', maskPosition: 'bottom', maskRepeat: 'repeat-x', WebkitMaskImage: 'radial-gradient(circle at 10px bottom, transparent 8px, black 8.5px)', WebkitMaskSize: '20px 100%', WebkitMaskPosition: 'bottom', WebkitMaskRepeat: 'repeat-x', paddingBottom: '20px' }}>
                                    <div className="flex flex-col items-center mb-4 border-b-2 border-dashed border-gray-300 pb-3"><div className="w-8 h-8 rounded-full border-2 border-gray-800 flex items-center justify-center mb-1 shrink-0 aspect-square"><span className="font-bold text-[8px]">C</span></div><h3 className="font-bold text-sm tracking-wider text-center">Hipermercado Carrefour</h3><p className="text-[9px] text-gray-500 font-mono">Av. das Nações, 1500 - SP</p><p className="text-[9px] text-gray-500 font-mono mt-1">12/10/2024 14:35:22</p></div>
                                    <div className="space-y-1.5 font-mono text-[10px] text-gray-700"><div className="flex justify-between"><span>001 LEITE INTEGRAL 1L</span><span>4,90</span></div><div className="flex justify-between"><span>002 CAFÉ TORRADO 500G</span><span>18,50</span></div><div className="flex justify-between"><span>003 AZEITE EXTRA VIRGEM</span><span>32,90</span></div><div className="flex justify-between"><span>004 ARROZ BRANCO 5KG</span><span>28,90</span></div></div>
                                    <div className="border-t-2 border-gray-800 my-3 border-dashed"></div><div className="flex justify-between items-center font-mono"><span className="font-bold text-sm">TOTAL R$</span><span className="font-bold text-lg">85,20</span></div>
                                    <motion.div className="absolute left-[-10px] w-[120%] h-1 bg-blue-500 shadow-[0_0_15px_3px_rgba(59,130,246,0.8)] z-20" animate={{ top: ['10%', '90%', '10%'] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} />
                                </motion.div>
                                <div className="absolute w-64 h-80 border border-yellow-400/30 rounded-lg pointer-events-none z-10"><div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div><div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div><div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div><div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]"></div></div>
                            </motion.div>
                        ) : (
                            <motion.div key="front" initial={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }} animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }} exit={{ opacity: 0, filter: 'blur(10px)' }} transition={{ duration: 0.5 }} className="absolute inset-0 w-full h-full bg-black flex items-center justify-center">
                                <video ref={videoRef} autoPlay loop muted playsInline onLoadedData={() => setIsVideoLoaded(true)} className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}><source src="https://i.imgur.com/FDElXuE.mp4" type="video/mp4" /></video>
                                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none"></div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="h-32 bg-black/40 backdrop-blur-xl flex flex-col justify-end pb-6 relative z-20">
                    <div className="flex justify-center items-center gap-6 text-[11px] font-medium text-white/50 mb-4 overflow-hidden"><span>CINEMATIC</span><span>VÍDEO</span><span className="text-yellow-400 font-bold bg-black/20 px-2 py-0.5 rounded-full shadow-sm">FOTO</span><span>RETRATO</span><span>PANO</span></div>
                    <div className="flex items-center justify-between px-10">
                        <motion.div whileTap={{ scale: 0.9 }} className="w-12 h-12 rounded-lg bg-black overflow-hidden border border-white/20 relative shadow-lg cursor-pointer shrink-0 aspect-square"><img src="https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=150&q=80" alt="Galeria" className="w-full h-full object-cover opacity-90" /></motion.div>
                        <motion.button onClick={handleShutter} whileTap={{ scale: 0.9 }} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-lg bg-white/10 backdrop-blur-sm cursor-pointer shrink-0 aspect-square"><motion.div animate={flashTrigger ? { scale: 0.85 } : { scale: 1 }} className="w-14 h-14 bg-white rounded-full shrink-0 aspect-square"></motion.div></motion.button>
                        <motion.button onClick={toggleCamera} whileTap={{ rotate: 180, scale: 0.9 }} transition={{ duration: 0.4 }} className="w-12 h-12 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white backdrop-blur-md cursor-pointer hover:bg-black/60 shrink-0 aspect-square"><span className="material-symbols-outlined text-2xl">cached</span></motion.button>
                    </div>
                </div>
                <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white/80 rounded-full z-40"></div>
            </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {!isSelfieMode && (
            <>
              <FloatingBadge key="badge1" icon={<CheckIcon />} text="Status" subtext="Leitura Concluída" color="bg-green-500" delay={0.5} x={-90} y={-160} />
              <FloatingBadge key="badge2" icon={<SparklesIcon />} text="Total" subtext="R$ 85,20" color="bg-blue-600" delay={0.7} x={100} y={120} />
              <FloatingBadge key="badge3" icon={<ListIcon />} text="Carteira" subtext="4 Itens Adicionados" color="bg-purple-600" delay={1.5} x={-80} y={80} />
            </>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex justify-between items-center text-left focus:outline-none group">
                <span className={`font-semibold text-gray-800 transition-colors ${isOpen ? 'text-blue-600' : 'group-hover:text-blue-600'}`}>{question}</span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} text-gray-400 group-hover:text-blue-500`}><ChevronRightIcon className="text-xl" /></span>
            </button>
            <AnimatePresence>
                {isOpen && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden"><p className="text-gray-600 leading-relaxed pb-4 text-sm">{answer}</p></motion.div>)}
            </AnimatePresence>
        </div>
    );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, scrollTarget, clearScrollTarget, onOpenSupport }) => {
  const { pricing } = useSystemSettings();

  useEffect(() => {
    if (scrollTarget && clearScrollTarget) {
        const element = document.getElementById(scrollTarget);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            clearScrollTarget();
        }
    }
  }, [scrollTarget, clearScrollTarget]);

  const handleSubscribe = (plan: 'monthly' | 'annual') => {
      // FORCE TEST LINK FOR MONTHLY PLAN
      const link = plan === 'annual'
          ? (pricing.annualLink || 'https://pay.kirvano.com/88970249-3079-45df-8083-26c9fe4c704c')
          : 'https://pay.kirvano.com/3340149e-e444-4f3e-9db0-6058e4cbc3c8';
      
      window.open(link, '_blank');
  };

  const openThankYouPage = () => {
      // Simula o redirecionamento para a página de obrigado
      window.location.href = '/obrigado';
  };

  const faqData = [
    { question: "Como funciona a leitura automática de notas?", answer: "Utilizamos inteligência artificial de última geração para analisar a imagem da sua nota fiscal. O sistema identifica a data, o estabelecimento, os itens comprados e os valores, categorizando tudo automaticamente em segundos." },
    { question: "O aplicativo é seguro?", answer: "Absolutamente. Utilizamos criptografia de ponta a ponta e infraestrutura de segurança de nível bancário para proteger seus dados. Suas informações são confidenciais e não são vendidas para terceiros." },
    { question: "Meus dados estão protegidos?", answer: "Sim. Apenas você tem acesso aos seus dados financeiros. Utilizamos os mais altos padrões de segurança do mercado." },
    { question: "Posso cancelar minha assinatura quando quiser?", answer: "Sim, sem burocracia. Se você assinar o plano mensal, pode cancelar a qualquer momento e continuará com acesso até el fim do ciclo vigente." },
    { question: "Consigo exportar meus dados para o Excel?", answer: "Com certeza. No painel de Relatórios, você encontra uma opção para 'Baixar CSV Completo'. Esse arquivo pode ser aberto no Excel, Google Sheets ou qualquer planilha." },
    { question: "O aplicativo funciona offline?", answer: "O app precisa de internet para processar as imagens com Inteligência Artificial e sincronizar os dados na nuvem. Isso garante que suas informações estejam sempre salvas e acessíveis em qualquer dispositivo." },
    { question: "Existe versão para empresas?", answer: "Atualmente, o foco é em finanças pessoais. No entanto, muitos microempreendedores usam o MeuGasto para separar suas despesas, criando uma conta específica para o negócio." },
    { question: "Posso compartilhar a conta com minha família?", answer: "Sim! Você pode compartilhar o acesso (login e senha) com membros da sua família para que todos contribuam com o controle financeiro da casa." },
    { question: "Esqueci minha senha, como recupero?", answer: "Na tela de login, clique em 'Esqueceu a senha?'. Enviaremos um link seguro para o seu e-mail cadastrado para você criar uma nova senha." }
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100">
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-10 h-10 rounded-lg shadow-md shadow-blue-600/20 shrink-0 flex items-center justify-center"><WalletIcon className="text-xl" /></div>
              <span className="font-bold text-xl text-gray-900 tracking-tight">MeuGasto</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => onStart('login')} className="text-gray-700 font-bold hover:text-blue-600 transition-all text-sm px-5 py-2 rounded-full border-2 border-transparent hover:border-blue-50">Entrar</button>
              <button onClick={() => onStart('register')} className="bg-gray-900 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95">Começar Agora</button>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-50 rounded-full blur-3xl opacity-50"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-1/2 text-center lg:text-left z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6 hover:bg-blue-100 transition-colors cursor-default">
                  <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse shrink-0 aspect-square"></span>
                  <span className="text-sm font-semibold text-blue-700 tracking-wide uppercase text-[10px] sm:text-xs">O Fim da Digitação Manual</span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-6 tracking-tight">Onde foi parar seu dinheiro? <br className="hidden lg:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Descubra em 3&nbsp;segundos</span></h1>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">Esqueça planilhas. Tire uma foto e nossa IA categoriza tudo. Encontre os "gastos invisíveis" e comece a sobrar dinheiro hoje.</p>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                        <motion.button onClick={() => onStart('register')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative w-full sm:w-auto inline-flex overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white shadow-xl shadow-blue-500/40">
                            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#bae6fd_0%,#2563eb_50%,#bae6fd_100%)]" />
                            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-lg font-bold text-white backdrop-blur-3xl transition-all hover:bg-blue-700 gap-2">Começar Agora <ChevronRightIcon className="text-xl" /></span>
                        </motion.button>
                        <button onClick={() => { const el = document.getElementById('how-it-works'); if(el) el.scrollIntoView({behavior: 'smooth'}); }} className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center hover:border-gray-300 active:scale-95">Ver Como Funciona</button>
                    </div>
                    <p className="text-sm font-semibold text-blue-600 bg-blue-50/80 backdrop-blur-sm py-2 px-4 rounded-xl w-fit mx-auto lg:mx-0 border border-blue-100 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">calendar_month</span>
                        7 dias grátis para testar. Sem compromisso.
                    </p>
                </div>
                <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-gray-500">
                  <div className="flex -space-x-2">{[1,2,3,4].map(i => (<div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white overflow-hidden shrink-0 aspect-square"><img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-full h-full object-cover" /></div>))}</div>
                  <p>Mais de <span className="font-bold text-gray-700">5.000 usuários</span> economizando.</p>
                </div>
              </motion.div>
            </div>
            <div className="w-full lg:w-1/2 relative flex justify-center lg:justify-end"><HeroVisual /></div>
          </div>
        </div>
      </section>

      <SecurityStrip />
      <section id="how-it-works"><HowItWorks /></section>

      <section id="features" className="py-24 bg-gray-50 border-t border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20"><h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">Tudo o que você precisa para economizar</h2><p className="text-lg text-gray-600 leading-relaxed">Ferramentas poderosas para você assumir o controle do seu dinheiro sem esforço, com uma interface que você vai amar usar.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col relative group transition-all duration-300 h-full">
                    <div className="h-64 relative"><ScannerVisual /></div>
                    <div className="p-8 flex-1 flex flex-col"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm shrink-0 aspect-square"><CameraIcon className="text-2xl" /></div><h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">Leitura Inteligente</h3><p className="text-gray-600 leading-relaxed">Nossa IA escaneia recibos físicos e extrai data, local e valores instantaneamente. Adeus digitação manual.</p></div>
                </motion.div>
                <motion.div whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col relative group transition-all duration-300 h-full">
                    <div className="h-64 relative"><CategoriesVisual /></div>
                    <div className="p-8 flex-1 flex flex-col"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm shrink-0 aspect-square"><ListIcon className="text-2xl" /></div><h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">Categorização Automática</h3><p className="text-gray-600 leading-relaxed">O sistema aprende seus hábitos e organiza seus gastos em categorias como Alimentação, Transporte e Lazer.</p></div>
                </motion.div>
                <motion.div whileHover={{ y: -8, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col relative group transition-all duration-300 h-full">
                    <div className="h-64 relative"><GoalsVisual /></div>
                    <div className="p-8 flex-1 flex flex-col"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm shrink-0 aspect-square"><TargetIcon className="text-2xl" /></div><h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">Metas e Limites</h3><p className="text-gray-600 leading-relaxed">Defina tetos de gastos para cada categoria e receba alertas se estiver gastando rápido demais.</p></div>
                </motion.div>
            </div>
        </div>
      </section>

      <ComparisonSection />

      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16"><h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Quem usa, recomenda</h2><p className="text-lg text-gray-600">Junte-se a milhares de brasileiros que transformaram sua relação com o dinheiro.</p></div>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-lg transition-shadow">
                    <div className="flex gap-1 text-yellow-400 mb-4">{[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-lg fill-current">star</span>)}</div>
                    <p className="text-gray-700 mb-6 leading-relaxed">"A função de ler notinhas pela câmera é mágica! Eu perdia horas digitando gastos no Excel. Agora, em segundos, tudo está organizado. Mudou minha vida financeira."</p>
                    <div className="flex items-center gap-3"><img src="https://i.pravatar.cc/100?img=5" alt="Mariana Costa" className="w-10 h-10 rounded-full object-cover shrink-0 aspect-square" /><div><p className="font-bold text-gray-900 text-sm">Mariana Costa</p><p className="text-xs text-gray-500">Designer Gráfica</p></div></div>
                </div>
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-lg transition-shadow">
                    <div className="flex gap-1 text-yellow-400 mb-4">{[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-lg fill-current">star</span>)}</div>
                    <p className="text-gray-700 mb-6 leading-relaxed">"Simples, direto e funcional. O que eu mais gosto é poder separar meus gastos pessoais dos gastos da minha microempresa. Os gráficos são muito claros."</p>
                    <div className="flex items-center gap-3"><img src="https://i.pravatar.cc/100?img=12" alt="Carlos Eduardo" className="w-10 h-10 rounded-full object-cover shrink-0 aspect-square" /><div><p className="font-bold text-gray-900 text-sm">Carlos Eduardo</p><p className="text-xs text-gray-500">Microempresário</p></div></div>
                </div>
                <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:shadow-lg transition-shadow">
                    <div className="flex gap-1 text-yellow-400 mb-4">{[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-lg fill-current">star</span>)}</div>
                    <p className="text-gray-700 mb-6 leading-relaxed">"Finalmente consegui juntar dinheiro para minha viagem! A ferramenta de Metas me avisa quando estou gastando demais com delivery. Recomendo muito!"</p>
                    <div className="flex items-center gap-3"><img src="https://i.pravatar.cc/100?img=9" alt="Fernanda Lima" className="w-10 h-10 rounded-full object-cover shrink-0 aspect-square" /><div><p className="font-bold text-gray-900 text-sm">Fernanda Lima</p><p className="text-xs text-gray-500">Estudante de Direito</p></div></div>
                </div>
            </div>
        </div>
      </section>
      
      <section id="pricing" className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16"><h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Investimento Inteligente</h2><p className="text-lg text-gray-600">Planos flexíveis para você organizar suas finanças. Cancele quando quiser.</p></div>
          <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="flex-1 max-w-md w-full bg-white p-8 rounded-3xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col relative group">
              <div className="mb-6"><h3 className="text-xl font-bold text-gray-900">Mensal</h3><p className="text-gray-500 text-sm mt-1">Flexibilidade total.</p></div>
              <div className="mb-8"><div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-900">R$ {pricing.monthlyPrice.toFixed(2).replace('.', ',')}</span><span className="text-gray-500 font-medium">/mês</span></div></div>
              <ul className="space-y-4 mb-8 flex-1">{["Leitura ilimitada de recibos", "Acesso a todos os relatórios", "Suporte prioritário"].map((feature, i) => (<li key={i} className="flex items-start gap-3 text-gray-600"><div className="bg-gray-100 w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"><CheckIcon className="text-gray-500 text-xs" /></div><span className="text-sm font-medium">{feature}</span></li>))}</ul>
              <button onClick={() => handleSubscribe('monthly')} className="w-full py-4 rounded-xl font-bold text-blue-600 border-2 border-blue-100 hover:border-blue-200 hover:bg-blue-50 transition-all">Assinar Mensal</button>
            </motion.div>
            <div className="relative flex-1 max-w-md w-full z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"><motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }} className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md tracking-wide uppercase whitespace-nowrap">Melhor Escolha</motion.span></div>
                <div className="relative w-full h-full rounded-[22px] overflow-hidden shadow-2xl">
                    <style>{`@keyframes rotacaodegrade { to { transform: translate(-50%, -50%) rotate(1turn); } }`}</style>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0" style={{ background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, #2563eb 60deg, transparent 60.1deg), conic-gradient(from 0deg at 50% 50%, transparent 180deg, #2563eb 240deg, transparent 240.1deg)', filter: 'blur(15px)', animation: 'rotacaodegrade 4s linear infinite' }} />
                    <div className="relative z-10 bg-white rounded-[20px] m-[2px] p-8 h-[calc(100%-4px)] w-[calc(100%-4px)] flex flex-col">
                        <div className="mb-6 mt-2"><h3 className="text-2xl font-bold text-gray-900">Anual</h3><p className="text-blue-600 text-sm mt-1 font-medium">Economia de 30%</p></div>
                        <div className="mb-8"><div className="flex items-baseline gap-1"><span className="text-5xl font-extrabold text-gray-900 tracking-tight">R$ {(pricing.annualPrice / 12).toFixed(2).replace('.', ',')}</span><span className="text-gray-500 font-medium">/mês</span></div><p className="text-xs text-gray-400 mt-2">Cobrado anualmente: R$ {pricing.annualPrice.toFixed(2).replace('.', ',')}</p></div>
                        <ul className="space-y-4 mb-8 flex-1">{["Tudo do plano mensal", <span key="promo">Ganhe <span className="text-blue-600 font-bold">2 meses grátis</span></span>, "Acesso antecipado a novas features"].map((feature, i) => (<li key={i} className="flex items-start gap-3 text-gray-700"><div className="bg-blue-100 w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"><CheckIcon className="text-blue-600 text-xs" /></div><span className="text-sm font-medium">{feature}</span></li>))}</ul>
                        <div className="relative overflow-hidden rounded-xl">
                            <button onClick={() => handleSubscribe('annual')} className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md transform active:scale-95 relative z-10">Assinar Anual</button>
                            <motion.div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" initial={{ left: '-150%' }} animate={{ left: '150%' }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 3 }} />
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16"><h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2><p className="text-gray-600">Tire suas dúvidas e veja como o MeuGasto pode te ajudar.</p></div>
            <div className="space-y-2">{faqData.map((item, index) => (<FAQItem key={index} question={item.question} answer={item.answer} />))}</div>
        </div>
      </section>

      <section className="py-24 bg-white px-4 sm:px-6">
         <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(37, 99, 235, 0.25)" }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl px-6 py-16 md:p-20 text-center group border border-blue-100">
                <AnimatedGradientBackground />
                <div className="relative z-20">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight drop-shadow-md">Assuma o controle total<br className="hidden sm:block"/> do seu dinheiro hoje</h2>
                    <p className="text-blue-100 text-base sm:text-lg md:text-xl mb-10 max-w-2xl mx-auto drop-shadow-sm font-medium px-4">Junte-se a milhares de pessoas que já transformaram sua vida financeira. Seu futuro começa agora.</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onStart('register')} className="relative w-full max-w-[300px] sm:w-auto bg-white text-blue-900 font-extrabold py-4 px-10 rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all overflow-hidden">
                        <span className="relative z-10 flex items-center justify-center gap-2">Garantir Meu Acesso<span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span></span></span>
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-blue-100/50 to-transparent z-0"></div>
                    </motion.button>
                </div>
            </motion.div>
         </div>
      </section>

      <footer className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-2"><div className="bg-gray-200 w-8 h-8 rounded-lg text-gray-500 shrink-0 flex items-center justify-center"><WalletIcon className="text-lg" /></div><span className="font-bold text-gray-700">MeuGasto</span></div>
                  <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
                      <button onClick={() => onStart('login')} className="hover:text-blue-600 transition-colors font-bold">Entrar</button>
                      <button onClick={() => onStart('terms')} className="hover:text-blue-600 transition-colors">Termos de Uso</button>
                      <button onClick={() => onStart('privacy')} className="hover:text-blue-600 transition-colors">Política de Privacidade</button>
                      <button onClick={onOpenSupport} className="hover:text-blue-600 transition-colors">Suporte</button>
                      <button onClick={openThankYouPage} className="hover:text-blue-600 transition-colors text-xs opacity-50">Obrigado (Teste)</button>
                  </div>
                  <p className="text-xs text-gray-400">© {new Date().getFullYear()} MeuGasto. Todos os direitos reservados.</p>
              </div>
          </div>
      </footer>
    </div>
  );
};
