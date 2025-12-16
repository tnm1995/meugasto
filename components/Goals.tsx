
import React, { useMemo, useState } from 'react';
import type { Goal, Expense, SavingsGoal } from '../types';
import { TargetIcon, EditIcon, TrashIcon, CalendarClockIcon, WalletIcon, TrophyIcon, PlusIcon } from './Icons';

interface GoalsProps {
  goals: Goal[]; // Agora representam "Orçamentos"
  savingsGoals: SavingsGoal[];
  expenses: Expense[];
  onOpenGoalModal: () => void;
  onOpenSavingsModal: () => void;
  onEditGoal: (goal: Goal) => void;
  onEditSavingsGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (id: string) => void;
  onDeleteSavingsGoal: (id: string) => void;
  isLoading: boolean;
}

const getDaysDifference = (date1: Date, date2: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- CARD DE ORÇAMENTO (LIMITE DE GASTOS) ---
const BudgetCard: React.FC<{ goal: Goal; spent: number; onEdit: () => void; onDelete: () => void; }> = ({ goal, spent, onEdit, onDelete }) => {
  const today = new Date();
  const startDate = new Date(goal.startDate + 'T00:00:00');
  const endDate = new Date(goal.endDate + 'T23:59:59');
  const now = today > endDate ? endDate : (today < startDate ? startDate : today);
  
  const totalDays = Math.max(1, getDaysDifference(endDate, startDate));
  const daysPassed = getDaysDifference(now, startDate);
  const daysRemaining = Math.max(0, getDaysDifference(endDate, now));

  const remainingBudget = goal.targetAmount - spent;
  const safeDailySpend = daysRemaining > 0 ? Math.max(0, remainingBudget / daysRemaining) : 0;
  
  const moneyProgress = Math.min((spent / goal.targetAmount) * 100, 100);
  const timeProgress = Math.min((daysPassed / totalDays) * 100, 100);

  let statusText = 'Dentro do Limite';
  let progressBarColor = 'bg-blue-500';
  let statusBg = 'bg-blue-50 text-blue-700';

  if (spent > goal.targetAmount) {
    statusText = 'Estourado';
    progressBarColor = 'bg-red-600';
    statusBg = 'bg-red-100 text-red-700';
  } else if (moneyProgress > timeProgress + 15) {
    statusText = 'Gastando Rápido';
    progressBarColor = 'bg-yellow-500';
    statusBg = 'bg-yellow-100 text-yellow-800';
  }

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg shrink-0 aspect-square">
                <TargetIcon className="text-lg" />
            </div>
            <div>
                <h3 className="font-bold text-gray-800 leading-tight text-sm">{goal.name}</h3>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{goal.category}</p>
            </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50"><EditIcon className="text-base" /></button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50"><TrashIcon className="text-base" /></button>
        </div>
      </div>

      <div className="mb-4 relative">
        <div className="flex justify-between text-xs mb-1 font-medium">
             <span className="text-gray-600">{moneyProgress.toFixed(0)}% Gasto</span>
             <span className={`${spent > goal.targetAmount ? 'text-red-600' : 'text-gray-500'}`}>
                {formatCurrency(spent)} <span className="text-gray-400">/ {formatCurrency(goal.targetAmount)}</span>
             </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 relative overflow-hidden">
          <div className={`h-full rounded-full ${progressBarColor} transition-all duration-500`} style={{ width: `${moneyProgress}%` }}></div>
          {spent <= goal.targetAmount && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800 opacity-30 z-10" style={{ left: `${timeProgress}%` }} title="Tempo decorrido"></div>
          )}
        </div>
      </div>

      <div className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-between ${statusBg}`}>
        <span>{statusText}</span>
        <span className="text-[10px] opacity-80 font-medium">Diária seg: {formatCurrency(safeDailySpend)}</span>
      </div>
    </div>
  );
};

// --- CARD DE META DE ECONOMIA (POUPANÇA) ---
const SavingsCard: React.FC<{ goal: SavingsGoal; onEdit: () => void; onDelete: () => void; }> = ({ goal, onEdit, onDelete }) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const remaining = goal.targetAmount - goal.currentAmount;
    
    let daysRemaining: number | null = null;
    if (goal.deadline) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const deadlineDate = new Date(goal.deadline + 'T00:00:00');
        daysRemaining = getDaysDifference(deadlineDate, today);
    }

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Background confetti effect if completed */}
            {progress >= 100 && <div className="absolute inset-0 bg-yellow-50/50 z-0 pointer-events-none"></div>}

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 flex items-center justify-center rounded-xl shrink-0 aspect-square ${progress >= 100 ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                            <TrophyIcon className="text-xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-base">{goal.name}</h3>
                            {goal.deadline ? (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px]">event</span>
                                    {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400">Sem data limite</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50"><EditIcon className="text-base" /></button>
                        <button onClick={onDelete} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50"><TrashIcon className="text-base" /></button>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-2 mb-2">
                    <span className="text-3xl font-extrabold text-gray-800 tracking-tight">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md mt-1">
                        Meta: {formatCurrency(goal.targetAmount)}
                    </span>
                </div>

                <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner mb-2">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'}`} 
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] skew-x-[-20deg]"></div>
                    </div>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-600 font-medium">
                    <span>{progress.toFixed(0)}% Concluído</span>
                    {remaining > 0 ? (
                        <span>Faltam {formatCurrency(remaining)}</span>
                    ) : (
                        <span className="text-green-600 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Conquistado!</span>
                    )}
                </div>
                
                {remaining > 0 && (
                    <button 
                        onClick={onEdit} 
                        className="w-full mt-4 py-2 bg-green-50 text-green-700 font-bold rounded-xl text-xs hover:bg-green-100 transition-colors flex items-center justify-center gap-1 border border-green-100"
                    >
                        <PlusIcon className="text-sm"/> Adicionar Valor
                    </button>
                )}
            </div>
        </div>
    );
};

export const Goals: React.FC<GoalsProps> = ({ goals, savingsGoals, expenses, onOpenGoalModal, onOpenSavingsModal, onEditGoal, onEditSavingsGoal, onDeleteGoal, onDeleteSavingsGoal, isLoading }) => {
  const [activeTab, setActiveTab] = useState<'budgets' | 'savings'>('budgets');

  // Process Budgets (Limites)
  const budgetsWithProgress = useMemo(() => {
    return goals.map(goal => {
      const goalStartDate = new Date(goal.startDate + 'T00:00:00');
      const goalEndDate = new Date(goal.endDate + 'T23:59:59');
      const spent = expenses
        .filter(exp => {
          const expDate = new Date(exp.purchaseDate + 'T00:00:00');
          return exp.category === goal.category &&
                 expDate >= goalStartDate &&
                 expDate <= goalEndDate;
        })
        .reduce((sum, exp) => sum + exp.total, 0);
      return { ...goal, spent };
    });
  }, [goals, expenses]);

  // Sort Savings Goals: Incomplete first, then by progress
  const sortedSavings = useMemo(() => {
      return [...savingsGoals].sort((a, b) => {
          const progA = a.currentAmount / a.targetAmount;
          const progB = b.currentAmount / b.targetAmount;
          if (progA >= 1 && progB < 1) return 1;
          if (progA < 1 && progB >= 1) return -1;
          return progB - progA; // Higher progress first
      });
  }, [savingsGoals]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Planejamento</h1>
            <p className="text-gray-500 text-sm">Gerencie limites de gastos e conquiste seus sonhos.</p>
        </div>
        
        {/* Tab Switcher */}
        <div className="bg-gray-200/50 p-1 rounded-xl flex font-bold text-sm shadow-inner self-start md:self-auto">
            <button 
                onClick={() => setActiveTab('budgets')}
                className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'budgets' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <TargetIcon className="text-lg" />
                Orçamentos
            </button>
            <button 
                onClick={() => setActiveTab('savings')}
                className={`px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 ${activeTab === 'savings' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <TrophyIcon className="text-lg" />
                Metas
            </button>
        </div>
      </div>

      {activeTab === 'budgets' && (
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-700">Limites de Categoria</h2>
                  <button onClick={onOpenGoalModal} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <PlusIcon className="text-lg" /> Novo Orçamento
                  </button>
              </div>
              
              {budgetsWithProgress.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-400">
                          <TargetIcon className="text-3xl" />
                      </div>
                      <p className="text-gray-500 text-sm">Nenhum orçamento definido.</p>
                      <button onClick={onOpenGoalModal} className="mt-2 text-blue-600 font-bold text-sm">Criar um agora</button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {budgetsWithProgress.map(goal => (
                          <BudgetCard key={goal.id} goal={goal} spent={goal.spent} onEdit={() => onEditGoal(goal)} onDelete={() => onDeleteGoal(goal.id)} />
                      ))}
                  </div>
              )}
          </div>
      )}

      {activeTab === 'savings' && (
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-700">Meus Sonhos</h2>
                  <button onClick={onOpenSavingsModal} className="text-green-600 text-sm font-bold flex items-center gap-1 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors">
                      <PlusIcon className="text-lg" /> Nova Meta
                  </button>
              </div>

              {savingsGoals.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                      <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 text-green-500">
                          <TrophyIcon className="text-3xl" />
                      </div>
                      <p className="text-gray-500 text-sm">Você ainda não tem metas de economia.</p>
                      <button onClick={onOpenSavingsModal} className="mt-2 text-green-600 font-bold text-sm">Começar a poupar</button>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedSavings.map(goal => (
                          <SavingsCard key={goal.id} goal={goal} onEdit={() => onEditSavingsGoal(goal)} onDelete={() => onDeleteSavingsGoal(goal.id)} />
                      ))}
                  </div>
              )}
          </div>
      )}
    </div>
  );
};