
import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrophyIcon } from './Icons';
import type { SavingsGoal, Omit } from '../types';
import { useToast } from '../contexts/ToastContext';

interface SavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<SavingsGoal, 'id'>, idToUpdate?: string) => void;
  goalToEdit?: SavingsGoal | null;
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

export const SavingsGoalModal: React.FC<SavingsGoalModalProps> = ({ isOpen, onClose, onSave, goalToEdit }) => {
  const [formData, setFormData] = useState<Omit<SavingsGoal, 'id'>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: '',
    color: 'blue'
  });
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        name: goalToEdit.name,
        targetAmount: goalToEdit.targetAmount,
        currentAmount: goalToEdit.currentAmount,
        deadline: goalToEdit.deadline,
        color: goalToEdit.color || 'blue'
      });
    } else {
      setFormData({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        deadline: '',
        color: 'blue'
      });
    }
    setError(null);
  }, [goalToEdit, isOpen]);

  const handleCurrencyChange = (field: 'targetAmount' | 'currentAmount', value: string) => {
    const rawValue = value.replace(/\D/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) / 100 : 0;
    setFormData(prev => ({ ...prev, [field]: numericValue }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.targetAmount <= 0) {
      setError('Defina um nome e um valor alvo maior que zero.');
      return;
    }
    
    onSave(formData, goalToEdit?.id);
    onClose();
  };

  if (!isOpen) return null;

  const inputClasses = "w-full p-3.5 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 placeholder-gray-400";

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrophyIcon className="text-yellow-500" />
            {goalToEdit ? 'Editar Meta de Economia' : 'Nova Meta de Economia'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="p-6 space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
            
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Objetivo (Ex: Viagem, Carro)</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
                placeholder="Qual o seu sonho?"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Valor Alvo</label>
                    <input
                        type="text"
                        value={formatCurrency(formData.targetAmount)}
                        onChange={e => handleCurrencyChange('targetAmount', e.target.value)}
                        className={inputClasses}
                        required
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Já Guardado</label>
                    <input
                        type="text"
                        value={formatCurrency(formData.currentAmount)}
                        onChange={e => handleCurrencyChange('currentAmount', e.target.value)}
                        className={`${inputClasses} text-green-600 font-bold`}
                    />
                </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block ml-1">Data Limite (Opcional)</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50 mt-auto">
            <button type="submit" className="w-full bg-green-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 transform active:scale-[0.98]">
              {goalToEdit ? 'Atualizar Meta' : 'Criar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
