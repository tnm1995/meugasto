
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { User } from '../types';
import { 
  PremiumIcon, 
  ChevronRightIcon, 
  LogoutIcon, 
  PolicyIcon, 
  DescriptionIcon, 
  SupportAgentIcon, 
  TrophyIcon, 
  AdminPanelSettingsIcon, 
  TrashIcon, 
  CalendarTodayIcon, 
  DateRangeIcon
} from './Icons'; 
import { DEFAULT_PROFILE_IMAGE, getLevelInfo } from '../types'; 
import { useToast } from '../contexts/ToastContext'; 

interface ProfileProps {
  userProfile: User; 
  handleLogout: () => void;
  onManageSubscription: () => void;
  onUpdateProfileImage: (newImage: string) => Promise<boolean>;
  isLoading: boolean;
  onOpenPrivacyPolicy: () => void;
  onOpenTermsOfService: () => void;
  onOpenSupport: () => void;
  onOpenAdminPanel: () => void;
  onResetData: (period: 'all' | 'month' | 'year') => Promise<boolean>;
}

const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number, mimeType: string = 'image/jpeg'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Context fail'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const SettingItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
  color: string;
  sublabel?: string;
}> = ({ icon, label, onClick, color, sublabel }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-all group rounded-2xl border border-transparent hover:border-gray-100"
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="font-bold text-gray-800 text-sm">{label}</p>
        {sublabel && <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{sublabel}</p>}
      </div>
    </div>
    <ChevronRightIcon className="text-gray-300 group-hover:text-gray-600 transition-colors" />
  </button>
);

export const Profile: React.FC<ProfileProps> = ({ 
  userProfile, 
  handleLogout, 
  onManageSubscription, 
  onUpdateProfileImage, 
  isLoading,
  onOpenPrivacyPolicy,
  onOpenTermsOfService,
  onOpenSupport,
  onOpenAdminPanel,
  onResetData
}) => {
  const [fileInputKey, setFileInputKey] = useState(Date.now()); 
  const { showToast } = useToast(); 
  const [isResetting, setIsResetting] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImage(file, 512, 512, 0.6); 
        const success = await onUpdateProfileImage(compressedImage); 
        if (success) showToast('Foto atualizada!', 'success');
        setFileInputKey(Date.now()); 
      } catch (error) {
        showToast('Erro ao processar imagem.', 'error');
      }
    }
  }, [onUpdateProfileImage, showToast]);

  const triggerFileInput = () => document.getElementById('profile-image-upload')?.click();

  const levelInfo = getLevelInfo(userProfile.xp || 0);
  const isAdmin = userProfile.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userProfile.role);
  
  // Lógica de Assinatura e Trial
  const isPremium = !!userProfile.subscriptionExpiresAt;
  let statusLabel = 'Gratuito';
  let statusColor = 'text-gray-600';
  let iconBg = 'bg-gray-200 text-gray-500';
  let trialDaysLeft = 0;

  if (isPremium) {
      statusLabel = 'Premium';
      statusColor = 'text-indigo-600';
      iconBg = 'bg-indigo-100 text-indigo-600';
  } else if (userProfile.createdAt) {
      // Cálculo do Trial
      const created = new Date(userProfile.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - created.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
          trialDaysLeft = 8 - diffDays; // +1 para ser inclusivo
          statusLabel = 'Teste Grátis';
          statusColor = 'text-orange-600';
          iconBg = 'bg-orange-100 text-orange-600';
      } else {
          statusLabel = 'Expirado';
          statusColor = 'text-red-600';
          iconBg = 'bg-red-100 text-red-600';
      }
  }

  if (isLoading && !userProfile.uid) { 
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p>Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LADO ESQUERDO: Card de Identidade */}
        <div className="lg:col-span-1 space-y-6">
            <section className="relative overflow-hidden bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center h-full flex flex-col items-center justify-center">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50"></div>
                
                <div className="relative z-10 flex flex-col items-center w-full">
                    <div className="relative mb-6">
                        <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden cursor-pointer shrink-0 aspect-square"
                        onClick={triggerFileInput}
                        >
                        <img src={userProfile.profileImage || DEFAULT_PROFILE_IMAGE} alt="Avatar" className="w-full h-full object-cover" />
                        </motion.div>
                        <button 
                        onClick={triggerFileInput}
                        className="absolute bottom-1 right-1 bg-blue-600 text-white w-10 h-10 rounded-full shadow-lg border-2 border-white hover:bg-blue-700 transition-colors flex items-center justify-center shrink-0 aspect-square"
                        >
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                        </button>
                        <input key={fileInputKey} id="profile-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                        {userProfile.name || 'Usuário'}
                    </h2>
                    <p className="text-gray-500 text-sm font-medium mb-6">{userProfile.email}</p>

                    <div className="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-inner w-full">
                        <div className="bg-yellow-100 text-yellow-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 aspect-square shadow-sm">
                            <TrophyIcon className="text-xl" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status da Conta</p>
                            <p className="text-sm font-extrabold text-gray-800">{levelInfo.title} <span className="text-blue-600 font-black">NV.{levelInfo.level}</span></p>
                        </div>
                    </div>

                    {/* Novo Bloco: Status da Assinatura */}
                    <div className="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 shadow-inner w-full mt-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 aspect-square shadow-sm ${iconBg}`}>
                            <PremiumIcon className="text-xl" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Assinatura</p>
                            <div className="flex flex-col">
                                <p className={`text-sm font-extrabold ${statusColor}`}>
                                    {statusLabel}
                                </p>
                                {isPremium && userProfile.subscriptionExpiresAt && (
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                        Vence em: <span className="font-bold text-gray-700">{new Date(userProfile.subscriptionExpiresAt).toLocaleDateString('pt-BR')}</span>
                                    </p>
                                )}
                                {!isPremium && trialDaysLeft > 0 && (
                                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                        Restam: <span className="font-bold text-orange-600">{trialDaysLeft} dias</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        {/* LADO DIREITO: Configurações e Gestão */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Premium Management Card */}
            <section>
                <motion.div 
                whileHover={{ y: -2 }}
                className={`relative overflow-hidden rounded-3xl p-8 shadow-lg transition-all ${isPremium ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-transparent' : 'bg-white border-2 border-dashed border-blue-200'}`}
                >
                {isPremium && <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl"></div>}
                
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="space-y-2 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <PremiumIcon className={isPremium ? 'text-yellow-400 text-2xl' : 'text-blue-600 text-2xl'} />
                            <h3 className={`font-black text-xl ${!isPremium ? 'text-gray-800' : ''}`}>
                            {isPremium ? 'Assinatura Premium' : (trialDaysLeft > 0 ? 'Período de Teste Ativo' : 'Evolua para o Premium')}
                            </h3>
                        </div>
                        <p className={`text-sm font-medium leading-relaxed max-w-md ${isPremium ? 'text-blue-100' : 'text-gray-500'}`}>
                            {isPremium 
                            ? `Sua assinatura vence em ${new Date(userProfile.subscriptionExpiresAt!).toLocaleDateString('pt-BR')}. Garanta mais tempo de acesso e evite interrupções nos seus relatórios.`
                            : (trialDaysLeft > 0 
                                ? `Você tem acesso a todos os recursos Premium por mais ${trialDaysLeft} dias. Assine agora para não perder seus dados após o teste.` 
                                : 'Seu período de teste acabou. Assine para continuar utilizando a leitura automática de notas com IA e relatórios avançados.')}
                        </p>
                    </div>
                    <button 
                    onClick={onManageSubscription}
                    className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 whitespace-nowrap min-w-[160px] ${isPremium ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                    {isPremium ? 'Renovar Agora' : 'Ver Planos'}
                    </button>
                </div>
                </motion.div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {isAdmin && (
                        <button 
                            onClick={onOpenAdminPanel}
                            className="w-full flex items-center justify-between p-6 bg-gray-900 rounded-3xl text-white shadow-xl hover:bg-black transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 aspect-square">
                                    <AdminPanelSettingsIcon className="text-2xl" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-base">Painel Administrativo</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Controle Global</p>
                                </div>
                            </div>
                            <span className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                                <ChevronRightIcon />
                            </span>
                        </button>
                    )}

                    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        <SettingItem 
                        icon={<SupportAgentIcon />} 
                        label="Suporte Especializado" 
                        sublabel="Ajuda e Atendimento"
                        color="bg-teal-500" 
                        onClick={onOpenSupport} 
                        />
                        <SettingItem 
                        icon={<PolicyIcon />} 
                        label="Privacidade" 
                        sublabel="Seus dados estão seguros"
                        color="bg-purple-500" 
                        onClick={onOpenPrivacyPolicy} 
                        />
                        <SettingItem 
                        icon={<DescriptionIcon />} 
                        label="Termos de Uso" 
                        sublabel="Contrato do serviço"
                        color="bg-indigo-500" 
                        onClick={onOpenTermsOfService} 
                        />
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-fit">
                        <button 
                        onClick={() => setShowDangerZone(!showDangerZone)}
                        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all group"
                        >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 aspect-square transition-colors ${showDangerZone ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600'}`}>
                            <span className="material-symbols-outlined text-2xl font-variation-fill">storage</span>
                            </div>
                            <div className="text-left">
                            <h3 className="text-base font-bold text-gray-800">Dados da Conta</h3>
                            <p className="text-xs text-gray-400">Limpar histórico e resetar registros</p>
                            </div>
                        </div>
                        <ChevronRightIcon className={`transition-transform duration-300 ${showDangerZone ? 'rotate-90' : ''}`} />
                        </button>

                        {showDangerZone && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="px-6 pb-6 space-y-4 bg-gray-50/50 pt-2"
                        >
                            <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => onResetData('month')} 
                                disabled={isResetting}
                                className="flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all group"
                            >
                                <CalendarTodayIcon className="text-gray-400 group-hover:text-blue-500" />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Limpar Mês</span>
                            </button>
                            <button 
                                onClick={() => onResetData('year')} 
                                disabled={isResetting}
                                className="flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all group"
                            >
                                <DateRangeIcon className="text-gray-400 group-hover:text-blue-500" />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Limpar Ano</span>
                            </button>
                            </div>
                            <button 
                            onClick={() => onResetData('all')} 
                            disabled={isResetting}
                            className="w-full flex items-center justify-center gap-3 p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 hover:bg-red-100 font-bold text-sm transition-colors shadow-sm"
                            >
                            <TrashIcon />
                            {isResetting ? 'Apagando registros...' : 'Apagar Tudo (Resetar)'}
                            </button>
                        </motion.div>
                        )}
                    </section>

                    <button 
                    onClick={handleLogout} 
                    className="w-full flex items-center justify-center gap-3 p-6 bg-white border border-gray-200 rounded-3xl text-red-600 font-black text-sm uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm active:scale-95 group"
                    >
                    <LogoutIcon className="group-hover:scale-110 transition-transform" />
                    Encerrar Sessão
                    </button>
                </div>
            </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-12 pb-8">
        MeuGasto v3.3 • Criado com excelência • 2024
      </p>
    </div>
  );
};
