
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom'; 
import type { Expense, BankTransaction, Omit } from '../types'; 
import { TrashIcon, EditIcon, FilterListIcon, SearchIcon, ReceiptIcon, MoreVertIcon, DownloadIcon, PlusIcon, TrendingUpIcon, CalendarTodayIcon } from './Icons'; 
import { EXPENSE_CATEGORIES } from '../types';
import { useToast } from '../contexts/ToastContext'; 
import { extractTransactionsFromPdfText } from '../services/geminiService'; 

import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;


interface EntriesProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  isLoading: boolean;
  onAddExpense: (expense: Omit<Expense, 'id'>, showSuccessToast?: boolean) => void; 
  onAPISetupError: () => void; 
}

const formatDate = (dateString: string) => {
  return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const groupExpensesByDate = (expenses: Expense[]) => {
    const grouped = new Map<string, Expense[]>();
    expenses.forEach(expense => {
        const date = expense.purchaseDate;
        if (!grouped.has(date)) {
            grouped.set(date, []);
        }
        grouped.get(date)!.push(expense);
    });
    return Array.from(grouped.entries());
};

const getNextPaymentDate = (purchaseDate: string) => {
    const today = new Date();
    const [year, month, day] = purchaseDate.split('-').map(Number);
    const billingDay = day;
    
    // Cria data de vencimento neste mês
    let nextDate = new Date(today.getFullYear(), today.getMonth(), billingDay);
    
    // Se o dia de vencimento já passou este mês, o próximo é mês que vem
    if (today.getDate() > billingDay) {
        nextDate.setMonth(nextDate.getMonth() + 1);
    }
    
    return nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const ExpenseListItem: React.FC<{ expense: Expense; onDelete: (id: string) => void; onEdit: (expense: Expense) => void; isRecurringView?: boolean }> = ({ expense, onDelete, onEdit, isRecurringView }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; } | null>(null); 
    const [isExpanded, setIsExpanded] = useState(false); // Novo estado para expansão
    const contentRef = useRef<HTMLDivElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null); 
    const menuRef = useRef<HTMLDivElement>(null); 
    const startX = useRef(0);
    const isSwiping = useRef(false);

    const SWIPE_THRESHOLD = -80;

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        isSwiping.current = true;
        if (contentRef.current) {
            contentRef.current.style.transition = 'none';
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping.current) return;
        const currentX = e.touches[0].clientX;
        let deltaX = currentX - startX.current;

        if (deltaX > 0) deltaX = 0; 
        if (deltaX < SWIPE_THRESHOLD - 30) deltaX = SWIPE_THRESHOLD - 30; 

        setOffsetX(deltaX);
    };

    const handleTouchEnd = () => {
        isSwiping.current = false;
        if (contentRef.current) {
            contentRef.current.style.transition = 'transform 0.3s ease';
        }

        if (offsetX < SWIPE_THRESHOLD / 2) {
            setOffsetX(0);
        } else {
            setOffsetX(0); 
        }
    };

    const handleDelete = () => {
        onDelete(expense.id);
        setIsMenuOpen(false); 
        setMenuPosition(null); 
    };

    const handleEdit = () => {
        onEdit(expense);
        setIsMenuOpen(false); 
        setMenuPosition(null); 
    };

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        if (isMenuOpen) {
            setIsMenuOpen(false);
            setMenuPosition(null);
        } else {
            setIsMenuOpen(true);
            if (menuButtonRef.current) {
                const rect = menuButtonRef.current.getBoundingClientRect();
                setMenuPosition({
                    top: rect.bottom + window.scrollY + 8, 
                    left: rect.right + window.scrollX - 160 
                });
            }
        }
    };

    const toggleExpand = (e: React.MouseEvent) => {
        // Apenas expande se não estiver arrastando (swiping)
        if (offsetX === 0) {
            setIsExpanded(!isExpanded);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isMenuOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                menuButtonRef.current &&
                !menuButtonRef.current.contains(event.target as Node) 
            ) {
                setIsMenuOpen(false);
                setMenuPosition(null);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const isIncome = expense.type === 'income';

    return (
        <li className="bg-white rounded-2xl shadow-sm overflow-hidden relative border border-gray-100 transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 h-full bg-red-500 flex items-center justify-center sm:hidden" style={{ width: `${Math.abs(SWIPE_THRESHOLD)}px` }}>
                <button onClick={handleDelete} className="w-full h-full flex items-center justify-center" aria-label={`Excluir ${expense.localName}`}>
                    <TrashIcon className="text-white text-2xl" />
                </button>
            </div>
            <div
                ref={contentRef}
                className="bg-white p-4 relative z-10 touch-pan-y cursor-pointer"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={toggleExpand}
                style={{ transform: `translateX(${offsetX}px)` }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 min-w-[3rem] min-h-[3rem] flex items-center justify-center rounded-2xl flex-shrink-0 aspect-square shadow-sm ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {isIncome ? <TrendingUpIcon className="text-xl"/> : <span className="material-symbols-outlined text-xl">shopping_cart</span>}
                        </div>
                        <div>
                            <p className="font-bold text-gray-800 text-base">{expense.localName}</p>
                            <div className="flex items-center flex-wrap gap-1 mt-1">
                                <span className="text-[10px] uppercase tracking-wide text-gray-500 font-bold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">{expense.category}</span>
                                {isRecurringView && expense.isRecurring && (
                                    <span className="text-[10px] uppercase tracking-wide text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-lg flex items-center gap-1 border border-purple-100">
                                        <span className="material-symbols-outlined text-[10px]">event</span>
                                        Renova dia {getNextPaymentDate(expense.purchaseDate)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 relative"> 
                        <div className="text-right">
                            <p className={`font-bold text-lg whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
                                {isIncome ? '+' : '-'}{expense.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('R$', '').trim()}
                            </p>
                            {isRecurringView && (
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Mensal</p>
                            )}
                        </div>
                        <button 
                            ref={menuButtonRef} 
                            onClick={toggleMenu} 
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50 transition-colors" 
                            aria-label={`Mais opções para ${expense.localName}`}
                        >
                            <MoreVertIcon className="text-2xl" />
                        </button>

                        {isMenuOpen && menuPosition && ReactDOM.createPortal(
                            <div 
                                className="absolute bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden" 
                                style={{ top: menuPosition.top, left: menuPosition.left, width: '160px' }} 
                                ref={menuRef} 
                            >
                                <button onClick={handleEdit} className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50" aria-label={`Editar ${expense.localName}`}>
                                    <EditIcon className="text-lg text-blue-500"/> Editar
                                </button>
                                <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2" aria-label={`Excluir ${expense.localName}`}>
                                    <TrashIcon className="text-lg"/> Excluir
                                </button>
                            </div>,
                            document.body 
                        )}
                    </div>
                </div>

                {/* Área Expandida com Detalhes dos Itens */}
                {isExpanded && (
                    <div className="border-t border-dashed border-gray-200 mt-3 pt-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">receipt</span>
                                Detalhes do Lançamento
                            </p>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 font-mono text-xs shadow-inner">
                            {/* Cabeçalho da "Notinha" */}
                            <div className="text-center border-b border-dashed border-yellow-200 pb-2 mb-2">
                                <p className="text-gray-800 font-bold">{expense.localName.toUpperCase()}</p>
                                <p className="text-[10px] text-gray-500">{new Date(expense.purchaseDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                            </div>

                            {/* Itens */}
                            {expense.items && expense.items.length > 0 ? (
                                <ul className="space-y-1.5 mb-3">
                                    {expense.items.map((item, idx) => (
                                        <li key={idx} className="flex justify-between items-start text-gray-700">
                                            <span className="flex-1 mr-2 break-words">{item.name}</span>
                                            <span className="font-bold text-gray-900 flex-shrink-0">
                                                {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-400 text-center italic mb-3">Sem itens detalhados.</p>
                            )}

                            {/* Rodapé da "Notinha" */}
                            <div className="border-t border-dashed border-yellow-200 pt-2 flex flex-col gap-1">
                                <div className="flex justify-between text-gray-600">
                                    <span>Forma Pagamento:</span>
                                    <span className="font-semibold">{expense.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-gray-900 mt-1">
                                    <span>TOTAL</span>
                                    <span>{expense.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </li>
    );
};


export const Entries: React.FC<EntriesProps> = ({ expenses, onDeleteExpense, onEditExpense, isLoading, onAddExpense, onAPISetupError }) => {
    // ... restante do código (mantido igual) ...
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'recurring'>('all');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [extractedTransactions, setExtractedTransactions] = useState<BankTransaction[]>([]);
    const [isSavingTransactions, setIsSavingTransactions] = useState(false);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();

    const filteredExpenses = useMemo(() => {
        let filtered = expenses;

        if (searchTerm) {
            filtered = filtered.filter(expense =>
                expense.localName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
                expense.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Filtro por Tipo (Abas)
        if (filterType === 'income') {
            filtered = filtered.filter(e => e.type === 'income');
        } else if (filterType === 'expense') {
            filtered = filtered.filter(e => e.type === 'expense' || !e.type);
        } else if (filterType === 'recurring') {
            filtered = filtered.filter(e => e.isRecurring === true);
        }

        if (selectedCategory) {
            filtered = filtered.filter(expense => expense.category === selectedCategory);
        }

        if (startDate) {
            filtered = filtered.filter(expense => new Date(expense.purchaseDate) >= new Date(startDate));
        }

        if (endDate) {
            filtered = filtered.filter(expense => new Date(expense.purchaseDate) <= new Date(endDate));
        }

        // Se estiver vendo assinaturas, ordenar por data de compra (que geralmente é a data de vencimento)
        if (filterType === 'recurring') {
             // Lógica simples: ordenar pelo dia do mês da compra
             return filtered.sort((a, b) => {
                 const dayA = parseInt(a.purchaseDate.split('-')[2]);
                 const dayB = parseInt(b.purchaseDate.split('-')[2]);
                 return dayA - dayB;
             });
        }

        return filtered.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    }, [expenses, searchTerm, selectedCategory, startDate, endDate, filterType]);

    // Calcula os totais baseados nos filtros ativos
    const filteredStats = useMemo(() => {
        let income = 0;
        let expense = 0;
        
        filteredExpenses.forEach(e => {
            if (e.type === 'income') income += e.total;
            else expense += e.total;
        });

        return {
            income,
            expense,
            balance: income - expense,
            count: filteredExpenses.length
        };
    }, [filteredExpenses]);

    const groupedExpenses = useMemo(() => {
        // Se for recorrente, não agrupar por data (mostrar lista plana ordenada por dia)
        if (filterType === 'recurring') return null; 
        return groupExpensesByDate(filteredExpenses);
    }, [filteredExpenses, filterType]);

    // Cálculo do total recorrente mensal (estimativa simples)
    const recurringMonthlyTotal = useMemo(() => {
        if (filterType !== 'recurring') return 0;
        return filteredExpenses.reduce((sum, item) => sum + item.total, 0);
    }, [filteredExpenses, filterType]);

    const inputContainerClasses = "relative bg-white rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all";
    const inputClasses = "w-full pl-10 pr-4 py-3 bg-transparent text-gray-800 text-sm font-medium focus:outline-none placeholder-gray-400";
    const selectClasses = "w-full pl-10 pr-4 py-3 bg-white text-gray-800 text-sm font-medium rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none";
    // Modified Date Input Classes for better UX
    const dateInputClasses = "w-full pl-10 pr-4 py-2.5 bg-white text-gray-800 text-sm font-medium rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer";

    const handlePdfUploadClick = useCallback(() => {
        pdfInputRef.current?.click();
    }, []);

    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsPdfLoading(true);
        setExtractedTransactions([]);
        showToast('Processando extrato PDF...', 'info');

        try {
            const fileReader = new FileReader();
            fileReader.onload = async () => {
                const typedarray = new Uint8Array(fileReader.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                }

                if (fullText.trim().length === 0) {
                    throw new Error("Não foi possível extrair texto do PDF.");
                }

                showToast('Texto extraído. Enviando para IA...', 'info');
                const transactions = await extractTransactionsFromPdfText(fullText);
                setExtractedTransactions(transactions);
                showToast(`IA extraiu ${transactions.length} transações! Revise e salve as despesas.`, 'success');
            };
            fileReader.readAsArrayBuffer(file);
        } catch (error) {
            const err = error as Error;
            if (err.message === 'API_NOT_ENABLED') {
                onAPISetupError();
            } else {
                const errorMessage = err.message || 'Erro ao processar PDF.';
                showToast(errorMessage, 'error');
                console.error('PDF processing error:', error);
            }
        } finally {
            setIsPdfLoading(false);
            if (pdfInputRef.current) {
                pdfInputRef.current.value = '';
            }
        }
    };
    
    const handleSaveTransactions = async () => {
        const transactionsToSave = extractedTransactions.filter(tx => tx.type === 'DEBIT');
        if (transactionsToSave.length === 0) {
            showToast('Nenhuma despesa (débito) para salvar.', 'info');
            return;
        }

        setIsSavingTransactions(true);
        showToast(`Iniciando o salvamento de ${transactionsToSave.length} despesas...`, 'info');

        try {
            const expensesToAdd = transactionsToSave.map((tx): Omit<Expense, 'id'> => ({
                localName: tx.description,
                purchaseDate: tx.date,
                items: [],
                total: tx.amount,
                category: 'Outros',
                subcategory: 'Despesa não categorizada',
                isRecurring: false,
                paymentMethod: 'Transferência Bancária',
                type: 'expense'
            }));

            const savePromises = expensesToAdd.map(exp => onAddExpense(exp, false));
            await Promise.all(savePromises);

            showToast(`${expensesToAdd.length} despesas salvas com sucesso a partir do extrato!`, 'success');
            setExtractedTransactions([]);
        } catch (error) {
            console.error("Error saving batch transactions:", error);
            showToast('Ocorreu um erro ao salvar as despesas do extrato. Tente novamente.', 'error');
        } finally {
            setIsSavingTransactions(false);
        }
    };

    const debitTransactionsCount = useMemo(() => extractedTransactions.filter(tx => tx.type === 'DEBIT').length, [extractedTransactions]);

    return (
        <div className="p-4">
            <div className="mb-4 space-y-4">
                {/* Abas de Filtro - Estilo Menu Relatórios */}
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        <button 
                            onClick={() => setFilterType('all')} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => setFilterType('income')} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'income' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Receitas
                        </button>
                        <button 
                            onClick={() => setFilterType('expense')} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'expense' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Despesas
                        </button>
                        <button 
                            onClick={() => setFilterType('recurring')} 
                            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${filterType === 'recurring' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            Assinaturas
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className={inputContainerClasses}>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, categoria..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={inputClasses}
                            aria-label="Campo de busca"
                        />
                    </div>
                    <div className="relative">
                        <FilterListIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl pointer-events-none z-10" aria-hidden="true" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className={selectClasses}
                            aria-label="Filtrar por categoria"
                        >
                            <option value="">Todas as Categorias</option>
                            {Object.keys(EXPENSE_CATEGORIES).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <span className="material-symbols-outlined">expand_more</span>
                        </span>
                    </div>
                </div>

                {/* Filtros de Data com PDF Button na mesma linha */}
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                        <div className="relative">
                            <label htmlFor="startDate" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block ml-1">De</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CalendarTodayIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    onClick={(e) => {
                                        try { e.currentTarget.showPicker(); } catch (err) {}
                                    }}
                                    className={dateInputClasses}
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <label htmlFor="endDate" className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block ml-1">Até</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CalendarTodayIcon className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    onClick={(e) => {
                                        try { e.currentTarget.showPicker(); } catch (err) {}
                                    }}
                                    className={dateInputClasses}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* PDF Button - Agora integrado na linha */}
                    <div className="w-full md:w-auto">
                        <button 
                            onClick={handlePdfUploadClick} 
                            className="w-full flex items-center justify-center gap-2 p-3 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:scale-95 h-[46px]" // Altura forçada para alinhar com inputs
                            disabled={isPdfLoading}
                        >
                            {isPdfLoading ? (
                                <span className="flex items-center"><span className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></span>Importando...</span>
                            ) : (
                                <><DownloadIcon className="text-xl" /> Importar Extrato PDF</>
                            )}
                        </button>
                        <input type="file" accept=".pdf" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" aria-label="Selecione um arquivo PDF"/>
                    </div>
                </div>

                {/* Resumo Dinâmico dos Filtros */}
                {filterType !== 'recurring' && filteredStats.count > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center animate-fade-in">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Itens</span>
                            <span className="font-bold text-gray-800 text-lg">{filteredStats.count}</span>
                        </div>
                        
                        {/* Se estiver filtrando apenas receitas */}
                        {filterType === 'income' && (
                            <div className="text-right">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total</span>
                                <span className="block font-bold text-green-600 text-lg">{filteredStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        )}

                        {/* Se estiver filtrando apenas despesas */}
                        {filterType === 'expense' && (
                            <div className="text-right">
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total</span>
                                <span className="block font-bold text-red-600 text-lg">{filteredStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        )}

                        {/* Se estiver vendo todos */}
                        {filterType === 'all' && (
                            <div className="flex gap-6">
                                <div className="text-right hidden sm:block">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Entradas</span>
                                    <span className="block font-bold text-green-600">{filteredStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Saídas</span>
                                    <span className="block font-bold text-red-600">{filteredStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Saldo</span>
                                    <span className={`block font-bold text-lg ${filteredStats.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                        {filteredStats.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Totalizador de Assinaturas - Visualização Aprimorada */}
            {filterType === 'recurring' && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 mb-6 text-white shadow-lg animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-center md:text-left">
                            <h3 className="font-semibold text-purple-100 text-xs uppercase tracking-widest mb-2">Custo Mensal Fixo</h3>
                            <div className="text-4xl font-bold tracking-tight">
                                {recurringMonthlyTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <p className="text-xs text-purple-200 mt-2 flex items-center justify-center md:justify-start gap-1 font-medium bg-white/10 px-2 py-1 rounded-lg w-fit">
                                <span className="material-symbols-outlined text-sm">calendar_month</span>
                                Projeção Anual: {(recurringMonthlyTotal * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner">
                            <p className="text-xs text-center font-bold uppercase tracking-wide opacity-80">Itens Ativos</p>
                            <p className="text-3xl font-bold text-center">{filteredExpenses.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {extractedTransactions.length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
                    <h2 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined">receipt_long</span>
                        Transações Encontradas
                    </h2>
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {extractedTransactions.map((tx, index) => (
                            <li key={index} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-yellow-100 shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-800">{tx.description}</p>
                                    <p className="text-xs text-gray-500 font-mono">{tx.date}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className={`font-bold text-base ${tx.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                                        {tx.type === 'DEBIT' ? '-' : '+'} {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                    <button 
                                        onClick={() => onAddExpense({
                                            localName: tx.description,
                                            purchaseDate: tx.date,
                                            items: [],
                                            total: tx.amount,
                                            category: 'Outros',
                                            subcategory: 'Despesa não categorizada',
                                            isRecurring: false,
                                            paymentMethod: 'Transferência Bancária',
                                            type: 'expense'
                                        }, true)} 
                                        className="bg-green-100 hover:bg-green-200 text-green-700 rounded-lg p-1.5 w-8 h-8 flex items-center justify-center transition-colors"
                                    >
                                        <PlusIcon className="text-lg" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                     <button
                        onClick={handleSaveTransactions}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-green-700 transition-colors disabled:bg-gray-400 shadow-md active:scale-95"
                        disabled={debitTransactionsCount === 0 || isSavingTransactions}
                    >
                        {isSavingTransactions ? 'Salvando...' : `Salvar ${debitTransactionsCount} Despesa(s) do Extrato`}
                    </button>
                </div>
            )}

            {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-350px)] text-center text-gray-500 mt-8">
                    <div className="bg-gray-100 p-6 rounded-full mb-4">
                        <ReceiptIcon className="text-gray-400 text-5xl" aria-hidden="true" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-700">Nenhum lançamento encontrado.</h2>
                    <p className="mt-2 max-w-sm text-sm">
                        {filterType === 'recurring' ? 'Nenhuma assinatura cadastrada.' : 'Ajuste seus filtros ou adicione um novo lançamento para ver aqui.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filterType === 'recurring' ? (
                        /* Lista Plana para Assinaturas */
                        <ul className="space-y-3">
                            {filteredExpenses.map(expense => (
                                <ExpenseListItem 
                                    key={expense.id} 
                                    expense={expense} 
                                    onDelete={onDeleteExpense} 
                                    onEdit={onEditExpense}
                                    isRecurringView={true}
                                />
                            ))}
                        </ul>
                    ) : (
                        /* Lista Agrupada por Data para Outros */
                        groupedExpenses?.map(([date, expensesOnDate]) => {
                            // Calcula o total do dia
                            const dayTotal = expensesOnDate.reduce((acc, curr) => {
                                return curr.type === 'income' ? acc + curr.total : acc - curr.total;
                            }, 0);

                            return (
                                <div key={date}>
                                    <div className="flex justify-between items-end border-b border-gray-200 pb-2 mb-4 sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 pt-4 rounded-t-xl px-2">
                                        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
                                            {formatDate(date)}
                                        </h2>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${dayTotal >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {dayTotal >= 0 ? '+' : ''}{dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                    <ul className="space-y-3">
                                        {expensesOnDate.map(expense => (
                                        <ExpenseListItem key={expense.id} expense={expense} onDelete={onDeleteExpense} onEdit={onEditExpense} />
                                        ))}
                                    </ul>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};