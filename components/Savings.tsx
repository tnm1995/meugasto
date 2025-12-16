
import React from 'react';
import type { Expense } from '../types';
import { TodayIcon, DateRangeIcon, CalendarTodayIcon } from './Icons';


interface SavingsProps {
  expenses: Expense[];
  isLoading: boolean; // Nova prop para o estado de carregamento
}

const getExpensesForPeriod = (expenses: Expense[], startDate: Date, endDate: Date): number => {
  return expenses
    .filter(expense => {
      const expenseDate = new Date(expense.purchaseDate + 'T00:00:00');
      return expenseDate >= startDate && expenseDate < endDate;
    })
    .reduce((sum, expense) => sum + expense.total, 0);
};

const ComparisonCard: React.FC<{ title: string; currentPeriodAmount: number; previousPeriodAmount: number; icon: React.ReactNode; iconBgColor: string; }> = ({ title, currentPeriodAmount, previousPeriodAmount, icon, iconBgColor }) => {
    const difference = previousPeriodAmount - currentPeriodAmount;
    const percentageChange = previousPeriodAmount > 0 ? (difference / previousPeriodAmount) * 100 : (currentPeriodAmount > 0 ? -100 : 0);
    const isSaving = difference > 0;
    const isNeutral = difference === 0;

    const formattedDifference = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(difference));
    
    let textColor = 'text-gray-800';
    let mainText = 'Sem alteração';
    let subText = 'Seus gastos foram os mesmos.';

    if (!isNeutral) {
        textColor = isSaving ? 'text-green-600' : 'text-red-500';
        mainText = isSaving ? `+${formattedDifference}` : `-${formattedDifference}`;
        subText = isSaving ? `${percentageChange.toFixed(1)}% de economia` : `${Math.abs(percentageChange).toFixed(1)}% de gasto extra`;
    }
    
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4 overflow-hidden">
            {/* Visual Correction: Fixed width/height w-12 h-12 for perfect circle */}
            <div className={`w-12 h-12 flex items-center justify-center rounded-full flex-shrink-0 aspect-square ${iconBgColor}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <p className={`text-xl font-bold ${textColor} truncate`}>
                    {mainText}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    {subText}
                </p>
            </div>
        </div>
    );
}

export const Savings: React.FC<SavingsProps> = ({ expenses, isLoading }) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearEnd = new Date(now.getFullYear() + 1, 0, 1);

    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear(), 0, 1);

    const todayExpenses = getExpensesForPeriod(expenses, todayStart, todayEnd);
    const yesterdayExpenses = getExpensesForPeriod(expenses, yesterdayStart, todayStart);
    
    const thisMonthExpenses = getExpensesForPeriod(expenses, thisMonthStart, thisMonthEnd);
    const lastMonthExpenses = getExpensesForPeriod(expenses, lastMonthStart, lastMonthEnd);
    
    const thisYearExpenses = getExpensesForPeriod(expenses, thisYearStart, thisYearEnd);
    const lastYearExpenses = getExpensesForPeriod(expenses, lastYearStart, lastYearEnd);
    
    if (isLoading && expenses.length === 0) { // Se está carregando E não há dados ainda
      return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] text-center text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg">Calculando suas economias...</p>
        </div>
      );
    }

    return (
        <div className="p-4 space-y-6">
            <section aria-labelledby="comparison-heading">
                <h2 id="comparison-heading" className="text-2xl font-bold text-gray-800">Comparativo de Gastos</h2>
                 {expenses.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8 bg-white p-6 rounded-2xl shadow-sm">
                        <h3 className="text-xl font-semibold text-gray-700">Sem Dados de Comparação</h3>
                        <p className="mt-2">Comece a adicionar despesas para que possamos comparar seus gastos e mostrar o quanto você está economizando.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <ComparisonCard 
                            title="vs Dia Anterior" 
                            currentPeriodAmount={todayExpenses} 
                            previousPeriodAmount={yesterdayExpenses} 
                            icon={<TodayIcon className="text-white text-2xl" aria-hidden="true" />} 
                            iconBgColor="bg-blue-500"
                        />
                        <ComparisonCard 
                            title="vs Mês Anterior" 
                            currentPeriodAmount={thisMonthExpenses} 
                            previousPeriodAmount={lastMonthExpenses} 
                            icon={<DateRangeIcon className="text-white text-2xl" aria-hidden="true" />} 
                            iconBgColor="bg-green-500"
                        />
                        <ComparisonCard 
                            title="vs Ano Anterior" 
                            currentPeriodAmount={thisYearExpenses} 
                            previousPeriodAmount={lastYearExpenses} 
                            icon={<CalendarTodayIcon className="text-white text-2xl" aria-hidden="true" />} 
                            iconBgColor="bg-purple-500"
                        />
                    </div>
                )}
            </section>
        </div>
    );
};
