
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Expense, Omit, Category } from '../types';
import { extractExpenseFromImage } from '../services/geminiService'; 
import { CameraIcon, XMarkIcon, TrashIcon, PlusIcon, CalculateIcon } from './Icons';
import { PAYMENT_METHODS } from '../types';
import { useToast } from '../contexts/ToastContext';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: Omit<Expense, 'id'>, idToUpdate?: string) => void;
  expenseToEdit?: Expense | null;
  initialData?: Omit<Expense, 'id'> | null;
  onAPISetupError: () => void;
  categories: Category[];
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSaveExpense, expenseToEdit, initialData, onAPISetupError, categories }) => {
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
    setFormData({ localName: '', purchaseDate: new Date().toISOString().split('T')[0], total: 0, category: '', subcategory: '', isRecurring: false, paymentMethod: '', type: 'expense' });
    setItems([]); setError(null); setIsLoading(false); setSubcategories([]); setPreviewUrl(null);
  }, []);

  const activeCategoriesList = categories.filter(c => c.type === formData.type);

  useEffect(() => {
    if (expenseToEdit) {
      setFormData({ ...expenseToEdit, type: expenseToEdit.type || 'expense' });
      setItems(expenseToEdit.items || []);
    } else if (initialData) {
      setFormData({ ...initialData, type: initialData.type || 'expense' });
      setItems(initialData.items || []);
    } else resetForm();
  }, [expenseToEdit, initialData, isOpen, resetForm]);

  useEffect(() => {
    const cat = activeCategoriesList.find(c => c.name === formData.category);
    setSubcategories(cat ? cat.subcategories : []);
  }, [formData.category, formData.type, categories]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setIsLoading(true);
      try {
        const base64Image = await fileToBase64(file);
        const extractedData = await extractExpenseFromImage(base64Image, categories);
        
        setFormData(prev => ({
            ...prev,
            localName: extractedData.localName,
            purchaseDate: extractedData.purchaseDate,
            total: extractedData.total,
            category: extractedData.category,
            subcategory: extractedData.subcategory,
            paymentMethod: extractedData.paymentMethod
        }));
        setItems(extractedData.items);
        showToast('Nota lida com sucesso!', 'success');
      } catch (e: any) {
        if (e.message === 'API_NOT_ENABLED') onAPISetupError();
        else showToast(e.message, 'error');
        setPreviewUrl(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, total: val ? parseInt(val, 10) / 100 : 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.localName.trim() || formData.total <= 0 || !formData.category || !formData.subcategory) {
      showToast('Preencha todos os campos.', 'error');
      return;
    }
    onSaveExpense({ ...formData, items: items.filter(i => i.name || i.price > 0) }, expenseToEdit?.id);
    onClose();
  };

  if (!isOpen) return null;
  const inputClasses = "w-full p-3.5 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
            <h2 className="text-xl font-bold text-gray-800">{expenseToEdit ? 'Editar' : 'Novo'} Lançamento</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0 aspect-square"><XMarkIcon className="text-2xl" /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-4 font-bold text-gray-700">IA analisando sua nota...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-gray-100 p-1 rounded-2xl mb-2 shadow-inner">
                  <button type="button" onClick={() => setFormData({...formData, type:'expense', category:''})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Despesa</button>
                  <button type="button" onClick={() => setFormData({...formData, type:'income', category:''})} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${formData.type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Receita</button>
              </div>

              {!expenseToEdit && !previewUrl && formData.type === 'expense' && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full p-4 bg-blue-50 border border-blue-100 text-blue-700 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-100 transition-all">
                    <CameraIcon className="text-xl" /> Escanear Nota Fiscal
                </button>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome/Local</label>
                  <input type="text" value={formData.localName} onChange={e => setFormData({...formData, localName: e.target.value})} className={inputClasses} required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Data</label>
                  <input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} className={inputClasses} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Categoria</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, subcategory: ''})} className={inputClasses} required>
                    <option value="">Selecione</option>
                    {activeCategoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Subcategoria</label>
                  <select value={formData.subcategory} onChange={e => setFormData({...formData, subcategory: e.target.value})} className={inputClasses} disabled={!formData.category} required>
                    <option value="">Selecione</option>
                    {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Valor Total</label>
                <input type="text" inputMode="decimal" value={formatCurrency(formData.total).replace('R$', '').trim()} onChange={handleTotalChange} className={`${inputClasses} font-bold text-lg ${formData.type === 'income' ? 'text-green-600' : 'text-red-600'}`} required />
              </div>

              <div className="relative">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Forma de Pagamento</label>
                  <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className={inputClasses} required>
                    <option value="">Selecione</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
              </div>
            </form>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 bg-gray-50 shrink-0">
            <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98]">
                Salvar Lançamento
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
