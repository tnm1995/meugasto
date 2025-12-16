
import React from 'react';
import { WalletIcon, CheckCircleIcon } from './Icons';

interface ThankYouPageProps {
  onContinue: () => void;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({ onContinue }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full text-center relative z-10 border border-gray-100">
        <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full shrink-0 aspect-square flex items-center justify-center">
                <CheckCircleIcon className="text-6xl text-green-500" />
            </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Obrigado!</h1>
        <h2 className="text-xl font-semibold text-blue-600 mb-6">Sua assinatura foi confirmada.</h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Você acaba de dar um grande passo para organizar sua vida financeira. 
          Seus recursos Premium já estão liberados. Faça login para acessar seu painel.
        </p>

        <div className="space-y-4">
          <button 
            onClick={onContinue}
            className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            Acessar minha conta
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          
        </div>
      </div>
      
      <div className="mt-8 flex items-center gap-2 opacity-60">
        <WalletIcon className="text-gray-400" />
        <span className="font-bold text-gray-500">MeuGasto</span>
      </div>
    </div>
  );
};
