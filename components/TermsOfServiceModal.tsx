

import React from 'react';
import { XMarkIcon } from './Icons';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-25 backdrop-blur-sm flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="terms-of-service-modal-title">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 id="terms-of-service-modal-title" className="text-xl font-medium text-gray-800">Termos de Serviço</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar">
            <XMarkIcon className="text-2xl" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-gray-700 text-sm leading-relaxed">
          <p className="mb-4">
            Bem-vindo ao MeuGasto! Ao acessar ou usar nosso aplicativo, você concorda em cumprir e estar vinculado aos seguintes termos e condições de serviço.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">1. Aceitação dos Termos</h3>
          <p className="mb-4">
            Ao utilizar o MeuGasto, você reconhece que leu, entendeu e concorda com estes Termos de Serviço e nossa Política de Privacidade. Se você não concordar com estes termos, não utilize o aplicativo.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">2. Uso do Serviço</h3>
          <p className="mb-4">
            O MeuGasto é fornecido para seu uso pessoal e não comercial, com o objetivo de auxiliar no controle de suas finanças. Você concorda em não usar o aplicativo para fins ilegais ou não autorizados.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">3. Sua Conta</h3>
          <p className="mb-4">
            Você é responsável por manter a confidencialidade de suas informações de conta, incluindo sua senha, e por todas as atividades que ocorrem em sua conta. Você concorda em nos notificar imediatamente sobre qualquer uso não autorizado de sua conta.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">4. Conteúdo do Usuário</h3>
          <p className="mb-4">
            Você é o único responsável por todas as informações e dados (incluindo recibos e extratos) que você carrega, publica ou exibe através do serviço. Você concede ao MeuGasto uma licença mundial, não exclusiva, livre de royalties para usar, reproduzir, adaptar e distribuir esse conteúdo apenas para operar e melhorar o serviço.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">5. Assinatura e Pagamento</h3>
          <p className="mb-4">
            Alguns recursos do MeuGasto podem exigir uma assinatura paga. Ao assinar, você concorda em pagar as taxas aplicáveis e quaisquer impostos. As assinaturas são cobradas automaticamente, a menos que você as cancele antes da renovação. Consulte a página de "Assinatura Premium" no aplicativo para detalhes de planos e cancelamento.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">6. Limitação de Responsabilidade</h3>
          <p className="mb-4">
            O MeuGasto é fornecido "como está", sem garantias de qualquer tipo. Não nos responsabilizamos por perdas diretas, indiretas, incidentais ou consequenciais decorrentes do uso ou da incapacidade de usar o serviço.
          </p>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">7. Alterações nos Termos</h3>
          <p>
            Reservamo-nos o direito de modificar estes Termos a qualquer momento. Quaisquer alterações serão publicadas no aplicativo. Seu uso continuado do serviço após tais alterações constitui sua aceitação dos novos Termos.
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