
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
  XMarkIcon,
  StarIcon
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

  const colors = ["#1e3a8a", "#0f766e", "#0369a1", "#4338ca", "#1d4ed8", "#042f2e"];

  const initParticles = (width: number, height: number) => {
    particlesRef.current = [];
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: 250 + Math.random() * 200,
        minR: 200,
        maxR: 500,
        color: colors[i % colors.length],
        dr: (Math.random() - 0.5) * 0.4
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
      ctx.fillStyle = "#020617"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.r += p.dr;
        if (p.x < -100 || p.x > canvas.width + 100) p.vx *= -1;
        if (p.y < -100 || p.y > canvas.height + 100) p.vy *= -1;
        if (p.r < p.minR || p.r > p.maxR) p.dr *= -1;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, p.color + "cc");
        g.addColorStop(1, "transparent");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over"; 
      ripplesRef.current.forEach((ripple, i) => {
        ripple.r += ripple.speed; ripple.alpha -= 0.015;
        if (ripple.alpha <= 0) { ripplesRef.current.splice(i, 1); } else {
           ctx.beginPath();
           ctx.arc(ripple.x, ripple.y, ripple.r, 0, Math.PI * 2);
           ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.alpha})`;
           ctx.lineWidth = 2;
           ctx.stroke();
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
    ripplesRef.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, r: 10, alpha: 0.8, speed: 4 });
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden cursor-pointer" onClick={handleClick}>
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR ANIMATIONS ---
const ScannerVisual = () => {
  return (
    <div className="relative w-full h-full bg-blue-50/30 flex items-center justify-center overflow-hidden rounded-t-[2.5rem]">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <motion.div 
        initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}
        className="relative w-48 bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col p-5 pb-8 z-10"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 95% 98%, 90% 100%, 85% 98%, 80% 100%, 75% 98%, 70% 100%, 65% 98%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 98%, 30% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0 100%)" }}
      >
        <div className="flex flex-col items-center mb-4 border-b border-dashed border-gray-200 pb-3">
           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-2 aspect-square"><span className="font-bold text-gray-400 text-[10px]">LOGO</span></div>
           <div className="h-2 w-20 bg-gray-100 rounded mb-1"></div><div className="h-2 w-12 bg-gray-50 rounded"></div>
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
            <div className="h-12 w-0.5 bg-gradient-to-b from-purple-200 to-purple-400 relative overflow-hidden rounded-full"><motion.div className="absolute top-0 left-0 w-full h-1/2 bg-white/90" animate={{ top: ["-50%", "150%"] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1.3 }} /></div>
            <div className="flex gap-2 w-full justify-center">
                {categories.map((cat) => {
                    const isActive = currentTx.categoryId === cat.id;
                    let borderColor = 'border-purple-50'; let iconColor = 'text-gray-400';
                    if (isActive) {
                        if (cat.color === 'blue') { borderColor = 'border-blue-400'; iconColor = 'text-blue-600'; }
                        else if (cat.color === 'orange') { borderColor = 'border-orange-400'; iconColor = 'text-orange-600'; }
                        else if (cat.color === 'pink') { borderColor = 'border-pink-400'; iconColor = 'text-pink-600'; }
                    }
                    return (
                        <motion.div key={cat.id} className={`flex-1 p-2.5 rounded-2xl border-2 shadow-sm flex flex-col items-center gap-1.5 transition-colors duration-300 relative bg-white ${borderColor} ${isActive ? 'shadow-md' : 'opacity-60'}`} animate={isActive ? { scale: 1.05 } : { scale: 1 }}>
                            <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${iconColor}`}>{cat.icon}</span>
                            <span className={`text-[9px] font-bold transition-colors duration-300 ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{cat.label}</span>
                            <AnimatePresence>{isActive && (<motion.div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center border-2 border-white shadow-sm shrink-0 aspect-square" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><CheckIcon className="text-[8px] text-white" /></motion.div>)}</AnimatePresence>
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
            <div className="flex justify-between items-center mb-5"><h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">Orçamento Mensal</h3><span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Ativo</span></div>
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center aspect-square"><span className="material-symbols-outlined text-[10px]">restaurant</span></span><span className="font-medium text-gray-700">Alimentação</span></div>
                    <span className="text-gray-500 font-medium">R$ 850 / 1k</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative"><motion.div className="h-full bg-orange-400 rounded-full" initial={{ width: "0%" }} animate={{ width: "85%" }} transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity, repeatDelay: 3 }} /></div>
                <motion.div className="absolute right-0 top-[3.5rem] bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1" initial={{ opacity: 0, y: 5, scale: 0.8 }} animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -5], scale: [0.8, 1, 1, 0.9] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5, delay: 1 }}><span className="material-symbols-outlined text-[10px]">warning</span>85% do limite!</motion.div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center aspect-square"><span className="material-symbols-outlined text-[10px]">directions_car</span></span><span className="font-medium text-gray-700">Transporte</span></div>
                    <span className="text-gray-500 font-medium">R$ 200 / 500</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden"><motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: "0%" }} animate={{ width: "40%" }} transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity, repeatDelay: 3.3 }} /></div>
            </div>
        </div>
    </div>
  );
};

// --- MAIN COMPONENTS ---
const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full py-4 flex justify-between items-center text-left focus:outline-none group">
                <span className={`font-semibold text-gray-800 transition-colors ${isOpen ? 'text-blue-600' : 'group-hover:text-blue-600'}`}>{question}</span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} text-gray-400 group-hover:text-blue-500`}><ChevronRightIcon className="text-xl" /></span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <p className="text-gray-600 leading-relaxed pb-4 text-sm">{answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, scrollTarget, clearScrollTarget, onOpenSupport }) => {
  const { pricing } = useSystemSettings();
  useEffect(() => {
    if (scrollTarget && clearScrollTarget) {
        const element = document.getElementById(scrollTarget);
        if (element) { element.scrollIntoView({ behavior: 'smooth' }); clearScrollTarget(); }
    }
  }, [scrollTarget, clearScrollTarget]);

  const faqData = [
    { question: "Como funciona a leitura automática de notas?", answer: "Utilizamos inteligência artificial de última geração para analisar a imagem da sua nota fiscal. O sistema identifica a data, o estabelecimento, os itens comprados e os valores, categorizando tudo automaticamente em segundos." },
    { question: "O aplicativo é seguro?", answer: "Absolutamente. Utilizamos criptografia de ponta a ponta e infraestrutura de segurança de nível bancário para proteger seus dados. Suas informações são confidenciais e não são vendidas para terceiros." },
    { question: "Consigo exportar meus dados para o Excel?", answer: "Com certeza. No painel de Relatórios, você encontra uma opção para 'Baixar CSV Completo'. Esse arquivo pode ser aberto no Excel, Google Sheets ou qualquer planilha." },
    { question: "Posso cancelar minha assinatura quando quiser?", answer: "Sim, sem burocracia. Se você assinar o plano mensal, pode cancelar a qualquer momento e continuará com acesso até o fim do ciclo vigente." }
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
              <button onClick={() => onStart('login')} className="text-gray-600 font-medium hover:text-blue-600 transition-colors text-sm hidden sm:block">Entrar</button>
              <button onClick={() => onStart('register')} className="bg-gray-900 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95">Começar Agora</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-1/2 text-center lg:text-left z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6"><span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span><span className="text-sm font-semibold text-blue-700 tracking-wide uppercase text-[10px] sm:text-xs">O Fim da Digitação Manual</span></div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-6 tracking-tight">Onde foi parar seu dinheiro? <br className="hidden lg:block"/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Descubra em 3&nbsp;segundos</span></h1>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0">Esqueça planilhas. Tire uma foto e nossa IA categoriza tudo. Encontre os "gastos invisíveis" e comece a sobrar dinheiro hoje.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <motion.button onClick={() => onStart('register')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative w-full sm:w-auto inline-flex overflow-hidden rounded-full p-[2px] focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-xl shadow-blue-500/40">
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#bae6fd_0%,#2563eb_50%,#bae6fd_100%)]" />
                    <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-lg font-bold text-white backdrop-blur-3xl transition-all hover:bg-blue-700 gap-2">Começar Agora <ChevronRightIcon className="text-xl" /></span>
                  </motion.button>
                  <button onClick={() => {const el=document.getElementById('how-it-works'); if(el) el.scrollIntoView({behavior:'smooth'});}} className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center active:scale-95">Ver Como Funciona</button>
                </div>
              </motion.div>
            </div>
            <div className="w-full lg:w-1/2 relative flex justify-center lg:justify-end"><div className="relative w-full max-w-sm mx-auto lg:max-w-md h-[550px] sm:h-[600px] flex items-center justify-center"><div className="absolute w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div><div className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 top-0 right-0"></div><motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="relative w-[260px] h-[530px] sm:w-[300px] sm:h-[600px] rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl z-20 p-[4px] ring-1 ring-black/40" style={{ background: 'linear-gradient(180deg, #344966 0%, #1B263B 40%, #0f1623 100%)' }}><div className="relative w-full h-full bg-black rounded-[2.25rem] sm:rounded-[3.25rem] overflow-hidden"><div className="relative w-full h-full bg-gray-900 flex flex-col overflow-hidden"><div className="flex-1 flex items-center justify-center bg-gray-800 relative"><div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-400"></div><motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ repeat: Infinity, duration: 4 }} className="relative w-48 bg-white shadow-2xl p-4 pb-12 rotate-[-2deg]"><div className="h-2 w-20 bg-gray-200 rounded mb-2 mx-auto"></div><div className="space-y-2 mt-4">{[1,2,3].map(i=>(<div key={i} className="flex justify-between"><div className="h-1.5 w-24 bg-gray-100 rounded"></div><div className="h-1.5 w-8 bg-blue-100 rounded"></div></div>))}<div className="h-px bg-gray-200 my-2"></div><div className="flex justify-between items-center"><div className="h-2 w-12 bg-gray-300 rounded"></div><div className="h-3 w-16 bg-blue-600 rounded"></div></div></div></motion.div></div><div className="h-24 bg-black/40 backdrop-blur-xl flex items-center justify-center gap-8"><div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10"></div><div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center"><div className="w-10 h-10 bg-white rounded-full"></div></div><div className="w-10 h-10 rounded-full bg-white/10 border border-white/10"></div></div></div></div></motion.div></div></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">Tudo o que você precisa para economizar</h2>
                <p className="text-lg text-gray-600">Ferramentas poderosas para você assumir o controle do seu dinheiro sem esforço.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div whileHover={{ y: -8 }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full"><div className="h-64"><ScannerVisual /></div><div className="p-8 flex-1 flex flex-col"><div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 aspect-square"><CameraIcon className="text-2xl" /></div><h3 className="text-2xl font-bold text-gray-900 mb-3">Leitura Inteligente</h3><p className="text-gray-600 leading-relaxed">Nossa IA escaneia recibos físicos e extrai data, local e valores instantaneamente. Adeus digitação manual.</p></div></motion.div>
                <motion.div whileHover={{ y: -8 }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full"><div className="h-64"><CategoriesVisual /></div><div className="p-8 flex-1 flex flex-col"><div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 aspect-square"><ListIcon className="text-2xl" /></div><h3 className="text-2xl font-bold text-gray-900 mb-3">Categorização Automática</h3><p className="text-gray-600 leading-relaxed">O sistema aprende seus hábitos e organiza seus gastos em categorias como Alimentação, Transporte e Lazer.</p></div></motion.div>
                <motion.div whileHover={{ y: -8 }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full"><div className="h-64"><GoalsVisual /></div><div className="p-8 flex-1 flex flex-col"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 aspect-square"><TargetIcon className="text-2xl" /></div><h3 className="text-2xl font-bold text-gray-900 mb-3">Metas e Limites</h3><p className="text-gray-600 leading-relaxed">Defina tetos de gastos para cada categoria e receba alertas se estiver gastando rápido demais.</p></div></motion.div>
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16"><h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">Investimento Inteligente</h2><p className="text-lg text-gray-600">Planos flexíveis para você organizar suas finanças. Cancele quando quiser.</p></div>
          <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex-1 max-w-md w-full bg-white p-8 rounded-3xl border border-gray-200 shadow-lg flex flex-col"><h3 className="text-xl font-bold text-gray-900 mb-6">Mensal</h3><div className="mb-8 flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-900">R$ {pricing.monthlyPrice.toFixed(2).replace('.', ',')}</span><span className="text-gray-500 font-medium">/mês</span></div><ul className="space-y-4 mb-8 flex-1">{["Leitura ilimitada de recibos", "Acesso a todos os relatórios", "Suporte prioritário"].map((f, i) => (<li key={i} className="flex items-center gap-3 text-sm text-gray-600"><CheckIcon className="text-blue-600" />{f}</li>))}</ul><button onClick={() => onStart('register')} className="w-full py-4 rounded-xl font-bold text-blue-600 border-2 border-blue-100 hover:bg-blue-50 transition-all">Assinar Mensal</button></motion.div>
            <div className="relative flex-1 max-w-md w-full z-10"><div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"><span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md uppercase tracking-wider">Melhor Escolha</span></div><div className="relative w-full h-full rounded-[24px] overflow-hidden shadow-2xl border-2 border-blue-500/10"><div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700"></div><div className="relative z-10 bg-white m-[2px] rounded-[22px] p-8 h-[calc(100%-4px)] flex flex-col"><h3 className="text-2xl font-bold text-gray-900 mt-2">Anual</h3><p className="text-blue-600 text-sm font-medium">Economia de 30%</p><div className="my-8"><div className="flex items-baseline gap-1"><span className="text-5xl font-extrabold text-gray-900 tracking-tight">R$ {(pricing.annualPrice / 12).toFixed(2).replace('.', ',')}</span><span className="text-gray-500 font-medium">/mês</span></div><p className="text-xs text-gray-400 mt-1">Cobrado anualmente: R$ {pricing.annualPrice.toFixed(2).replace('.', ',')}</p></div><ul className="space-y-4 mb-8 flex-1">{["Tudo do plano mensal", "2 meses grátis", "Acesso antecipado"].map((f, i) => (<li key={i} className="flex items-center gap-3 text-sm text-gray-700 font-medium"><CheckIcon className="text-blue-600" />{f}</li>))}</ul><button onClick={() => onStart('register')} className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg active:scale-95 transition-transform">Assinar Anual</button></div></div></div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-gray-50 border-t border-gray-100"><div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-16"><h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas Frequentes</h2></div><div className="space-y-2">{faqData.map((item, index) => (<FAQItem key={index} question={item.question} answer={item.answer} />))}</div></div></section>

      {/* FINAL CTA SECTION - REFINED MOBILE UI */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-900/20 border border-white/10"
          >
            <AnimatedGradientBackground />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-blue-950/60 z-10 pointer-events-none"></div>

            <div className="relative z-20 flex flex-col items-center text-center p-8 sm:p-16 lg:p-20">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-1.5 mb-6 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10"
              >
                <div className="flex gap-0.5 text-yellow-400">
                  {[1,2,3,4,5].map(i => <StarIcon key={i} className="text-xs fill-current" />)}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest">Aprovado por 5.000+</span>
              </motion.div>

              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-[1.2] tracking-tight max-w-2xl"
              >
                Assuma o controle total <br className="hidden sm:block"/>
                do seu dinheiro <span className="text-blue-300">hoje</span>
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-blue-100/90 text-sm sm:text-lg mb-10 max-w-xl leading-relaxed"
              >
                Junte-se a milhares de pessoas que já transformaram sua vida financeira. Seu futuro começa agora.
              </motion.p>

              <div className="w-full sm:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStart('register')}
                  className="group relative w-full sm:w-auto bg-white text-blue-900 font-extrabold py-5 px-10 rounded-2xl text-lg shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-3 overflow-hidden"
                >
                  <span className="relative z-10">Garantir Meu Acesso</span>
                  <ChevronRightIcon className="text-xl relative z-10 transition-transform group-hover:translate-x-1" />
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent skew-x-12 z-0"
                  />
                </motion.button>
                <p className="mt-4 text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Sem taxas escondidas. Cancele quando quiser.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-200 w-8 h-8 rounded-lg text-gray-500 shrink-0 flex items-center justify-center aspect-square"><WalletIcon className="text-lg" /></div>
                    <span className="font-bold text-gray-700">MeuGasto</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
                      <button onClick={() => onStart('terms')} className="hover:text-blue-600 transition-colors">Termos de Uso</button>
                      <button onClick={() => onStart('privacy')} className="hover:text-blue-600 transition-colors">Política de Privacidade</button>
                      <button onClick={onOpenSupport} className="hover:text-blue-600 transition-colors">Suporte</button>
                  </div>
                  <p className="text-xs text-gray-400">© {new Date().getFullYear()} MeuGasto. Todos os direitos reservados.</p>
              </div>
          </div>
      </footer>
    </div>
  );
};
