import React from 'react';
import { DashboardIcon, ListIcon, ChartIcon, TargetIcon, ProfileIcon } from './Icons';
import { useNavigate, useLocation } from 'react-router-dom';

interface BottomNavItemProps {
  icon: string; 
  label: string;
  to: string; 
}

export const BottomNavItem: React.FC<BottomNavItemProps> = ({ icon, label, to }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === to;

  const IconComponent = (props: any) => {
    switch (icon) {
      case 'space_dashboard': return <DashboardIcon {...props} />;
      case 'receipt_long': return <ListIcon {...props} />;
      case 'bar_chart': return <ChartIcon {...props} />;
      case 'track_changes': return <TargetIcon {...props} />;
      case 'account_circle': return <ProfileIcon {...props} />;
      default: return <span className="material-symbols-outlined text-2xl">{icon}</span>;
    }
  };

  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center flex-1 py-2 text-sm transition-colors duration-200 ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700'}`}
      aria-current={isActive ? 'page' : undefined}
      aria-label={label}
    >
      <IconComponent className="text-2xl mb-1" />
      <span className="text-xs">{label}</span>
    </button>
  );
};