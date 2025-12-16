import React from 'react';
import { XMarkIcon, SparklesIcon } from './Icons';

interface APISetupErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const APISetupErrorModal: React.FC<APISetupErrorModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Link direto para a página de Credenciais do projeto específico
  const projectId = "meugasto-e6f64"; // Substitua pelo seu ID de projeto real se for diferente
  const activationLink = `https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/overview?project=${projectId}`;
  const credentialsLink = `https://console.cloud.google.com/apis/credentials?project=${projectId}`;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-[60] p-4" role="dialog" aria-modal="true" aria-labelledby="api-error-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
          <h2 id="api-error-modal-title" className="text-lg font-bold text-red-800 flex items-center gap-2">
            <span className="material-symbols-outlined">lock_person</span>
            Permissão Negada
          </h2>
          <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors" aria-label="Fechar">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 text-gray-700">
          <div className="flex flex-col items-center mb-4">
            <SparklesIcon className="text-blue-500 text-5xl mb-3" />
            <p className="text-center font-semibold text-lg text-gray-800">
              A Inteligência Artificial está indisponível.
            </p>
            <p className="text-center text-sm mt-2 text-gray-600">
              Para ler seus recibos e extratos, o Google exige que você ative a "Generative Language API" no seu projeto. Isso é uma trava de segurança padrão.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">info</span>
              Como resolver (leva 30 segundos):
            </h3>
            <ol className="list-decimal list-inside text-sm space-y-2">
              <li>
                <span className="font-semibold">Ativar a API:</span> Clique no botão abaixo. Na página do Google Cloud, clique em "ENABLE" (ATIVAR).
              </li>
              <li>
                <span className="font-semibold">Verificar sua Chave de API:</span> Após ativar, vá para a aba "Credenciais" (no menu à esquerda). Clique no Lápis (editar) da sua "Browser key".
              </li>
              <li>
                <span className="font-semibold">Permissão da Chave:</span> Em "Restrições de API", garanta que a "Generative Language API" esteja marcada (ou mude para "Não restringir chave" temporariamente). Salve as alterações.
              </li>
              <li>
                <span className="font-semibold">Aguarde:</span> Leva 1-2 minutos para as alterações se propagarem. Tente escanear novamente após esse tempo.
              </li>
            </ol>
          </div>

          <a 
            href={activationLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            aria-label="Abrir Google Cloud Console para ativar a API"
          >
            <span className="material-symbols-outlined">launch</span>
            Ativar API Agora
          </a>
          <a 
            href={credentialsLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors text-sm"
            aria-label="Abrir Google Cloud Console para verificar credenciais"
          >
            <span className="material-symbols-outlined">key</span>
            Verificar Credenciais da Chave
          </a>
        </div>
        
        <div className="p-4 border-t mt-auto text-center">
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-blue-600 font-medium" aria-label="Já ativei, fechar janela">
            Já ativei, fechar janela
          </button>
        </div>
      </div>
    </div>
  );
};