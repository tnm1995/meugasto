
import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from './Icons';
import type { Budget, Omit } from '../types';
// FIX: Corrected import syntax from `=>` to `from`.
import { CATEGORIES } from '../types';
import { useToast } from '../contexts/ToastContext'; // Importa useToast

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBudget: (budget: Omit<Budget, 'id'>, idToUpdate?: string) => void;
  budgetToEdit?: Budget | null; // Optional prop for editing
}

const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSaveBudget, budgetToEdit }) => {
  const [formData, setFormData] = useState<Omit<Budget, 'id'>>({
    category: '',
    amount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast(); // Hook para mostrar toasts

  const resetForm = useCallback(() => {
    setFormData({
      category: '',
      amount: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
    setError(null);
  }, []);

  useEffect(() => {
    if (budgetToEdit) {
      setFormData({
        category: budgetToEdit.category,
        amount: budgetToEdit.amount,
        startDate: budgetToEdit.startDate,
        endDate: budgetToEdit.endDate,
      });
    } else {
      resetForm();
    }
  }, [budgetToEdit, isOpen, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setFormData(prev => ({ ...prev, amount: 0 }));
      return;
    }
    const numericValue = parseInt(rawValue, 10) / 100;
    setFormData(prev => ({ ...prev, amount: numericValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || formData.amount <= 0 || !formData.startDate || !formData.endDate) {
      const msg = 'Por favor, preencha todos os campos e certifique-se que o valor do orçamento é maior que zero.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
        const msg = 'A data de início não pode ser posterior à data de término.';
        setError(msg);
        showToast(msg, 'error');
        return;
    }

    setError(null);
    const budgetData: Omit<Budget, 'id'> = {
        category: formData.category,
        amount: formData.amount,
        startDate: formData.startDate,
        endDate: formData.endDate,
    };
    onSaveBudget(budgetData, budgetToEdit?.id);
    handleClose();
  };

  if (!isOpen) return null;

  const inputClasses = "w-full p-3.5 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400";

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 id="budget-modal-title" className="text-xl font-bold text-gray-800">{budgetToEdit ? 'Editar Orçamento' : 'Adicionar Orçamento'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors" aria-label="Fechar">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 space-y-5">
            {error && <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2" role="alert"><span className="material-symbols-outlined text-lg">error</span>{error}</div>}
            <div className="relative">
              <label htmlFor="budgetCategory" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Categoria</label>
              <select
                id="budgetCategory"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className={`${inputClasses} appearance-none`}
                required
                aria-required="true"
                aria-invalid={!formData.category && error ? "true" : "false"}
              >
                <option value="" disabled>Selecione a Categoria</option>
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400 material-symbols-outlined text-lg">expand_more</span>
            </div>
            <div>
              <label htmlFor="budgetAmount" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Valor do Orçamento</label>
              <input
                id="budgetAmount"
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={formatCurrency(formData.amount)}
                onChange={handleAmountChange}
                className={inputClasses}
                required
                aria-required="true"
                aria-invalid={formData.amount <= 0 && error ? "true" : "false"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="budgetStartDate" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Início</label>
                    <input
                        id="budgetStartDate"
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                        className={inputClasses}
                        required
                        aria-required="true"
                        aria-invalid={!formData.startDate && error ? "true" : "false"}
                    />
                </div>
                <div>
                    <label htmlFor="budgetEndDate" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Término</label>
                    <input
                        id="budgetEndDate"
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                        className={inputClasses}
                        required
                        aria-required="true"
                        aria-invalid={!formData.endDate && error ? "true" : "false"}
                    />
                </div>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 bg-gray-50 mt-auto">
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 transform active:scale-[0.98]"
                    aria-label={budgetToEdit ? "Salvar alterações do orçamento" : "Adicionar novo orçamento"}>
              {budgetToEdit ? 'Salvar Alterações' : 'Salvar Orçamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
