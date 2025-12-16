
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { User, LEVELS, getLevelInfo, Expense, Goal } from '../types';
import { XMarkIcon, TrophyIcon, StarIcon, BoltIcon, CameraIcon, TargetIcon } from './Icons';
import { getLocalDate } from '../services/utils'; // Import date helper

interface GamificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  expenses?: Expense[];
  goals?: Goal[];
}

export const GamificationModal: React.FC<GamificationModalProps> = ({ isOpen, onClose, user, expenses = [], goals = [] }) => {
  // Bloqueia o scroll do corpo da página quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentXp = user.xp || 0;
  const currentLevelInfo = getLevelInfo(currentXp);

  // LOGICA REAL DAS MISSÕES
  const today = getLocalDate();
  
  // Missão 1: Registro Rápido (Se adicionou despesa hoje)
  const hasAddedExpenseToday = expenses.some(e => e.purchaseDate === today);
  
  // Missão 2: Foco na Meta (Se tem pelo menos 1 meta cadastrada - Simplificação)
  const hasActiveGoal = goals.length > 0;

  // Missão 3: Streak (Se o lastInteractionDate é hoje ou ontem + 1)
  const streakCount = user.currentStreak || 0;

  const dailyMissions = [
    { 
        id: 1, 
        title: "Registro Rápido", 
        desc: "Adicione uma despesa hoje.", 
        xp: 20, 
        icon: <CameraIcon className="text-white text-xl" />,
        color: "bg-blue-500",
        progress: hasAddedExpenseToday ? 1 : 0, 
        total: 1,
        isCompleted: hasAddedExpenseToday 
    },
    { 
        id: 2, 
        title: "Foco na Meta", 
        desc: "Tenha pelo menos uma meta ativa.", 
        xp: 50, 
        icon: <TargetIcon className="text-white text-xl" />, 
        color: "bg-purple-500",
        progress: hasActiveGoal ? 1 : 0, 
        total: 1,
        isCompleted: hasActiveGoal
    },
    { 
        id: 3, 
        title: "Mantenha o Fogo", 
        desc: "Acesse o app por 3 dias seguidos.", 
        xp: 15, 
        icon: <BoltIcon className="text-white text-xl" />, 
        color: "bg-orange-500",
        progress: Math.min(streakCount, 3), 
        total: 3,
        isCompleted: streakCount >= 3
    },
  ];

  // Usa Portal para renderizar fora da hierarquia DOM atual, garantindo cobertura total da tela (z-index context)
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex justify-center items-center z-[9999] p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Compacto com Gradiente Claro (Blue/Indigo) */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 relative overflow-hidden shrink-0 border-b border-blue-100">
            {/* Elementos Decorativos */}
            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-blue-300 opacity-20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 bg-indigo-300 opacity-10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-blue-200 shadow-sm shrink-0 aspect-square">
                        <TrophyIcon className="text-2xl text-blue-600 drop-shadow-sm" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-blue-900">Central de Conquistas</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-white/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-200 text-blue-800">
                                Nível {currentLevelInfo.level}
                            </span>
                            <span className="text-blue-700 text-sm font-medium">{currentLevelInfo.title}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="w-10 h-10 flex items-center justify-center bg-white/60 hover:bg-white rounded-full transition-colors text-blue-800 border border-blue-100 shadow-sm shrink-0 aspect-square"
                >
                    <XMarkIcon className="text-xl" />
                </button>
            </div>

            {/* Barra de XP Principal */}
            <div className="mt-8 relative">
                <div className="flex justify-between text-xs font-bold text-blue-800 mb-2">
                    <span>{currentXp} XP</span>
                    <span>Próximo: {currentLevelInfo.maxXp === Infinity ? '∞' : currentLevelInfo.maxXp} XP</span>
                </div>
                <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden shadow-inner ring-1 ring-blue-100">
                    <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)] relative transition-all duration-700 ease-out"
                        style={{ width: `${currentLevelInfo.maxXp === Infinity ? 100 : Math.min(100, Math.max(0, ((currentXp - currentLevelInfo.minXp) / (currentLevelInfo.maxXp - currentLevelInfo.minXp)) * 100))}%` }}
                    >
                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] skew-x-[-20deg] w-full"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-8 flex-1 custom-scrollbar bg-gray-50/50">
            
            {/* MISSÕES DIÁRIAS */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-orange-500 text-xl">local_fire_department</span>
                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Missões Diárias</h3>
                </div>
                
                <div className="space-y-3">
                    {dailyMissions.map((mission) => (
                        <div key={mission.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className={`w-12 h-12 ${mission.color} rounded-2xl flex items-center justify-center shadow-lg shadow-gray-200 shrink-0 aspect-square`}>
                                {mission.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-bold text-gray-800 text-sm truncate">{mission.title}</h4>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${mission.isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {mission.isCompleted ? 'Concluído' : `+${mission.xp} XP`}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-3 truncate">{mission.desc}</p>
                                
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${mission.isCompleted ? 'bg-green-500' : mission.color}`} 
                                            style={{ width: `${(mission.progress / mission.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 min-w-[24px] text-right">{mission.progress}/{mission.total}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* JORNADA DE NÍVEIS */}
            <section>
                <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-blue-500 text-xl">map</span>
                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Sua Jornada</h3>
                </div>

                <div className="relative pl-2">
                    <div className="space-y-6">
                        {LEVELS.map((lvl) => {
                            const isUnlocked = currentXp >= lvl.minXp;
                            const isCurrent = currentLevelInfo.level === lvl.level;
                            
                            // Cores e Estilos Dinâmicos
                            let circleBg = "bg-gray-100";
                            let circleBorder = "border-gray-200";
                            let circleText = "text-gray-400";
                            let wrapperClass = "bg-gray-50 border-gray-100 opacity-70 grayscale"; 
                            let statusText = "Bloqueado";

                            if (isUnlocked) {
                                circleBg = "bg-green-100";
                                circleBorder = "border-green-500";
                                circleText = "text-green-600";
                                wrapperClass = "bg-white border-gray-200 shadow-sm";
                                statusText = "Conquistado";
                            }
                            
                            if (isCurrent) {
                                // Estilo atual (Azul com destaque)
                                circleBg = "bg-blue-50";
                                circleBorder = "border-blue-400";
                                circleText = "text-blue-600";
                                wrapperClass = "bg-white border-blue-200 shadow-md ring-2 ring-blue-50 scale-[1.02] z-20";
                                statusText = "Nível Atual";
                            }

                            const rewards = [
                                "Emblema: Iniciante", 
                                "Relatórios Básicos", 
                                "Emblema: Organizado", 
                                "Tema Escuro (Em breve)", 
                                "Suporte VIP", 
                                "Emblema: Magnata"
                            ];

                            return (
                                <div key={lvl.level} className="relative flex gap-4 items-start">
                                    {/* Timeline Circle */}
                                    <div className="relative z-10 flex flex-col items-center shrink-0 pt-1">
                                         <div className={`w-11 h-11 rounded-full border-[3px] flex items-center justify-center font-bold text-sm transition-all duration-300 shrink-0 aspect-square ${circleBg} ${circleBorder} ${circleText} ${isCurrent ? 'shadow-lg shadow-blue-100' : ''}`}>
                                            {isCurrent || isUnlocked ? <TrophyIcon className={isCurrent ? "text-lg" : "text-base"} /> : lvl.level}
                                        </div>
                                    </div>

                                    {/* Content Card */}
                                    <div className={`flex-1 min-w-0 p-4 rounded-2xl border transition-all duration-300 relative ${wrapperClass}`}>
                                         {/* Seta indicativa (apenas atual) */}
                                         {isCurrent && (
                                            <div className="absolute top-5 -left-1.5 w-3 h-3 bg-white border-l border-b border-blue-200 transform rotate-45"></div>
                                         )}
                                         
                                         <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold text-sm truncate ${isCurrent ? 'text-gray-900' : 'text-gray-800'}`}>
                                                {lvl.title}
                                            </h4>
                                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ml-2 ${isCurrent ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {statusText}
                                            </span>
                                        </div>
                                        
                                        <p className="text-xs text-gray-500 font-medium mb-3">
                                            {lvl.minXp} XP Necessários
                                        </p>
                                        
                                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-medium border ${isCurrent ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                                            <StarIcon className={`text-sm ${isUnlocked || isCurrent ? 'text-yellow-500' : 'text-gray-300'}`} />
                                            <span className="truncate">{rewards[lvl.level - 1] || "Recompensa Secreta"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>,
    document.body
  );
};
