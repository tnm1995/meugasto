
import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from './Icons';
import type { Goal, Omit, Category } from '../types';
import { useToast } from '../contexts/ToastContext';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGoal: (goal: Omit<Goal, 'id'>, idToUpdate?: string) => void;
  goalToEdit?: Goal | null;
  categories: Category[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSaveGoal, goalToEdit, categories }) => {
  const [formData, setFormData] = useState<Omit<Goal, 'id'>>({
    name: '', category: '', targetAmount: 0, startDate: new Date().toISOString().split('T')[0], endDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const resetForm = useCallback(() => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    setFormData({
      name: '', category: '', targetAmount: 0, startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0], endDate: endOfMonth,
    });
    setError(null);
  }, []);

  useEffect(() => {
    if (goalToEdit) setFormData({ ...goalToEdit });
    else resetForm();
  }, [goalToEdit, isOpen, resetForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category || formData.targetAmount <= 0) {
      showToast('Preencha todos os campos.', 'error');
      return;
    }
    onSaveGoal(formData, goalToEdit?.id);
    onClose();
  };

  if (!isOpen) return null;
  const inputClasses = "w-full p-3.5 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{goalToEdit ? 'Editar' : 'Nova'} Meta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0 aspect-square"><XMarkIcon className="text-2xl" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome da Meta</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClasses} required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Categoria</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className={inputClasses} required>
                <option value="">Selecione</option>
                {categories.filter(c => c.type === 'expense').map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Valor Limite</label>
              <input type="text" inputMode="decimal" value={formatCurrency(formData.targetAmount).replace('R$', '').trim()} onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  setFormData({...formData, targetAmount: val ? parseInt(val, 10) / 100 : 0});
              }} className={inputClasses} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Início</label><input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className={inputClasses} required /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Término</label><input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className={inputClasses} required /></div>
            </div>
            <div className="pt-4"><button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-all active:scale-[0.98]">Salvar Meta</button></div>
        </form>
      </div>
    </div>
  );
};
