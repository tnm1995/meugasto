import React, { useState, useEffect, useCallback } from 'react';
import type { User } from './types';
import { DEFAULT_PROFILE_IMAGE, DEFAULT_REMINDER_SETTINGS } from './types';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { MainAppContent } from './components/MainAppContent';
import { ThankYouPage } from './components/ThankYouPage'; 
import { auth, db, firebaseInitialized, firebaseInitializationError } from './services/firebaseService'; 
// @ts-ignore
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal'; 
import { TermsOfServiceModal } from './components/TermsOfServiceModal'; 
import { SupportChatModal } from './components/SupportChatModal'; 
import { ChatBubbleIcon } from './components/Icons'; 
import { logout } from './services/authService'; 
import { AnimatePresence, motion } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); 
  const [expirationWarning, setExpirationWarning] = useState<{ show: boolean; days: number }>({ show: false, days: 0 });

  // Modal States Globais
  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState(false);
  const [isTermsOfServiceModalOpen, setIsTermsOfServiceModalOpen] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false); // Chat global
  
  const navigate = useNavigate();
  const location = useLocation();

  // Heartbeat para Status Online
  useEffect(() => {
    if (!currentUser?.uid) return;

    const updatePresence = async () => {
        try {
            // Atualiza documento do USUÁRIO (para lista de usuários no Admin)
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { 
                lastSeen: serverTimestamp() 
            });

            // Tenta atualizar também o ticket para o chat, se existir (sem criar erro se não existir)
            const ticketRef = doc(db, 'tickets', currentUser.uid);
            updateDoc(ticketRef, { userLastActive: serverTimestamp() }).catch(() => {});
        } catch (e) {
            console.error("Error updating presence:", e);
        }
    };

    // Atualiza imediatamente e depois a cada 60s
    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    return () => clearInterval(interval);
  }, [currentUser?.uid]);

  const validateUserSession = useCallback(async (uid: string, isPeriodicCheck: boolean = false) => {
    if (!isPeriodicCheck) setIsLoadingAuth(true);
    setExpirationWarning({ show: false, days: 0 });

    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        let userData: User;

        if (docSnap.exists()) {
            userData = { ...docSnap.data(), uid } as User;
        } else {
            userData = {
                uid: uid,
                name: auth.currentUser?.displayName || 'Usuário',
                email: auth.currentUser?.email || '',
                role: 'user',
                status: 'active',
                profileImage: DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS,
                createdAt: new Date().toISOString(),
                subscriptionExpiresAt: null
            };
        }

        if (userData.status === 'blocked') {
            await auth.signOut();
            setCurrentUser(null);
            navigate('/');
            if (!isPeriodicCheck) alert("Sua conta está bloqueada. Entre em contato com o administrador.");
            setIsLoadingAuth(false);
            return;
        }

        if (userData.role !== 'admin' && userData.subscriptionExpiresAt) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); 

            const [year, month, day] = userData.subscriptionExpiresAt.split('-').map(Number);
            const expiryDate = new Date(year, month - 1, day);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                // Usuário Expirado
                setCurrentUser({
                    ...userData,
                    role: userData.role || 'user',
                    status: userData.status || 'active'
                });
                navigate('/expirado'); // Redireciona para página de expirado
                setIsLoadingAuth(false);
                return; 
            } else if (diffDays <= 5) {
                setExpirationWarning({ show: true, days: diffDays });
            }
        }

        setCurrentUser({
            ...userData,
            role: userData.role || 'user',
            status: userData.status || 'active'
        });
        
        if (!isPeriodicCheck) {
             const publicRoutes = ['/login', '/cadastro', '/obrigado', '/', '/termos', '/privacidade'];
             if (publicRoutes.includes(location.pathname)) {
                 navigate('/app/dashboard');
             }
        }

    } catch (error) {
        console.error("Erro ao validar sessão:", error);
        if (!isPeriodicCheck) {
             navigate('/');
             setCurrentUser(null);
        }
    } finally {
        if (!isPeriodicCheck) setIsLoadingAuth(false);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!firebaseInitialized) {
        setIsLoadingAuth(false);
        return;
    }
    if (!auth) {
        setIsLoadingAuth(false);
        return;
    }

    try {
        const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
          if (user) {
            await validateUserSession(user.uid);
          } else {
            setCurrentUser(null);
            setIsLoadingAuth(false);
            // Se estiver tentando acessar área privada sem logar, vai para home
            if (location.pathname.startsWith('/app')) {
                navigate('/');
            }
          }
        }, (error: any) => {
            console.error("Auth State Change Error:", error);
            setIsLoadingAuth(false);
        });

        return () => unsubscribe(); 
    } catch (e) {
        console.error("Critical Auth Error:", e);
        setIsLoadingAuth(false);
    }
  }, [validateUserSession, navigate, location.pathname]);

  const handleLoginSuccess = useCallback((user: User) => {
    setIsLoadingAuth(true);
    validateUserSession(user.uid); 
  }, [validateUserSession]);

  const handleLogout = useCallback(async () => {
      if (currentUser?.uid) {
          try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, { lastSeen: new Date(0) }); 
          } catch(e) {}
      }
      
      await logout();
      setCurrentUser(null);
      navigate('/');
  }, [currentUser, navigate]);

  const handleRenewSubscription = useCallback(async () => {
      await logout();
      setCurrentUser(null);
      // Aqui idealmente passaria um estado para fazer scroll na landing page
      navigate('/');
  }, [navigate]);

  const onOpenGlobalPrivacyPolicy = useCallback(() => setIsPrivacyPolicyModalOpen(true), []);
  const onOpenGlobalTermsOfService = useCallback(() => setIsTermsOfServiceModalOpen(true), []);
  const onOpenSupportChat = useCallback(() => setIsSupportChatOpen(true), []);

  if (!firebaseInitialized || firebaseInitializationError) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-red-500 mb-6 bg-red-100 p-4 rounded-full">
                  <span className="material-symbols-outlined text-5xl">cloud_off</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro de Conexão</h1>
              <p className="text-gray-600 max-w-md mb-6">
                  Não foi possível inicializar os serviços do Firebase. Verifique sua conexão.
              </p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">
                Tentar Novamente
              </button>
          </div>
      );
  }

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium animate-pulse">Carregando...</p>
      </div>
    );
  }

  // Define se mostra botão de chat (Lógica adaptada para Router)
  const isAppRoute = location.pathname.startsWith('/app');
  const isProfileRoute = location.pathname === '/app/perfil';
  
  const showChatButton = (() => {
      const path = location.pathname;
      if (path === '/login' || path === '/cadastro' || path === '/obrigado') return false;
      if (!isAppRoute) return true; // Landing
      return true; // No app controlado por CSS abaixo
  })();

  const chatButtonVisibilityClass = isAppRoute 
      ? (isProfileRoute ? 'flex' : 'hidden md:flex') 
      : 'flex';

  return (
    <ToastProvider>
        <Routes>
            <Route path="/" element={
                <LandingPage 
                    onStart={(view) => {
                        if (view === 'privacy') setIsPrivacyPolicyModalOpen(true);
                        else if (view === 'terms') setIsTermsOfServiceModalOpen(true);
                        else navigate('/' + view);
                    }} 
                    onOpenSupport={onOpenSupportChat}
                />
            } />
            
            <Route path="/login" element={
                <Auth 
                    onLoginSuccess={handleLoginSuccess} 
                    onBack={() => navigate('/')} 
                    initialView="login" 
                />
            } />
            
            <Route path="/cadastro" element={
                <Auth 
                    onLoginSuccess={handleLoginSuccess} 
                    onBack={() => navigate('/')} 
                    initialView="register" 
                />
            } />

            <Route path="/obrigado" element={
                <ThankYouPage onContinue={() => navigate('/login')} />
            } />

            <Route path="/expirado" element={
                currentUser ? (
                    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
                            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl text-red-600">sentiment_sad</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-3">Assinatura Expirada</h2>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Olá, <span className="font-semibold">{currentUser?.name}</span>. <br/>
                                O período de acesso da sua conta encerrou. Renove sua assinatura agora.
                            </p>
                            <div className="space-y-3">
                                <button onClick={handleRenewSubscription} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined">workspace_premium</span>
                                    Renovar Agora
                                </button>
                                <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200">
                                    Sair da Conta
                                </button>
                            </div>
                        </div>
                    </div>
                ) : <Navigate to="/" replace />
            } />

            {/* Rota Protegida do APP */}
            <Route path="/app/*" element={
                currentUser ? (
                    <MainAppContent 
                        currentUser={currentUser} 
                        onOpenGlobalPrivacyPolicy={onOpenGlobalPrivacyPolicy} 
                        onOpenGlobalTermsOfService={onOpenGlobalTermsOfService} 
                        onOpenSupport={onOpenSupportChat}
                        expirationWarning={expirationWarning}
                    />
                ) : (
                    <Navigate to="/login" replace />
                )
            } />
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Modals & Chat Button */}
        <PrivacyPolicyModal isOpen={isPrivacyPolicyModalOpen} onClose={() => setIsPrivacyPolicyModalOpen(false)} />
        <TermsOfServiceModal isOpen={isTermsOfServiceModalOpen} onClose={() => setIsTermsOfServiceModalOpen(false)} />
        
        <AnimatePresence mode="wait">
            {isSupportChatOpen ? (
                <SupportChatModal 
                    key="chat-modal"
                    isOpen={isSupportChatOpen} 
                    onClose={() => setIsSupportChatOpen(false)} 
                    currentUser={currentUser} 
                />
            ) : (
                showChatButton && (
                    <motion.button 
                        key="chat-button"
                        layoutId="support-chat-container"
                        onClick={onOpenSupportChat}
                        style={{ borderRadius: "50%" }}
                        className={`fixed right-6 w-14 h-14 bg-black hover:scale-110 text-white rounded-full shadow-2xl shadow-black/40 items-center justify-center z-50 group overflow-hidden ${chatButtonVisibilityClass} ${isAppRoute ? 'bottom-24 md:bottom-6' : 'bottom-6'}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        aria-label="Abrir Suporte"
                    >
                        <div className="absolute inset-0 w-[200%] h-[200%] bg-gray-800 rounded-[40%] top-[90%] left-[-50%] z-0 liquid-wave opacity-50 pointer-events-none"></div>
                        <div className="relative z-10">
                            <ChatBubbleIcon className="text-2xl" />
                        </div>
                    </motion.button>
                )
            )}
        </AnimatePresence>
    </ToastProvider>
  );
};

export default App;