
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Expense, User, Reminder, Goal } from '../types'; // Adicionado Goal
import { 
  NotificationsIcon, 
  MoreVertIcon, 
  WalletIcon, 
  TrendingUpIcon, 
  VisibilityIcon, 
  VisibilityOffIcon,
  ArrowForwardIcon,
  ListIcon
} from './Icons';
import { InstallAppPrompt } from './InstallAppPrompt';
import { GamificationWidget } from './GamificationWidget'; 

interface DashboardProps {
  expenses: Expense[];
  isLoading: boolean;
  userProfile: User;
  onManageReminders: () => void;
  reminders: Reminder[];
  onViewAll: () => void; 
  goals?: Goal[]; // Prop opcional para passar metas
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];

// Helper para formatar moeda com suporte a "Hide Values"
const CurrencyDisplay: React.FC<{ value: number; isHidden: boolean; className?: string }> = ({ value, isHidden, className }) => {
  if (isHidden) {
    return <span className={`tracking-widest ${className}`}>••••••</span>;
  }
  return <span className={className}>{value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
};

const StatCard: React.FC<{ 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    iconBgColor: string; 
    valueColor?: string;
    isHidden: boolean;
}> = ({ title, value, icon, iconBgColor, valueColor = 'text-gray-800', isHidden }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center space-x-4 overflow-hidden border border-gray-100 transition-transform hover:scale-[1.02]">
        <div className={`w-12 h-12 min-w-[3rem] min-h-[3rem] flex items-center justify-center rounded-full flex-shrink-0 aspect-square ${iconBgColor} text-white shadow-sm`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-0.5">{title}</p>
            <CurrencyDisplay value={value} isHidden={isHidden} className={`text-2xl font-bold ${valueColor} truncate block`} />
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ expenses, isLoading, userProfile, onManageReminders, reminders = [], onViewAll, goals = [] }) => {
  const [hideValues, setHideValues] = useState(false);
  const [viewPeriod, setViewPeriod] = useState<'month' | 'all'>('month');

  // Filtra despesas baseado no período selecionado (Mês Atual vs Tudo)
  const filteredExpenses = useMemo(() => {
    if (viewPeriod === 'all') return expenses;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter(e => {
        const d = new Date(e.purchaseDate + 'T00:00:00');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [expenses, viewPeriod]);

  // Dados para os Gráficos
  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    filteredExpenses.filter(e => e.type === 'expense' || !e.type).forEach(expense => {
      const currentTotal = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, currentTotal + expense.total);
    });
    
    // Ordena e pega os top 5, agrupa o resto em "Outros"
    const sorted = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
    
    if (sorted.length <= 5) return sorted;

    const top5 = sorted.slice(0, 5);
    const othersValue = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
    
    if (othersValue > 0) {
        top5.push({ name: 'Outros', value: othersValue });
    }
    return top5;
  }, [filteredExpenses]);

  // Total gasto no período (para o centro do gráfico)
  const totalPeriodExpense = useMemo(() => {
      return categoryData.reduce((acc, curr) => acc + curr.value, 0);
  }, [categoryData]);

  // Histórico (Sempre mostra os últimos 6 meses para contexto, independente do filtro do card)
  const monthlyHistoryData = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    // Usa 'expenses' (todos) para o histórico, não 'filteredExpenses'
    expenses.filter(e => e.type === 'expense' || !e.type).forEach(expense => {
        const monthKey = expense.purchaseDate.substring(0, 7); // YYYY-MM
        const currentTotal = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, currentTotal + expense.total);
    });

    // Pega apenas os últimos 6 meses
    const sortedMonths = Array.from(monthlyMap.keys()).sort().slice(-6);
    
    return sortedMonths.map(month => ({
        name: new Date(month + '-02').toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
        Gasto: monthlyMap.get(month)
    }));
  }, [expenses]);
  
  // Resumo Financeiro
  const financialSummary = useMemo(() => {
      let income = 0;
      let expense = 0;

      filteredExpenses.forEach(e => {
          if (e.type === 'income') {
              income += e.total;
          } else {
              expense += e.total;
          }
      });

      return {
          income,
          expense,
          balance: income - expense
      };
  }, [filteredExpenses]);
  
  // Saúde Financeira (Gastos / Receitas)
  const financialHealth = useMemo(() => {
    if (financialSummary.income === 0) return 100; // Se não ganha nada e gasta, é 100% comprometido (ou mais)
    const ratio = (financialSummary.expense / financialSummary.income) * 100;
    return Math.min(ratio, 100);
  }, [financialSummary]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };
  const userName = userProfile.name?.split(' ')[0] || 'Usuário';

  // Lembretes
  const nextReminder = useMemo(() => {
    if (!reminders || reminders.length === 0) return null;
    const now = new Date();
    
    const futureReminders = reminders.filter(r => {
        const reminderDate = new Date(`${r.date}T${r.time}:00`);
        return reminderDate > now;
    }).sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}:00`);
        const dateB = new Date(`${b.date}T${b.time}:00`);
        return dateA.getTime() - dateB.getTime();
    });

    return futureReminders.length > 0 ? futureReminders[0] : null;
  }, [reminders]);

  let reminderStatusMessage = 'Sem lembretes pendentes.';
  let reminderStatusColor = 'text-gray-500';

  if (nextReminder) {
      const dateObj = new Date(`${nextReminder.date}T${nextReminder.time}:00`);
      const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      reminderStatusMessage = `${nextReminder.title} - ${formattedDate} às ${nextReminder.time}`;
      reminderStatusColor = 'text-orange-600 font-medium';
  }

  // Últimas transações - Agora mostrando até 20 itens para preencher o card
  const recentTransactions = useMemo(() => {
      return [...expenses]
        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
        .slice(0, 20); // Aumentado de 5 para 20
  }, [expenses]);

  return (
    <div className="p-4 space-y-6 pb-24">
        <InstallAppPrompt />

        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">{`${getGreeting()}, ${userName}!`}</h1>
                    <button 
                        onClick={() => setHideValues(!hideValues)}
                        className="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors"
                        aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
                    >
                        {hideValues ? <VisibilityOffIcon className="text-xl"/> : <VisibilityIcon className="text-xl"/>}
                    </button>
                </div>
                <p className="text-gray-500 text-sm">Aqui está o resumo das suas finanças.</p>
            </div>
            
            {/* Toggle Period */}
            <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-medium">
                <button 
                    onClick={() => setViewPeriod('month')}
                    className={`px-4 py-2 rounded-lg transition-all ${viewPeriod === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Este Mês
                </button>
                <button 
                    onClick={() => setViewPeriod('all')}
                    className={`px-4 py-2 rounded-lg transition-all ${viewPeriod === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Geral
                </button>
            </div>
        </div>

        {/* Gamification Widget - Passando despesas e metas agora */}
        <GamificationWidget user={userProfile} expenses={expenses} goals={goals} />

        {/* Grid para Saúde Financeira e Lembretes */}
        <div className={`grid grid-cols-1 gap-4 ${financialSummary.income > 0 ? 'md:grid-cols-2' : ''}`}>
            {/* Financial Health Bar (Only visible if there is activity) */}
            {financialSummary.income > 0 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-semibold text-gray-600">Saúde Financeira ({viewPeriod === 'month' ? 'Mês' : 'Geral'})</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${financialHealth > 90 ? 'bg-red-100 text-red-700' : (financialHealth > 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}`}>
                            {financialHealth.toFixed(0)}% Comprometido
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-1000 ${financialHealth > 90 ? 'bg-red-500' : (financialHealth > 70 ? 'bg-yellow-500' : 'bg-green-500')}`} 
                            style={{ width: `${financialHealth}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Lembrete Card */}
            <div 
                onClick={onManageReminders}
                className="bg-gradient-to-r from-orange-50 to-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-orange-100 cursor-pointer hover:shadow-md transition-shadow h-full"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 min-w-[2.5rem] min-h-[2.5rem] flex items-center justify-center bg-white rounded-full text-orange-500 shadow-sm shrink-0 aspect-square">
                        <NotificationsIcon className="text-xl" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wide">Lembretes</h3>
                        <p className={`text-sm truncate ${reminderStatusColor}`}>{reminderStatusMessage}</p>
                    </div>
                </div>
                <MoreVertIcon className="text-gray-400" />
            </div>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
                title="Saldo (Período)" 
                value={financialSummary.balance}
                icon={<WalletIcon className="text-xl" />}
                iconBgColor={financialSummary.balance >= 0 ? "bg-blue-600" : "bg-red-600"}
                valueColor={financialSummary.balance >= 0 ? "text-blue-700" : "text-red-600"}
                isHidden={hideValues}
            />
            <StatCard 
                title="Entradas" 
                value={financialSummary.income}
                icon={<TrendingUpIcon className="text-xl" />}
                iconBgColor="bg-green-500"
                valueColor="text-green-600"
                isHidden={hideValues}
            />
            <StatCard 
                title="Saídas" 
                value={financialSummary.expense}
                icon={<span className="material-symbols-outlined text-xl">trending_down</span>}
                iconBgColor="bg-red-500"
                valueColor="text-red-600"
                isHidden={hideValues}
            />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Charts (Span 2) */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Categories Donut Chart - REDESIGNED */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                         <span className="material-symbols-outlined text-gray-400">donut_large</span>
                        Categorias ({viewPeriod === 'month' ? 'Mês' : 'Geral'})
                    </h2>
                    
                    {categoryData.length > 0 ? (
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {/* Chart Side */}
                            <div className="relative w-[200px] h-[200px] flex-shrink-0">
                                
                                {/* Center Label - Rendered FIRST to stay behind chart/tooltip */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total</span>
                                    <span className="text-lg font-extrabold text-gray-800">
                                        <CurrencyDisplay value={totalPeriodExpense} isHidden={hideValues} />
                                    </span>
                                </div>

                                {/* Chart Container - Rendered SECOND to stay on top */}
                                <div className="relative z-10 w-full h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={categoryData} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                innerRadius={65} 
                                                outerRadius={85} 
                                                paddingAngle={4}
                                                cornerRadius={4}
                                                stroke="none"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50 }}
                                                formatter={(value: number) => hideValues ? '••••••' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Legend Side */}
                            <div className="flex-1 w-full space-y-3">
                                {categoryData.map((entry, index) => {
                                    const percentage = totalPeriodExpense > 0 ? (entry.value / totalPeriodExpense) * 100 : 0;
                                    const color = COLORS[index % COLORS.length];
                                    
                                    return (
                                        <div key={index} className="flex items-center gap-3 w-full">
                                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: color }}></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-semibold text-gray-700">{entry.name}</span>
                                                    <span className="text-sm font-bold text-gray-800">
                                                        <CurrencyDisplay value={entry.value} isHidden={hideValues} />
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full" 
                                                        style={{ width: `${percentage}%`, backgroundColor: color }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 min-w-[32px] text-right">
                                                {percentage.toFixed(0)}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-30">donut_small</span>
                            <p className="text-sm">Nenhuma despesa para exibir.</p>
                        </div>
                    )}
                </div>

                {/* Monthly History Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                     <div className="flex items-center justify-between mb-4">
                         <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                             <span className="material-symbols-outlined text-gray-400">bar_chart</span>
                             Histórico de Gastos
                         </h2>
                         <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">Últimos 6 meses</span>
                     </div>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {monthlyHistoryData.length > 0 ? (
                                <BarChart data={monthlyHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip 
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(value: number) => hideValues ? '••••••' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    />
                                    <Bar dataKey="Gasto" fill="#60A5FA" radius={[4, 4, 0, 0]} barSize={32} /> 
                                </BarChart>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Sem histórico disponível</div>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Column 2: Recent Transactions - UPDATED TO FILL SPACE */}
            <div className="lg:col-span-1">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2">
                            <ListIcon className="text-gray-400" />
                            Últimos Registros
                        </h2>
                    </div>
                    
                    {recentTransactions.length > 0 ? (
                        <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                            {recentTransactions.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full flex items-center justify-center flex-shrink-0 aspect-square ${expense.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                            <span className="material-symbols-outlined text-sm">
                                                {expense.type === 'income' ? 'trending_up' : 'shopping_bag'}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-700 truncate">{expense.localName}</p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {new Date(expense.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})} • {expense.category}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold whitespace-nowrap ${expense.type === 'income' ? 'text-green-600' : 'text-gray-800'}`}>
                                        {expense.type === 'income' ? '+' : '-'}
                                        <CurrencyDisplay value={expense.total} isHidden={hideValues} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-center flex-1">
                            <span className="material-symbols-outlined text-3xl mb-2 opacity-50">receipt_long</span>
                            <p className="text-sm">Nenhum lançamento recente.</p>
                        </div>
                    )}
                    
                    {expenses.length > 20 && (
                        <div className="mt-6 pt-4 border-t border-gray-50 flex-shrink-0">
                             <button 
                                onClick={onViewAll} 
                                className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 uppercase tracking-wide"
                             >
                                Ver todos <ArrowForwardIcon className="text-sm"/>
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
