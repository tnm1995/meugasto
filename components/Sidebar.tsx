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
  AdminPanelSettingsIcon
} from './Icons';
import type { User } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  onOpenNewExpense: () => void;
  onLogout: () => void;
  userProfile: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onOpenNewExpense, 
  onLogout,
  userProfile
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: <DashboardIcon className="text-xl" /> },
    { path: '/app/lancamentos', label: 'Lançamentos', icon: <ListIcon className="text-xl" /> },
    { path: '/app/planejamento', label: 'Planejamento', icon: <TargetIcon className="text-xl" /> },
    { path: '/app/relatorios', label: 'Relatórios', icon: <ChartIcon className="text-xl" /> },
    { path: '/app/perfil', label: 'Perfil', icon: <ProfileIcon className="text-xl" /> },
  ];

  const isAdmin = userProfile.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userProfile.role);

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/app/dashboard')}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-9 h-9 rounded-lg shadow-md shadow-blue-600/20 flex items-center justify-center shrink-0">
              <WalletIcon className="text-lg" />
            </div>
            <span className="font-bold text-xl text-gray-800 tracking-tight">MeuGasto</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
        
        {/* CTA Button */}
        <button 
            onClick={onOpenNewExpense}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform active:scale-95 mb-8"
        >
            <PlusIcon className="text-xl" />
            <span>Novo Lançamento</span>
        </button>

        <div className="space-y-1">
            <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">Menu</p>
            {navItems.map((item) => (
            <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                currentPath === item.path 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
                <span className={`transition-colors ${currentPath === item.path ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {item.icon}
                </span>
                {item.label}
                {currentPath === item.path && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                )}
            </button>
            ))}

            {isAdmin && (
                <button
                    onClick={() => navigate('/app/admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    currentPath === '/app/admin' 
                        ? 'bg-purple-50 text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                    <span className={`transition-colors ${currentPath === '/app/admin' ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                        <AdminPanelSettingsIcon className="text-xl" />
                    </span>
                    Administração
                </button>
            )}
        </div>
      </nav>

      {/* Footer / User Area */}
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