
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Expense, Omit } from '../types';
import { extractExpenseFromImage } from '../services/geminiService'; 
import { CameraIcon, XMarkIcon, TrashIcon, PlusIcon, CalculateIcon, TrendingUpIcon } from './Icons';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Omit<Expense, 'id'>, idToUpdate?: string) => void;
  expenseToEdit?: Expense | null;
  initialData?: Omit<Expense, 'id'> | null;
  onAPISetupError: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSaveExpense, expenseToEdit, initialData, onAPISetupError }) => {
  const [formData, setFormData] = useState<Omit<Expense, 'id' | 'items'>>({
    localName: '', purchaseDate: new Date().toISOString().split('T')[0], total: 0, category: '', subcategory: '', isRecurring: false, paymentMethod: '', recurrenceFrequency: undefined, type: 'expense'
  });
  const [items, setItems] = useState<{ name: string; price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const resetForm = useCallback(() => {
    setFormData({ 
      localName: '', 
      purchaseDate: new Date().toISOString().split('T')[0], 
      total: 0, 
      category: '', 
      subcategory: '', 
      isRecurring: false, 
      paymentMethod: '',
      type: 'expense'
    });
    setItems([]);
    setError(null);
    setIsLoading(false);
    setSubcategories([]);
    setPreviewUrl(null);
  }, []);

  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        localName: expenseToEdit.localName,
        purchaseDate: expenseToEdit.purchaseDate,
        total: expenseToEdit.total,
        category: expenseToEdit.category,
        subcategory: expenseToEdit.subcategory,
        isRecurring: expenseToEdit.isRecurring,
        paymentMethod: expenseToEdit.paymentMethod,
        recurrenceFrequency: expenseToEdit.recurrenceFrequency,
        type: expenseToEdit.type || 'expense'
      });
      setItems(expenseToEdit.items || []);
      setPreviewUrl(null);
    } else if (initialData) {
      setFormData({
        localName: initialData.localName,
        purchaseDate: initialData.purchaseDate,
        total: initialData.total,
        category: initialData.category,
        subcategory: initialData.subcategory,
        isRecurring: initialData.isRecurring,
        paymentMethod: initialData.paymentMethod,
        recurrenceFrequency: initialData.recurrenceFrequency,
        type: initialData.type || 'expense'
      });
      setItems(initialData.items || []);
    } else {
      resetForm();
    }
  }, [expenseToEdit, initialData, isOpen, resetForm]);

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

  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const activeCategories = formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleCategoryChange = (newCategory: string) => {
    setFormData(prev => ({ ...prev, category: newCategory, subcategory: '' }));
  };

  useEffect(() => {
    if (formData.category && activeCategories[formData.category]) {
      setSubcategories(activeCategories[formData.category]);
    } else {
      setSubcategories([]);
    }
  }, [formData.category, formData.type, activeCategories]);

  const handleTypeChange = (newType: 'expense' | 'income') => {
      setFormData(prev => ({ 
          ...prev, 
          type: newType, 
          category: '', 
          subcategory: '' 
      }));
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      setIsLoading(true);
      setError(null);
      try {
        const base64Image = await fileToBase64(file);
        const extractedData = await extractExpenseFromImage(base64Image);
        
        let finalTotal = 0;
        if (typeof extractedData.total === 'number' && !isNaN(extractedData.total) && extractedData.total > 0) {
            finalTotal = extractedData.total;
        }

        const finalLocalName = extractedData.localName?.trim() !== '' ? extractedData.localName : 'Despesa Escaneada';
        let finalPurchaseDate = extractedData.purchaseDate || new Date().toISOString().split('T')[0];
        
        // Garante formato correto de data
        if (!/^\d{4}-\d{2}-\d{2}$/.test(finalPurchaseDate)) {
             finalPurchaseDate = new Date().toISOString().split('T')[0];
        }

        const initialCategory = extractedData.category || '';
        const selectedCategoryKey = Object.keys(EXPENSE_CATEGORIES).includes(initialCategory) ? initialCategory : 'Outros';
        
        const validSubcategories = EXPENSE_CATEGORIES[selectedCategoryKey] || [];
        let finalSubcategory = '';
        if (validSubcategories.includes(extractedData.subcategory)) {
            finalSubcategory = extractedData.subcategory;
        } else if (validSubcategories.length > 0) {
            finalSubcategory = validSubcategories[0];
        }

        const finalPaymentMethod = PAYMENT_METHODS.includes(extractedData.paymentMethod) ? extractedData.paymentMethod : 'Outro';

        setFormData({
            localName: finalLocalName,
            purchaseDate: finalPurchaseDate,
            total: finalTotal, 
            category: selectedCategoryKey,
            subcategory: finalSubcategory,
            isRecurring: false,
            paymentMethod: finalPaymentMethod,
            type: 'expense'
        });
        setItems(Array.isArray(extractedData.items) ? extractedData.items : []);

        showToast('Notinha lida com sucesso! Revise os dados.', 'success');
        
      } catch (e) {
        const err = e as Error;
        if (err.message === 'API_NOT_ENABLED') {
            onAPISetupError();
            setPreviewUrl(null);
        } else {
            setError(err.message);
            showToast('Erro ao ler a nota. Tente tirar uma foto mais clara.', 'error');
        }
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearPreview = () => {
      setPreviewUrl(null);
  };

  const handleItemChange = (index: number, field: 'name' | 'price', value: string) => {
    const newItems = [...items];
    if (field === 'name') {
      newItems[index].name = value;
    } else {
      const rawValue = value.replace(/\D/g, '');
      newItems[index].price = rawValue ? parseInt(rawValue, 10) / 100 : 0;
    }
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotalFromItems = () => {
    const sum = items.reduce((acc, item) => acc + item.price, 0);
    setFormData(prev => ({ ...prev, total: sum }));
    showToast(`Total atualizado: ${formatCurrency(sum)}`, 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.localName.trim() || formData.total <= 0 || !formData.category || !formData.subcategory || !formData.paymentMethod) {
      const msg = 'Preencha todos os campos obrigatórios e verifique se o valor é maior que zero.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    
    setError(null);

    const expensePayload: Omit<Expense, 'id'> = {
        localName: formData.localName,
        purchaseDate: formData.purchaseDate,
        items: items.filter(i => i.name.trim() !== '' || i.price > 0),
        total: formData.total,
        category: formData.category,
        subcategory: formData.subcategory,
        isRecurring: formData.isRecurring,
        paymentMethod: formData.paymentMethod,
        type: formData.type
    };

    if (formData.isRecurring && formData.recurrenceFrequency) {
        expensePayload.recurrenceFrequency = formData.recurrenceFrequency;
    }

    onSaveExpense(expensePayload, expenseToEdit?.id);
    handleClose();
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
    setFormData(prev => ({ ...prev, total: numericValue }));
  };
  
  if (!isOpen) return null;
  
  const inputClasses = "w-full p-3.5 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-400 placeholder-gray-400";
  const itemInputClasses = "p-2.5 bg-white text-gray-800 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] p-4" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white z-10">
            <h2 id="expense-modal-title" className="text-xl font-bold text-gray-800">
              {expenseToEdit ? 'Editar Lançamento' : (initialData ? 'Revisar Lançamento' : 'Novo Lançamento')}
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0 aspect-square" aria-label="Fechar">
                <XMarkIcon className="text-2xl" />
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50">
                {previewUrl && (
                    <div className="absolute inset-0 z-0 opacity-20 bg-cover bg-center blur-sm scale-110" style={{ backgroundImage: `url(${previewUrl})` }}></div>
                )}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-blue-900 font-bold text-lg animate-pulse">Analisando Imagem...</p>
                <p className="text-sm text-blue-600/80">Identificando itens, valores e local.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex bg-gray-100 p-1 rounded-2xl mb-6 shadow-inner">
                  <button 
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <span className="material-symbols-outlined text-lg">arrow_downward</span>
                      Despesa
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <span className="material-symbols-outlined text-lg">arrow_upward</span>
                      Receita
                  </button>
              </div>

              {previewUrl && (
                  <div className="mb-6 relative group animate-fade-in">
                      <div className="w-full h-40 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative">
                          <img src={previewUrl} alt="Recibo" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                      </div>
                      <button 
                        onClick={handleClearPreview}
                        className="absolute top-2 right-2 bg-white/90 text-red-500 p-1.5 rounded-full shadow-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Remover imagem"
                      >
                          <TrashIcon className="text-lg" />
                      </button>
                  </div>
              )}

              {!expenseToEdit && !initialData && !previewUrl && formData.type === 'expense' && (
                <div className="mb-6">
                    <button onClick={handleScanClick} className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 font-bold rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all shadow-sm group active:scale-[0.98]">
                        <div className="bg-white w-10 h-10 flex items-center justify-center rounded-full shadow-sm group-hover:scale-110 transition-transform">
                          <CameraIcon className="text-xl" />
                        </div>
                        Escanear Nota Fiscal (IA)
                    </button>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-4 text-sm rounded-xl flex items-center gap-2"><span className="material-symbols-outlined">error</span>{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">
                            {formData.type === 'income' ? 'Origem' : 'Local'}
                        </label>
                        <input type="text" placeholder={formData.type === 'income' ? "Ex: Salário" : "Ex: Supermercado"} value={formData.localName} onChange={e => setFormData({...formData, localName: e.target.value})} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Data</label>
                        <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className={inputClasses} required />
                    </div>
                </div>

                {(formData.type === 'expense' || items.length > 0) && (
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Itens ({items.length})</label>
                       <button type="button" onClick={handleAddItem} className="text-blue-600 text-xs font-bold hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center justify-center">
                          <PlusIcon className="text-sm mr-1"/> Adicionar
                       </button>
                    </div>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {items.length === 0 && <p className="text-center text-xs text-gray-400 py-2">Nenhum item.</p>}
                        {items.map((item, index) => (
                          <div key={index} className="flex gap-2 items-center animate-fade-in">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                              placeholder="Item"
                              className={`flex-1 ${itemInputClasses}`}
                            />
                            <input
                              type="text"
                              inputMode="decimal"
                              value={formatCurrency(item.price)}
                              onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                              className={`w-24 text-right ${itemInputClasses}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-gray-400 hover:text-red-500 w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <TrashIcon className="text-base" />
                            </button>
                          </div>
                        ))}
                    </div>
                    
                    {items.length > 0 && (
                      <div className="mt-3 flex justify-end">
                        <button 
                          type="button" 
                          onClick={calculateTotalFromItems} 
                          className="text-xs flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                        >
                          <CalculateIcon className="text-sm"/> Somar no Total
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Categoria</label>
                        <select value={formData.category} onChange={e => handleCategoryChange(e.target.value)} className={`${inputClasses} appearance-none`} required>
                            <option value="" disabled>Selecione</option>
                            {Object.keys(activeCategories).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <span className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400 material-symbols-outlined text-lg">expand_more</span>
                    </div>
                    <div className="relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Subcategoria</label>
                        <select value={formData.subcategory} onChange={e => setFormData({...formData, subcategory: e.target.value})} className={`${inputClasses} appearance-none`} disabled={!formData.category} required>
                            <option value="" disabled>Selecione</option>
                            {subcategories.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                        <span className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400 material-symbols-outlined text-lg">expand_more</span>
                    </div>
                </div>
                 <div className="relative">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Pagamento</label>
                    <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className={`${inputClasses} appearance-none`} required>
                        <option value="" disabled>Selecione</option>
                        {PAYMENT_METHODS.map(method => (
                            <option key={method} value={method}>{method}</option>
                        ))}
                    </select>
                    <span className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400 material-symbols-outlined text-lg">expand_more</span>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Valor Total</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-bold text-lg">R$</span>
                      <input 
                        type="text"
                        inputMode="decimal" 
                        placeholder="0,00" 
                        value={formatCurrency(formData.total).replace('R$', '').trim()} 
                        onChange={handleTotalChange} 
                        className={`pl-12 ${inputClasses} font-bold text-xl tracking-tight ${formData.type === 'income' ? 'text-green-600' : 'text-red-600'}`} 
                        required 
                      />
                    </div>
                </div>
                <div className="flex items-center space-x-3 pt-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <input 
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData(prev => ({...prev, isRecurring: e.target.checked}))}
                        className={`w-5 h-5 rounded focus:ring-2 ${formData.type === 'income' ? 'text-green-600' : 'text-blue-600'}`}
                    />
                    <label className="text-sm font-semibold text-gray-700">
                        {formData.type === 'income' ? 'Receita Recorrente' : 'Despesa Recorrente'}
                    </label>
                </div>
                {formData.isRecurring && (
                    <div className="animate-fade-in relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Frequência</label>
                        <select 
                            value={formData.recurrenceFrequency || ''} 
                            onChange={e => setFormData({...formData, recurrenceFrequency: e.target.value as any})} 
                            className={`${inputClasses} appearance-none`}
                            required={formData.isRecurring}
                        >
                            <option value="" disabled>Selecione</option>
                            <option value="monthly">Mensalmente</option>
                            <option value="weekly">Semanalmente</option>
                            <option value="annually">Anualmente</option>
                        </select>
                        <span className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400 material-symbols-outlined text-lg">expand_more</span>
                    </div>
                )}
              </form>
            </>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 z-10">
            <button onClick={handleSubmit} disabled={isLoading} className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg hover:-translate-y-0.5 ${formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {isLoading ? 'Processando...' : 'Salvar'}
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
