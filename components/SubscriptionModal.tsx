
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon } from './Icons';
import { useSystemSettings } from '../hooks/useSystemSettings';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Plan = 'monthly' | 'annual';

const PlanOption: React.FC<{ title: string; price: string; description: string; tag?: string; isSelected: boolean; onSelect: () => void; }> = 
({ title, price, description, tag, isSelected, onSelect }) => {
    return (
        <motion.div 
            layout
            onClick={onSelect}
            whileTap={{ scale: 0.98 }}
            className={`cursor-pointer p-5 border-2 rounded-xl relative transition-colors duration-200 flex items-center justify-between group ${
                isSelected 
                ? 'border-blue-600 bg-blue-50 shadow-sm ring-1 ring-blue-600' 
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
            }`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                }`}>
                    {isSelected && <motion.div layoutId="checkmark" className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold text-lg ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>{title}</h4>
                        {tag && (
                            <span className="text-[10px] font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                                {tag}
                            </span>
                        )}
                    </div>
                    <p className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{price}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>
        </motion.div>
    );
};


export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const { pricing, loading } = useSystemSettings();

  if (!isOpen) return null;

  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const annualMonthlyEquivalent = pricing.annualPrice / 12;

  const handleSubscribe = () => {
      const link = selectedPlan === 'annual'
          ? (pricing.annualLink || 'https://pay.kirvano.com/88970249-3079-45df-8083-26c9fe4c704c')
          : (pricing.monthlyLink || 'https://pay.kirvano.com/b378387a-a4c5-418b-887d-7f5f295bb61c');
      
      window.open(link, '_blank');
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in transform transition-all">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Seja Premium</h2>
            <p className="text-xs text-gray-500">Desbloqueie todo o potencial</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white w-10 h-10 rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center shrink-0 aspect-square">
            <XMarkIcon className="text-xl" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
            <p className="text-sm text-center text-gray-600 mb-2 leading-relaxed px-2">
                Garanta acesso contínuo a leitura de notas com IA, relatórios ilimitados e backup na nuvem.
            </p>
            
            {loading ? (
                 <div className="flex justify-center py-8">
                    <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span>
                 </div>
            ) : (
                <div className="space-y-3">
                    <PlanOption 
                        title="Anual"
                        price={`${fmt(annualMonthlyEquivalent)} / mês`}
                        description={`Cobrança única de ${fmt(pricing.annualPrice)}`}
                        tag="-30% OFF"
                        isSelected={selectedPlan === 'annual'}
                        onSelect={() => setSelectedPlan('annual')}
                    />
                    <PlanOption 
                        title="Mensal"
                        price={`${fmt(pricing.monthlyPrice)} / mês`}
                        description="Cancele quando quiser"
                        isSelected={selectedPlan === 'monthly'}
                        onSelect={() => setSelectedPlan('monthly')}
                    />
                </div>
            )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/30 mt-auto">
          <button 
            onClick={handleSubscribe}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform active:scale-95 flex items-center justify-center gap-2"
          >
            Confirmar Assinatura {selectedPlan === 'annual' ? 'Anual' : 'Mensal'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
          <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[12px]">lock</span> Pagamento 100% seguro e criptografado
          </p>
        </div>
      </div>
    </div>
  );
};
