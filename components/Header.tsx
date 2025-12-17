
import React from 'react';
import type { User, View } from '../types';
import { LogoutIcon, WalletIcon } from './Icons'; // Importa ícones

interface HeaderProps {
  userProfile: User; 
  currentView: View;
  onSetView: (view: View) => void;
  onLogout: () => void; 
}

export const Header: React.FC<HeaderProps> = ({ userProfile, currentView, onSetView, onLogout }) => {

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'entries': return 'Lançamentos';
      case 'reports': return 'Relatórios';
      case 'profile': return 'Perfil';
      case 'goals': return 'Planejamento';
      case 'admin': return 'Administração';
      default: return 'MeuGasto';
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm p-4 z-30 border-b border-gray-200 h-16 sm:h-20 flex items-center">
      <div className="flex justify-between items-center w-full px-2 sm:px-4">
        <div className="flex items-center gap-4">
             {/* Logo visível APENAS no mobile (md:hidden) */}
             <button 
              onClick={() => onSetView('dashboard')} 
              className="text-2xl font-bold text-gray-800 mr-4 flex-shrink-0 focus:outline-none md:hidden flex items-center gap-2"
              aria-label="MeuGasto - Voltar para o Dashboard"
            >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-9 h-9 rounded-lg shadow-md shadow-blue-600/20 shrink-0 aspect-square flex items-center justify-center">
                  <WalletIcon className="text-xl" />
                </div>
                <span className="sm:inline">MeuGasto</span>
            </button>

            {/* Título da Página (Sempre visível no desktop, escondido no mobile) */}
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 whitespace-nowrap hidden md:block">
                {getTitle()}
            </h1>
        </div>

        {/* Section on the right for Profile and Logout */}
        <div className="flex items-center space-x-4">
          {/* Título removido no mobile conforme solicitado */}
          
          <button onClick={() => onSetView('profile')} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 aspect-square" aria-label="Ver perfil">
            <img src={userProfile.profileImage} alt="Foto de Perfil" className="w-full h-full object-cover" />
          </button>

          {/* Logout button hidden on desktop sidebar layout if preferred, or kept here. 
              Since Sidebar has logout, we can hide this on desktop or keep as secondary. 
              Let's keep it visible on mobile only since Sidebar covers desktop. */}
          <button 
            onClick={onLogout} 
            className="flex md:hidden items-center text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            aria-label="Sair da conta"
          >
            <LogoutIcon className="text-xl" />
          </button>
        </div>
      </div>
    </header>
  );
};
