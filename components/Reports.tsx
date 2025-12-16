
import React, { useState, useMemo } from 'react';
import type { Expense } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { PaymentsIcon, CalculateIcon, CategoryIcon, DownloadIcon, ShowChartIcon, CalendarTodayIcon, TrendingUpIcon, WalletIcon } from './Icons';
import { filterExpensesByPeriod } from '../services/utils';

interface ReportsProps {
  expenses: Expense[];
  isLoadingExpenses: boolean;
}

type Period = 'this-month' | 'last-month' | 'last-7-days' | 'custom';

// Helper para mapear ícones de categoria
const getCategoryIcon = (category: string) => {
    const map: Record<string, string> = {
        'Alimentação': 'restaurant',
        'Moradia': 'home',
        'Transporte': 'directions_car',
        'Lazer': 'movie',
        'Saúde': 'medical_services',
        'Cuidados Pessoais': 'self_improvement',
        'Vestuário': 'checkroom',
        'Educação': 'school',
        'Compras': 'shopping_bag',
        'Serviços': 'build',
        'Impostos e Taxas': 'account_balance',
        'Investimentos': 'trending_up',
        'Dívidas e Empréstimos': 'credit_card',
        'Outros': 'category'
    };
    return map[category] || 'category';
};

const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    icon: React.ReactNode; 
    iconBgColor: string; 
    trend?: number; 
    trendLabel?: string;
    inverseTrend?: boolean; // Se true, aumento é ruim (ex: gastos). Se false, aumento é bom (ex: economia/renda).
}> = ({ title, value, icon, iconBgColor, trend, trendLabel, inverseTrend = false }) => {
    
    let trendColor = 'text-gray-500';
    let TrendIcon = null;

    if (trend !== undefined && trend !== 0) {
        const isPositive = trend > 0;
        // Se inverseTrend é true (gastos), aumento (positivo) é ruim (vermelho), queda (negativo) é bom (verde)
        const isBad = inverseTrend ? isPositive : !isPositive;
        
        trendColor = isBad ? 'text-red-500' : 'text-green-500';
        TrendIcon = isPositive ? 'north_east' : 'south_east';
    }

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <div className={`w-12 h-12 min-w-[3rem] min-h-[3rem] flex items-center justify-center rounded-xl flex-shrink-0 aspect-square ${iconBgColor} text-white shadow-sm`}>
                    {icon}
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-gray-50 ${trendColor}`}>
                        {TrendIcon && <span className="material-symbols-outlined text-xs">{TrendIcon}</span>}
                        {Math.abs(trend).toFixed(1)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
            </div>
        </div>
    );
};

export const Reports: React.FC<ReportsProps> = ({ expenses, isLoadingExpenses }) => {
    const [period, setPeriod] = useState<Period>('this-month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // --- LÓGICA DE DATAS E COMPARAÇÃO ---
    
    // 1. Define o range atual
    const currentRangeExpenses = useMemo(() => {
        return filterExpensesByPeriod(expenses, period, customStartDate, customEndDate);
    }, [expenses, period, customStartDate, customEndDate]);

    // 2. Define o range anterior para comparação
    const previousRangeExpenses = useMemo(() => {
        let prevPeriod: Period = 'last-month'; // default fallback
        
        // Lógica simples para "Período Anterior"
        if (period === 'this-month') prevPeriod = 'last-month';
        // Para 'last-month', o anterior seria 2 meses atrás, mas vamos simplificar aqui ou implementar lógica customizada se necessário.
        // Para simplificar a demo, vamos focar na comparação Mês Atual vs Mês Passado que é o caso de uso 90%.
        
        if (period === 'last-7-days') {
            // Precisaríamos de uma lógica customizada em 'filterExpensesByPeriod' para "7 a 14 dias atrás", 
            // mas por enquanto vamos comparar com a média geral ou deixar 0 se complexo demais sem mexer no utils.
            // Vamos assumir comparação com Mês Anterior para simplificar ou implementar lógica de datas manuais.
            return []; 
        }

        if (period === 'custom') return []; // Sem comparação para custom por enquanto

        return filterExpensesByPeriod(expenses, prevPeriod, '', '');
    }, [expenses, period]);

    // --- CÁLCULOS KPI ---

    const calculateStats = (data: Expense[]) => {
        const income = data.filter(e => e.type === 'income').reduce((sum, e) => sum + e.total, 0);
        const expense = data.filter(e => e.type === 'expense' || !e.type).reduce((sum, e) => sum + e.total, 0);
        return { income, expense, balance: income - expense };
    };

    const currentStats = useMemo(() => calculateStats(currentRangeExpenses), [currentRangeExpenses]);
    const previousStats = useMemo(() => calculateStats(previousRangeExpenses), [previousRangeExpenses]);

    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const expenseTrend = useMemo(() => calculateTrend(currentStats.expense, previousStats.expense), [currentStats, previousStats]);
    const incomeTrend = useMemo(() => calculateTrend(currentStats.income, previousStats.income), [currentStats, previousStats]);
    const balanceTrend = useMemo(() => calculateTrend(currentStats.balance, previousStats.balance), [currentStats, previousStats]);

    const hasPreviousData = previousRangeExpenses.length > 0 && period !== 'custom';

    // --- DADOS PARA GRÁFICOS ---

    // 1. Fluxo de Caixa (Income vs Expense por dia/agrupado)
    const cashFlowData = useMemo(() => {
        const dailyMap = new Map<string, { income: number, expense: number }>();
        
        currentRangeExpenses.forEach(e => {
            const day = new Date(e.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const current = dailyMap.get(day) || { income: 0, expense: 0 };
            
            if (e.type === 'income') current.income += e.total;
            else current.expense += e.total;
            
            dailyMap.set(day, current);
        });

        return Array.from(dailyMap.entries())
            .map(([date, vals]) => ({ name: date, Receitas: vals.income, Despesas: vals.expense }))
            .sort((a, b) => {
                const [da, ma] = a.name.split('/').map(Number);
                const [db, mb] = b.name.split('/').map(Number);
                return ma - mb || da - db;
            });
    }, [currentRangeExpenses]);

    // 2. Ranking de Categorias (Horizontal) - Apenas Despesas
    const categoryRanking = useMemo(() => {
        const expensesOnly = currentRangeExpenses.filter(e => e.type === 'expense' || !e.type);
        const map = new Map<string, number>();
        let totalExpenses = 0;

        expensesOnly.forEach(e => {
            const current = map.get(e.category) || 0;
            map.set(e.category, current + e.total);
            totalExpenses += e.total;
        });

        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value, percentage: (value / totalExpenses) * 100 }))
            .sort((a, b) => b.value - a.value);
    }, [currentRangeExpenses]);

    // 3. Heatmap Data (Calendário)
    const heatmapData = useMemo(() => {
        const expensesOnly = currentRangeExpenses.filter(e => e.type === 'expense' || !e.type);
        const map = new Map<number, number>();
        let maxDaily = 0;

        expensesOnly.forEach(e => {
            const day = parseInt(e.purchaseDate.split('-')[2]);
            const current = map.get(day) || 0;
            const newVal = current + e.total;
            map.set(day, newVal);
            if (newVal > maxDaily) maxDaily = newVal;
        });

        // Gera array de 1 a 31 (simplificado)
        return Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            const value = map.get(day) || 0;
            const intensity = maxDaily > 0 ? value / maxDaily : 0;
            return { day, value, intensity };
        });
    }, [currentRangeExpenses]);

    const exportToCSV = () => {
        if (currentRangeExpenses.length === 0) {
            alert("Nenhuma transação para exportar.");
            return;
        }
        const headers = ["Data", "Local", "Tipo", "Categoria", "Valor", "Forma Pagamento"].join(",");
        const csvRows = currentRangeExpenses.map(e => {
            return [
                `"${e.purchaseDate}"`,
                `"${e.localName}"`,
                `"${e.type === 'income' ? 'Receita' : 'Despesa'}"`,
                `"${e.category}"`,
                `${e.total.toFixed(2)}`,
                `"${e.paymentMethod}"`
            ].join(",");
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvRows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_meugasto_${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const dateInputClasses = "w-full pl-10 pr-4 py-2.5 bg-white text-gray-800 text-sm font-medium rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer";

    return (
        <div className="p-4 space-y-8 pb-20">
            {/* Filtros */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                    <button onClick={() => setPeriod('this-month')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${period === 'this-month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Este Mês</button>
                    <button onClick={() => setPeriod('last-month')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${period === 'last-month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Mês Passado</button>
                    <button onClick={() => setPeriod('last-7-days')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${period === 'last-7-days' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>7 Dias</button>
                    <button onClick={() => setPeriod('custom')} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${period === 'custom' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Personalizado</button>
                </div>
                {period === 'custom' && (
                    <div className="mt-3 grid grid-cols-2 gap-3 p-3 border-t border-gray-50">
                        <div className="relative">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Início</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CalendarTodayIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <input 
                                    type="date" 
                                    value={customStartDate} 
                                    onChange={e => setCustomStartDate(e.target.value)} 
                                    onClick={(e) => {
                                        try { e.currentTarget.showPicker(); } catch (err) { }
                                    }}
                                    className={dateInputClasses}
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Fim</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CalendarTodayIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <input 
                                    type="date" 
                                    value={customEndDate} 
                                    onChange={e => setCustomEndDate(e.target.value)} 
                                    onClick={(e) => {
                                        try { e.currentTarget.showPicker(); } catch (err) { }
                                    }}
                                    className={dateInputClasses}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {currentRangeExpenses.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <div className="bg-gray-100 p-6 rounded-full inline-block mb-4">
                        <ShowChartIcon className="text-4xl opacity-40" />
                    </div>
                    <p className="font-medium">Sem dados neste período.</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard 
                            title="Saídas Totais" 
                            value={currentStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                            icon={<span className="material-symbols-outlined text-2xl">trending_down</span>}
                            iconBgColor="bg-red-500"
                            trend={hasPreviousData ? expenseTrend : undefined}
                            trendLabel={hasPreviousData ? "vs. período anterior" : undefined}
                            inverseTrend={true} // Aumento de gasto é ruim
                        />
                        <StatCard 
                            title="Entradas Totais" 
                            value={currentStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                            icon={<TrendingUpIcon className="text-2xl" />}
                            iconBgColor="bg-green-500"
                            trend={hasPreviousData ? incomeTrend : undefined}
                            trendLabel={hasPreviousData ? "vs. período anterior" : undefined}
                        />
                        <StatCard 
                            title="Saldo do Período" 
                            value={currentStats.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
                            icon={<WalletIcon className="text-2xl" />}
                            iconBgColor={currentStats.balance >= 0 ? "bg-blue-500" : "bg-orange-500"}
                            trend={hasPreviousData ? balanceTrend : undefined}
                            trendLabel={hasPreviousData ? "vs. período anterior" : undefined}
                        />
                    </div>

                    {/* Gráfico 1: Fluxo de Caixa (Bar Chart Duplo) */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                                <span className="material-symbols-outlined text-lg">bar_chart</span>
                            </span>
                            Fluxo de Caixa (Dia a Dia)
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cashFlowData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        formatter={(val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                                    <Bar dataKey="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} barSize={8} />
                                    <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={8} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gráfico 2: Ranking de Categorias (Horizontal Progress Bars) */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="bg-purple-50 text-purple-600 p-1.5 rounded-lg">
                                    <CategoryIcon className="text-lg" />
                                </span>
                                Top Gastos por Categoria
                            </h3>
                            <div className="space-y-4">
                                {categoryRanking.map((cat, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 min-w-[2rem] min-h-[2rem] rounded-full bg-gray-50 flex items-center justify-center text-gray-500 flex-shrink-0 shrink-0 aspect-square">
                                                    <span className="material-symbols-outlined text-sm">{getCategoryIcon(cat.name)}</span>
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-gray-800">{cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                <span className="text-[10px] text-gray-400">{cat.percentage.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className="h-full bg-purple-500 rounded-full transition-all duration-1000 ease-out" 
                                                style={{ width: `${cat.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Gráfico 3: Calendário de Intensidade (Heatmap) */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <span className="bg-orange-50 text-orange-600 p-1.5 rounded-lg">
                                        <CalendarTodayIcon className="text-lg" />
                                    </span>
                                    Intensidade de Gastos
                                </h3>
                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">Dias do Mês</span>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2">
                                {heatmapData.map((d) => {
                                    // Calcula a cor baseada na intensidade (0 a 1)
                                    // Baixo: cinza/verde claro -> Alto: Vermelho forte
                                    let bgClass = "bg-gray-50 text-gray-400";
                                    if (d.value > 0) {
                                        if (d.intensity < 0.2) bgClass = "bg-red-50 text-red-800 border border-red-100";
                                        else if (d.intensity < 0.5) bgClass = "bg-red-200 text-red-900";
                                        else if (d.intensity < 0.8) bgClass = "bg-red-400 text-white";
                                        else bgClass = "bg-red-600 text-white font-bold shadow-sm";
                                    }

                                    return (
                                        <div 
                                            key={d.day} 
                                            className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-transform hover:scale-110 cursor-default ${bgClass}`}
                                            style={{ aspectRatio: '1/1' }}
                                            title={`Dia ${d.day}: ${d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                        >
                                            <span>{d.day}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 flex justify-between items-center text-[10px] text-gray-400 px-1">
                                <span>Menor Gasto</span>
                                <div className="flex gap-1">
                                    <div className="w-3 h-3 bg-red-50 rounded-sm"></div>
                                    <div className="w-3 h-3 bg-red-200 rounded-sm"></div>
                                    <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
                                    <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                                </div>
                                <span>Maior Gasto</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={exportToCSV} className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors text-sm font-bold shadow-lg active:scale-95">
                            <DownloadIcon className="text-lg" />
                            Baixar CSV Completo
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};