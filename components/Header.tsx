import React from 'react';
import type { User } from '../types';
import { LogoutIcon, WalletIcon } from './Icons'; 
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  userProfile: User; 
  onLogout: () => void; 
}

export const Header: React.FC<HeaderProps> = ({ userProfile, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('lancamentos')) return 'Lançamentos';
    if (path.includes('relatorios')) return 'Relatórios';
    if (path.includes('perfil')) return 'Perfil';
    if (path.includes('planejamento')) return 'Planejamento';
    if (path.includes('admin')) return 'Administração';
    return 'MeuGasto';
  };

  return (
    <header className="sticky top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm p-4 z-30 border-b border-gray-200 h-16 sm:h-20 flex items-center">
      <div className="flex justify-between items-center w-full px-2 sm:px-4">
        <div className="flex items-center gap-4">
             {/* Logo visível APENAS no mobile (md:hidden) */}
             <button 
              onClick={() => navigate('/app/dashboard')} 
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
          <button onClick={() => navigate('/app/perfil')} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 aspect-square" aria-label="Ver perfil">
            <img src={userProfile.profileImage} alt="Foto de Perfil" className="w-full h-full object-cover" />
          </button>

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