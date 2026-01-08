
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

      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-lg w-full text-center relative z-10 border border-gray-100 animate-fade-in">
        <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full shrink-0 aspect-square flex items-center justify-center shadow-sm">
                <CheckCircleIcon className="text-5xl text-green-600" />
            </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Pagamento Confirmado!</h1>
        <p className="text-gray-600 mb-8 text-lg">
          Sua assinatura Premium já está garantida. Veja como ativar seu acesso agora:
        </p>

        <div className="bg-blue-50 rounded-2xl p-6 text-left mb-8 border border-blue-100">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">info</span>
                Próximos Passos
            </h3>
            
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm mt-0.5">
                        <span className="material-symbols-outlined text-xl">login</span>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">Já tem conta?</p>
                        <p className="text-xs text-gray-600 mt-0.5">Basta fazer login. Sua assinatura será vinculada automaticamente ao seu CPF.</p>
                    </div>
                </div>

                <div className="w-full h-px bg-blue-200/50"></div>

                <div className="flex items-start gap-3">
                    <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm mt-0.5">
                        <span className="material-symbols-outlined text-xl">person_add</span>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">É novo por aqui?</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                            Crie sua conta usando o <strong className="text-blue-700">mesmo CPF</strong> informado na compra para liberar seu acesso imediatamente.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onContinue}
            className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 transform hover:-translate-y-1 flex items-center justify-center gap-2"
          >
            Acessar / Criar Conta
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
