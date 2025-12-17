
import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from './Icons';
import type { Goal, Omit } from '../types';
import { CATEGORIES } from '../types';
import { useToast } from '../contexts/ToastContext';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (goal: Omit<Goal, 'id'>, idToUpdate?: string) => void;
  goalToEdit?: Goal | null;
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

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSaveGoal, goalToEdit }) => {
  const [formData, setFormData] = useState<Omit<Goal, 'id'>>({
    name: '',
    category: '',
    targetAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const resetForm = useCallback(() => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setFormData({
      name: '',
      category: '',
      targetAmount: 0,
      startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
      endDate: endOfMonth,
    });
    setError(null);
  }, []);

  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        name: goalToEdit.name,
        category: goalToEdit.category,
        targetAmount: goalToEdit.targetAmount,
        startDate: goalToEdit.startDate,
        endDate: goalToEdit.endDate,
      });
    } else {
      resetForm();
    }
  }, [goalToEdit, isOpen, resetForm]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue === '') {
      setFormData(prev => ({ ...prev, targetAmount: 0 }));
      return;
    }
    const numericValue = parseInt(rawValue, 10) / 100;
    setFormData(prev => ({ ...prev, targetAmount: numericValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category || formData.targetAmount <= 0 || !formData.startDate || !formData.endDate) {
      const msg = 'Por favor, preencha todos os campos e certifique-se que o valor da meta é maior que zero.';
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
    const goalData: Omit<Goal, 'id'> = {
      name: formData.name,
      category: formData.category,
      targetAmount: formData.targetAmount,
      startDate: formData.startDate,
      endDate: formData.endDate,
    };
    onSaveGoal(goalData, goalToEdit?.id);
    handleClose();
  };

  if (!isOpen) return null;

  const inputClasses = "w-full p-3.5 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400";

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 id="goal-modal-title" className="text-xl font-bold text-gray-800">{goalToEdit ? 'Editar Meta' : 'Adicionar Meta'}</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0 aspect-square" aria-label="Fechar">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 space-y-5">
            {error && <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2" role="alert"><span className="material-symbols-outlined text-lg">error</span>{error}</div>}
            <div>
              <label htmlFor="goalName" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Nome da Meta</label>
              <input
                id="goalName"
                type="text"
                placeholder="Ex: Gastos com Lazer"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
                required
              />
            </div>
            <div className="relative">
              <label htmlFor="goalCategory" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Categoria</label>
              <select
                id="goalCategory"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className={`${inputClasses} appearance-none`}
                required
              >
                <option value="" disabled>Selecione a Categoria</option>
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <span className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400 material-symbols-outlined text-lg">expand_more</span>
            </div>
            <div>
              <label htmlFor="goalAmount" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Valor Máximo (Meta)</label>
              <input
                id="goalAmount"
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={formatCurrency(formData.targetAmount)}
                onChange={handleAmountChange}
                className={inputClasses}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="goalStartDate" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Início</label>
                <input
                  id="goalStartDate"
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>
              <div>
                <label htmlFor="goalEndDate" className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Término</label>
                <input
                  id="goalEndDate"
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className={inputClasses}
                  required
                />
              </div>
            </div>
          </div>
          <div className="p-5 border-t border-gray-100 bg-gray-50 mt-auto">
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 transform active:scale-[0.98]">
              {goalToEdit ? 'Salvar Alterações' : 'Salvar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
