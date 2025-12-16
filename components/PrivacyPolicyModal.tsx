

import React from 'react';
import { XMarkIcon } from './Icons';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="privacy-policy-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 id="privacy-policy-modal-title" className="text-xl font-medium text-gray-800">Política de Privacidade</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-gray-700 text-sm leading-relaxed">
          <p className="mb-4">
            A sua privacidade é de extrema importância para nós do MeuGasto. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nosso aplicativo.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Coleta de Informações</h3>
          <p className="mb-4">
            Coletamos informações que você nos fornece diretamente ao criar uma conta, como nome, e-mail e número de telefone. Também coletamos dados relacionados às suas despesas, categorias e orçamentos inseridos no aplicativo, incluindo informações extraídas de recibos e extratos bancários processados por inteligência artificial.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Uso das Informações</h3>
          <p className="mb-4">
            Utilizamos suas informações para fornecer, manter e melhorar nossos serviços, personalizar sua experiência, monitorar e analisar tendências, enviar notificações relacionadas ao serviço e cumprir obrigações legais. As informações de despesas são usadas para gerar relatórios, categorizações e insights financeiros personalizados para você.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Compartilhamento de Informações</h3>
          <p className="mb-4">
            Não compartilhamos suas informações pessoais com terceiros, exceto quando necessário para operar o serviço (por exemplo, com provedores de nuvem para armazenamento de dados), para cumprir a lei ou com seu consentimento. Dados anonimizados e agregados podem ser usados para análise e melhoria do produto.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">4. Segurança dos Dados</h3>
          <p className="mb-4">
            Empregamos medidas de segurança robustas para proteger suas informações contra acesso, alteração, divulgação ou destruição não autorizados. Isso inclui criptografia, firewalls e controles de acesso rigorosos.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">5. Seus Direitos</h3>
          <p className="mb-4">
            Você tem o direito de acessar, corrigir, atualizar ou solicitar a exclusão de suas informações pessoais. Para exercer esses direitos, entre em contato conosco através do suporte no aplicativo.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">6. Alterações na Política</h3>
          <p>
            Podemos atualizar esta política de privacidade periodicamente. Notificaremos você sobre quaisquer alterações significativas através do aplicativo ou por e-mail.
          </p>
          <p className="mt-6 text-xs text-gray-500">
            Última atualização: 10 de Julho de 2024.
          </p>
        </div>
        <div className="p-4 border-t mt-auto">
          <button onClick={onClose} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};