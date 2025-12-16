
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
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm p-4 z-40 border-b border-gray-200">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
             <button 
              onClick={() => onSetView('dashboard')} 
              className="text-2xl font-bold text-gray-800 mr-4 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded flex items-center gap-2"
              aria-label="MeuGasto - Voltar para o Dashboard"
            >
                {/* Logo padronizado com a Landing Page */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-10 h-10 rounded-lg shadow-md shadow-blue-600/20 shrink-0 aspect-square flex items-center justify-center">
                  <WalletIcon className="text-xl" />
                </div>
                <span className="hidden sm:inline">MeuGasto</span>
            </button>
        </div>

        {/* Section on the right for Title, Profile, and Logout */}
        <div className="flex items-center space-x-4">
          <h1 className="hidden md:block text-xl font-bold text-gray-800 whitespace-nowrap">
            {getTitle()}
          </h1>
          
          <button onClick={() => onSetView('profile')} className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 aspect-square" aria-label="Ver perfil">
            <img src={userProfile.profileImage} alt="Foto de Perfil" className="w-full h-full object-cover" />
          </button>

          <button 
            onClick={onLogout} 
            className="hidden lg:flex items-center text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
            aria-label="Sair da conta"
          >
            <LogoutIcon className="text-xl mr-1" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
};
