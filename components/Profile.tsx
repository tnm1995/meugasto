
import React, { useState, useCallback, useEffect } from 'react';
import type { User } from '../types';
import { PremiumIcon, ChevronRightIcon, LogoutIcon, PolicyIcon, DescriptionIcon, SupportAgentIcon, TrophyIcon, AdminPanelSettingsIcon, TrashIcon, CalendarTodayIcon, DateRangeIcon } from './Icons'; 
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
  onResetData: (period: 'all' | 'month' | 'year') => Promise<boolean>; // Atualizada assinatura
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

        // Calculate aspect ratio and resize
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
        if (!ctx) {
          return reject(new Error('Could not get canvas context.'));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to base64 with specified quality and mimeType
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};


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
  const [showDangerZone, setShowDangerZone] = useState(false); // Estado para expandir menu de dados

  const handleImageChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Formato de arquivo inválido. Por favor, selecione uma imagem (JPG, PNG, GIF).', 'error');
        setFileInputKey(Date.now()); 
        return;
      }

      const MAX_ORIGINAL_FILE_SIZE_BYTES = 5 * 1024 * 1024; 
      if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
        showToast(`A imagem original é muito grande (${Math.round(file.size / (1024 * 1024))}MB). Selecione uma imagem menor (limite de 5MB).`, 'error');
        setFileInputKey(Date.now()); 
        return;
      }

      try {
        const MAX_IMAGE_PIXELS = 512; 
        const JPEG_QUALITY = 0.4; 

        const compressedImage = await compressImage(file, MAX_IMAGE_PIXELS, MAX_IMAGE_PIXELS, JPEG_QUALITY, file.type); 
        
        const MAX_BASE64_STRING_LENGTH_BYTES = 900 * 1024; 

        if (compressedImage.length > MAX_BASE64_STRING_LENGTH_BYTES) {
          const currentSizeKB = Math.round(compressedImage.length / 1024);
          const limitKB = Math.round(MAX_BASE64_STRING_LENGTH_BYTES / 1024);
          showToast(`A imagem (${currentSizeKB}KB) ainda é muito grande após a otimização para 512x512 pixels. O limite é de ${limitKB}KB. Por favor, tente uma imagem com menos detalhes ou menor resolução original.`, 'error');
          setFileInputKey(Date.now()); 
          return;
        }

        const success = await onUpdateProfileImage(compressedImage); 

        if (success) {
          showToast('Foto de perfil atualizada com sucesso!', 'success');
        } else {
          showToast('Erro ao atualizar foto de perfil no servidor. Tente novamente.', 'error');
        }
        setFileInputKey(Date.now()); 
      } catch (error) {
        console.error('Profile Debug: Erro ao comprimir ou fazer upload da imagem:', error);
        showToast('Erro ao atualizar foto de perfil. Verifique o formato ou tente uma imagem menor.', 'error');
      }
    }
  }, [onUpdateProfileImage, showToast]);

  const handleResetClick = async (period: 'all' | 'month' | 'year') => {
    const messages = {
        'month': 'Isso apagará TODOS os lançamentos deste MÊS.',
        'year': 'Isso apagará TODOS os lançamentos deste ANO.',
        'all': 'ATENÇÃO: Isso apagará TODOS os dados da sua conta PERMANENTEMENTE.'
    };

    if (window.confirm(`${messages[period]} Tem certeza?`)) {
      setIsResetting(true);
      await onResetData(period);
      setIsResetting(false);
    }
  };

  const triggerFileInput = useCallback(() => {
    const fileInput = document.getElementById('profile-image-upload');
    if (fileInput) {
      fileInput.click();
    }
  }, []);

  const effectiveProfileImage = userProfile.profileImage || DEFAULT_PROFILE_IMAGE;
  const effectiveUserName = userProfile.name || userProfile.email?.split('@')[0] || 'Usuário';

  const levelInfo = getLevelInfo(userProfile.xp || 0);
  
  const isAdmin = userProfile.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userProfile.role);

  if (isLoading && (!userProfile || !userProfile.uid)) { 
    return (
        <div className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] text-center text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg">Carregando perfil...</p>
        </div>
    );
  }

  // Adicionado padding-bottom extra (pb-24) para garantir scroll no mobile
  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col items-center">
        <div className="relative w-28 h-28 mb-4 shrink-0 aspect-square">
          <img 
            src={effectiveProfileImage} 
            alt="Foto de Perfil" 
            className="w-full h-full rounded-full object-cover border-4 border-blue-200"
          />
          <button 
            onClick={triggerFileInput}
            className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 text-sm shadow-md hover:bg-blue-600 transition-colors shrink-0 aspect-square flex items-center justify-center"
            aria-label="Alterar foto de perfil"
          >
            <span className="material-symbols-outlined">photo_camera</span>
          </button>
          <input 
            key={fileInputKey} 
            id="profile-image-upload" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleImageChange} 
            aria-label="Upload de nova foto de perfil"
          />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{effectiveUserName}</h2>
        <p className="text-gray-500 text-sm mb-4">{userProfile.email}</p>
        
        {/* Gamification Badge in Profile */}
        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full border border-yellow-100">
            <TrophyIcon className="text-yellow-600" />
            <span className="text-sm font-bold text-yellow-800">{levelInfo.title} (Nível {levelInfo.level})</span>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-1 rounded-2xl shadow-lg">
            <button 
                onClick={onOpenAdminPanel}
                className="flex items-center justify-between w-full py-4 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <AdminPanelSettingsIcon className="text-xl" />
                    </div>
                    <div className="text-left">
                        <span className="block font-bold text-sm">Painel Administrativo</span>
                        <span className="block text-[10px] opacity-70">Gerenciar usuários e sistema</span>
                    </div>
                </div>
                <ChevronRightIcon className="text-lg opacity-70" />
            </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Configurações</h3>
        <button onClick={onManageSubscription} className="flex items-center justify-between w-full py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Gerenciar assinatura premium">
          <div className="flex items-center">
            <PremiumIcon className="text-blue-600 text-xl mr-3" />
            <span className="font-medium text-gray-700">Assinatura Premium</span>
          </div>
          <ChevronRightIcon className="text-lg text-gray-400" />
        </button>
        <button onClick={onOpenPrivacyPolicy} className="flex items-center justify-between w-full py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Ver política de privacidade">
          <div className="flex items-center">
            <PolicyIcon className="text-purple-600 text-xl mr-3" />
            <span className="font-medium text-gray-700">Política de Privacidade</span>
          </div>
          <ChevronRightIcon className="text-lg text-gray-400" />
        </button>
        <button onClick={onOpenTermsOfService} className="flex items-center justify-between w-full py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Ver termos de serviço">
          <div className="flex items-center">
            <DescriptionIcon className="text-indigo-600 text-xl mr-3" />
            <span className="font-medium text-gray-700">Termos de Serviço</span>
          </div>
          <ChevronRightIcon className="text-lg text-gray-400" />
        </button>
        <button onClick={onOpenSupport} className="flex items-center justify-between w-full py-3 px-2 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Entrar em contato com o suporte">
          <div className="flex items-center">
            <SupportAgentIcon className="text-teal-600 text-xl mr-3" />
            <span className="font-medium text-gray-700">Suporte</span>
          </div>
          <ChevronRightIcon className="text-lg text-gray-400" />
        </button>
      </div>

      {/* Seção "Gerenciamento de Dados" (Antiga Zona de Perigo Melhorada) */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <button 
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                    <span className="material-symbols-outlined text-xl">database</span>
                </div>
                <div className="text-left">
                    <h3 className="text-base font-semibold text-gray-800">Gerenciamento de Dados</h3>
                    <p className="text-xs text-gray-500">Limpar histórico e resetar conta</p>
                </div>
            </div>
            <ChevronRightIcon className={`text-gray-400 transition-transform ${showDangerZone ? 'rotate-90' : ''}`} />
        </button>

        {showDangerZone && (
            <div className="px-6 pb-6 pt-2 space-y-3 animate-fade-in bg-gray-50/50">
                <button 
                    onClick={() => handleResetClick('month')} 
                    disabled={isResetting}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
                >
                    <CalendarTodayIcon className="text-gray-400" />
                    Limpar Mês Atual
                </button>
                <button 
                    onClick={() => handleResetClick('year')} 
                    disabled={isResetting}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm text-gray-700 font-medium"
                >
                    <DateRangeIcon className="text-gray-400" />
                    Limpar Ano Atual
                </button>
                <button 
                    onClick={() => handleResetClick('all')} 
                    disabled={isResetting}
                    className="w-full flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors text-sm text-red-600 font-bold"
                >
                    <TrashIcon className="text-red-500" />
                    {isResetting ? 'Processando...' : 'Resetar Conta Completa'}
                </button>
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <button onClick={handleLogout} className="flex items-center w-full py-3 px-2 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors" aria-label="Sair da conta">
          <LogoutIcon className="text-xl mr-3" />
          Sair
        </button>
      </div>
    </div>
  );
};
