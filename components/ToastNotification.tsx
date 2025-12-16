
import React, { useEffect, useState } from 'react';
import type { ToastType } from '../contexts/ToastContext';
import { XMarkIcon } from './Icons'; // Reutilizando XMarkIcon

interface ToastNotificationProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ id, message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animação de entrada
    setIsVisible(true);
    // Não é necessário um timer aqui, pois o contexto já gerencia o tempo
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Espera a animação de saída antes de realmente remover do DOM
    setTimeout(() => onClose(id), 300); 
  };

  let bgColor = 'bg-blue-500';
  let borderColor = 'border-blue-700';
  let textColor = 'text-white';

  switch (type) {
    case 'success':
      bgColor = 'bg-green-500';
      borderColor = 'border-green-700';
      break;
    case 'error':
      bgColor = 'bg-red-500';
      borderColor = 'border-red-700';
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-500';
      borderColor = 'border-blue-700';
      break;
  }

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-out 
                  ${bgColor} ${borderColor} ${textColor}
                  ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      role="alert"
    >
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="ml-3 text-white opacity-75 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white rounded-full"
        aria-label="Fechar notificação"
      >
        <XMarkIcon className="text-2xl" />
      </button>
    </div>
  );
};