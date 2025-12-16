
import React, { useState, useEffect } from 'react';
import { XMarkIcon, IosShareIcon, MoreVertIcon, InstallMobileIcon, PlusIcon } from './Icons';

export const InstallAppPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // 1. Verifica se já foi dispensado permanentemente
    const isDismissed = localStorage.getItem('installPromptDismissed');
    if (isDismissed) return;

    // 2. Verifica se o app já está rodando em modo standalone (PWA instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 3. Detecta a plataforma
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    // Mostra apenas em mobile
    if (isIOS) {
      setPlatform('ios');
      setShow(true);
    } else if (isAndroid) {
      setPlatform('android');
      setShow(true);
    }
  }, []);

  const handleDismiss = (forever: boolean) => {
    setShow(false);
    if (forever) {
      localStorage.setItem('installPromptDismissed', 'true');
    }
  };

  if (!show) return null;

  return (
    <div className="mb-8 bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden relative animate-fade-in mx-1 mt-2">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="p-5 relative z-10">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                    <InstallMobileIcon className="text-2xl" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg leading-tight">Instalar App</h3>
                    <p className="text-xs text-blue-600 font-semibold">Acesso rápido</p>
                </div>
            </div>
            <button 
                onClick={() => handleDismiss(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Fechar aviso"
            >
                <XMarkIcon className="text-xl" />
            </button>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-5">
            Adicione o <span className="font-bold text-gray-800">MeuGasto</span> à sua tela inicial para usar como um aplicativo nativo, sem baixar nada.
        </p>
        
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            {platform === 'ios' ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 flex items-center justify-center bg-white border border-gray-200 w-8 h-8 rounded-lg shadow-sm text-blue-600">
                    <IosShareIcon className="text-lg" />
                  </span>
                  <span>
                    1. Toque no botão <span className="font-bold">Compartilhar</span>
                  </span>
                </div>
                <div className="w-full h-px bg-gray-200"></div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 flex items-center justify-center bg-white border border-gray-200 w-8 h-8 rounded-lg shadow-sm text-gray-600">
                    <PlusIcon className="text-lg" />
                  </span>
                  <span>
                    2. Escolha <span className="font-bold whitespace-nowrap">Adicionar à Tela de Início</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 flex items-center justify-center bg-white border border-gray-200 w-8 h-8 rounded-lg shadow-sm text-gray-600">
                    <MoreVertIcon className="text-lg" />
                  </span>
                  <span>
                    1. Toque no menu do navegador
                  </span>
                </div>
                <div className="w-full h-px bg-gray-200"></div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="flex-shrink-0 flex items-center justify-center bg-white border border-gray-200 w-8 h-8 rounded-lg shadow-sm text-blue-600">
                    <InstallMobileIcon className="text-lg" />
                  </span>
                  <span>
                    2. Selecione <span className="font-bold">Adicionar à tela inicial</span>
                  </span>
                </div>
              </div>
            )}
        </div>

        <button 
            onClick={() => handleDismiss(true)}
            className="w-full mt-4 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors text-center py-2"
        >
            Não mostrar novamente
        </button>
      </div>
    </div>
  );
};
