
import React, { useState } from 'react';
import { getLevelInfo, User, Expense, Goal } from '../types';
import { TrophyIcon } from './Icons';
import { GamificationModal } from './GamificationModal';

interface GamificationWidgetProps {
  user: User;
  expenses?: Expense[];
  goals?: Goal[];
}

export const GamificationWidget: React.FC<GamificationWidgetProps> = ({ user, expenses = [], goals = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentXp = user.xp || 0;
  const streak = user.currentStreak || 0;
  const levelInfo = getLevelInfo(currentXp);
  
  // Calcula progresso para o próximo nível
  const nextLevelXp = levelInfo.maxXp === Infinity ? currentXp : levelInfo.maxXp;
  const prevLevelMaxXp = levelInfo.minXp;
  
  const progressPercent = levelInfo.maxXp === Infinity 
    ? 100 
    : Math.min(100, Math.max(0, ((currentXp - prevLevelMaxXp) / (nextLevelXp - prevLevelMaxXp)) * 100));

  return (
    <>
        <div 
            onClick={() => setIsModalOpen(true)}
            className="group w-full cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md border border-blue-100"
        >
           <div className="flex items-center justify-between">
                {/* Left: Icon & Title */}
                <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-blue-100 shadow-sm text-blue-600 shrink-0 aspect-square">
                        <TrophyIcon className="text-xl drop-shadow-sm" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 leading-tight">
                            {levelInfo.title}
                        </h3>
                        <div className="text-[10px] font-bold text-blue-600/80 mt-0.5 uppercase tracking-wide">
                            Nível {levelInfo.level}
                        </div>
                    </div>
                </div>

                {/* Right: Streak (Mantém laranja pois representa Fogo/Streak, mas o container se adapta ao tema azul) */}
                {streak > 0 && (
                    <div className="flex items-center gap-1.5 bg-white border border-blue-100 px-3 py-1.5 rounded-lg shadow-sm">
                        <span className="material-symbols-outlined text-base text-orange-500 animate-pulse">local_fire_department</span>
                        <span className="text-xs font-bold text-blue-900">{streak}</span>
                    </div>
                )}
           </div>

           {/* Bottom: Progress Bar */}
           <div className="mt-4">
               <div className="flex justify-between items-end mb-1.5">
                   <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">XP</span>
                   <span className="text-[10px] font-bold text-blue-700">{Math.round(progressPercent)}%</span>
               </div>
               <div className="relative h-2 w-full overflow-hidden rounded-full bg-blue-100/60 border border-blue-100">
                    <div 
                       className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.4)] transition-all duration-1000 ease-out"
                       style={{ width: `${progressPercent}%` }}
                    ></div>
               </div>
           </div>
        </div>

        <GamificationModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            user={user}
            expenses={expenses}
            goals={goals} 
        />
    </>
  );
};