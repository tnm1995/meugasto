
import React from 'react';
import { 
  DashboardIcon, 
  ListIcon, 
  ChartIcon, 
  TargetIcon, 
  ProfileIcon, 
  PlusIcon,
  WalletIcon,
  LogoutIcon,
  AdminPanelSettingsIcon,
  GroupIcon
} from './Icons';
import type { View, User, SharedWallet } from '../types';

interface SidebarProps {
  currentView: View;
  onSetView: (view: View) => void;
  onOpenNewExpense: () => void;
  onLogout: () => void;
  userProfile: User;
  sharedWallets: SharedWallet[];
  activeWalletId: string | null;
  onSetActiveWallet: (id: string | null) => void;
  onOpenWalletManager: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onSetView, 
  onOpenNewExpense, 
  onLogout,
  userProfile,
  sharedWallets,
  activeWalletId,
  onSetActiveWallet,
  onOpenWalletManager
}) => {
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="text-xl" /> },
    { id: 'entries', label: 'Lançamentos', icon: <ListIcon className="text-xl" /> },
    { id: 'goals', label: 'Planejamento', icon: <TargetIcon className="text-xl" /> },
    { id: 'reports', label: 'Relatórios', icon: <ChartIcon className="text-xl" /> },
    { id: 'profile', label: 'Perfil', icon: <ProfileIcon className="text-xl" /> },
  ];

  const isAdmin = userProfile.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userProfile.role);

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="h-20 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSetView('dashboard')}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-9 h-9 rounded-lg shadow-md shadow-blue-600/20 flex items-center justify-center shrink-0">
              <WalletIcon className="text-lg" />
            </div>
            <span className="font-bold text-xl text-gray-800 tracking-tight">MeuGasto</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
        
        {/* Wallet Switcher Section */}
        <div className="mb-8 space-y-2">
            <div className="flex justify-between items-center px-4 mb-2">
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Espaços</p>
                <button onClick={onOpenWalletManager} className="text-blue-600 hover:text-blue-800 p-0.5"><PlusIcon className="text-sm" /></button>
            </div>
            
            <button 
                onClick={() => onSetActiveWallet(null)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeWalletId === null ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <ProfileIcon className="text-lg" />
                Minha Conta
            </button>

            {sharedWallets.map(wallet => (
                <button 
                    key={wallet.id}
                    onClick={() => onSetActiveWallet(wallet.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeWalletId === wallet.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <GroupIcon className="text-lg" />
                    <span className="truncate">{wallet.name}</span>
                </button>
            ))}
        </div>

        <div className="h-px bg-gray-100 mb-6 mx-4"></div>

        <button 
            onClick={onOpenNewExpense}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all transform active:scale-95 mb-8"
        >
            <PlusIcon className="text-xl" />
            <span>Novo Lançamento</span>
        </button>

        <div className="space-y-1">
            <p className="px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2 mt-2">Menu Principal</p>
            {navItems.map((item) => (
            <button
                key={item.id}
                onClick={() => onSetView(item.id as View)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                currentView === item.id 
                    ? 'bg-gray-50 text-blue-700 font-bold' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
                <span className={`transition-colors ${currentView === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {item.icon}
                </span>
                {item.label}
                {currentView === item.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                )}
            </button>
            ))}

            {isAdmin && (
                <button
                    onClick={() => onSetView('admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    currentView === 'admin' 
                        ? 'bg-purple-50 text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                    <span className={`transition-colors ${currentView === 'admin' ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        <AdminPanelSettingsIcon className="text-xl" />
                    </span>
                    Administração
                </button>
            )}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden shrink-0">
                <img src={userProfile.profileImage} alt="Perfil" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{userProfile.name.split(' ')[0]}</p>
                <p className="text-xs text-gray-500 truncate">{userProfile.email}</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        >
            <LogoutIcon className="text-lg" />
            Sair da Conta
        </button>
      </div>
    </aside>
  );
};
