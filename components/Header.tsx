
import React from 'react';
import type { User, View } from '../types';
/**
 * Fixed import: removed unused GroupIcon and added ExpandMoreIcon which is now exported from Icons
 */
import { LogoutIcon, WalletIcon, ExpandMoreIcon } from './Icons';

interface HeaderProps {
  userProfile: User; 
  currentView: View;
  onSetView: (view: View) => void;
  onLogout: () => void;
  activeWalletName: string;
  onOpenWalletManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userProfile, currentView, onSetView, onLogout, activeWalletName, onOpenWalletManager }) => {

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
             {/* Logo mobile */}
             <button 
              onClick={() => onSetView('dashboard')} 
              className="text-2xl font-bold text-gray-800 mr-2 flex-shrink-0 focus:outline-none md:hidden flex items-center gap-2"
              aria-label="MeuGasto"
            >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-9 h-9 rounded-lg shadow-md shadow-blue-600/20 shrink-0 aspect-square flex items-center justify-center">
                  <WalletIcon className="text-xl" />
                </div>
            </button>

            <div className="flex flex-col">
                <h1 className="text-base md:text-2xl font-bold text-gray-800 whitespace-nowrap hidden md:block">
                    {getTitle()}
                </h1>
                {/* Seletor de Espaço Visível no Mobile */}
                <button 
                    onClick={onOpenWalletManager}
                    className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors md:hidden"
                >
                    <span className="material-symbols-outlined text-sm">hub</span>
                    {activeWalletName}
                    {/**
                     * Updated to use ExpandMoreIcon component instead of raw span
                     */}
                    <ExpandMoreIcon className="text-sm" />
                </button>
                {/* No Desktop mostra apenas o nome da carteira como sub-título se não for Minha Conta */}
                {activeWalletName !== 'Minha Conta' && (
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hidden md:block mt-0.5">
                        Espaço: {activeWalletName}
                    </span>
                )}
            </div>
        </div>

        <div className="flex items-center space-x-4">
          <button onClick={() => onSetView('profile')} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 aspect-square" aria-label="Ver perfil">
            <img src={userProfile.profileImage} alt="Foto de Perfil" className="w-full h-full object-cover" />
          </button>

          <button 
            onClick={onLogout} 
            className="flex md:hidden items-center text-red-600 hover:text-red-700 text-sm font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            aria-label="Sair"
          >
            <LogoutIcon className="text-xl" />
          </button>
        </div>
      </div>
    </header>
  );
};
