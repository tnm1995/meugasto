
import React, { useState, useEffect, useCallback } from 'react';
import type { User, View } from './types';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { MainAppContent } from './components/MainAppContent';
import { ThankYouPage } from './components/ThankYouPage'; 
import { auth, db, firebaseInitialized, firebaseInitializationError } from './services/firebaseService'; 
// @ts-ignore
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore'; 
import { ToastProvider } from './contexts/ToastContext'; 
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal'; 
import { TermsOfServiceModal } from './components/TermsOfServiceModal'; 
import { SupportChatModal } from './components/SupportChatModal'; 
import { ChatBubbleIcon } from './components/Icons'; 
import { logout } from './services/authService'; 
import { AnimatePresence, motion } from 'framer-motion';

const App: React.FC = () => {
  type AppState = 'landing' | 'auth' | 'app' | 'expired' | 'thankyou'; 
  const [appState, setAppState] = useState<AppState>('landing');
  const [authInitialView, setAuthInitialView] = useState<'login' | 'register'>('login');
  const [landingScrollTarget, setLandingScrollTarget] = useState<string | null>(null); 
  
  const [authRenderKey, setAuthRenderKey] = useState(Date.now());

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); 
  const [expirationWarning, setExpirationWarning] = useState<{ show: boolean; days: number }>({ show: false, days: 0 });

  // Modal States Globais
  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState(false);
  const [isTermsOfServiceModalOpen, setIsTermsOfServiceModalOpen] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false); // Chat global
  
  // Estado local para saber a view atual dentro do App (Dashboard, Profile, etc)
  // Necessário para controlar a visibilidade do botão de chat no mobile
  const [currentAppView, setCurrentAppView] = useState<View>('dashboard');

  const safePushState = (path: string) => {
    try {
        window.history.pushState({}, '', path);
    } catch (e) {
        console.warn('History pushState failed (likely environment restriction):', e);
    }
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/login') {
        setAppState('auth');
        setAuthInitialView('login');
    } else if (path === '/cadastro') {
        setAppState('auth');
        setAuthInitialView('register');
    } else if (path === '/obrigado') {
        setAppState('thankyou');
    }

    const handlePopState = () => {
        const currentPath = window.location.pathname;
        if (currentPath === '/login') {
            setAppState('auth');
            setAuthInitialView('login');
        } else if (currentPath === '/cadastro') {
            setAppState('auth');
            setAuthInitialView('register');
        } else if (currentPath === '/obrigado') {
            setAppState('thankyou');
        } else if (currentPath === '/') {
            if (appState === 'auth' || appState === 'thankyou') {
                setAppState('landing');
            }
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [appState]);

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
                status: 'active'
            };
        }

        if (userData.status === 'blocked') {
            await auth.signOut();
            setCurrentUser(null);
            setAppState('landing');
            safePushState('/'); 
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
                setCurrentUser({
                    ...userData,
                    role: userData.role || 'user',
                    status: userData.status || 'active'
                });
                setAppState('expired');
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
             if (window.location.pathname !== '/obrigado') {
                 setAppState('app');
                 if (window.location.pathname !== '/') {
                     safePushState('/');
                 }
             }
        }

    } catch (error) {
        console.error("Erro ao validar sessão:", error);
        if (!isPeriodicCheck) {
             setAppState('landing');
             setCurrentUser(null);
        }
    } finally {
        if (!isPeriodicCheck) setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) {
        setIsLoadingAuth(false);
        return;
    }
    if (!auth) {
        console.error("Auth object is undefined.");
        setIsLoadingAuth(false);
        return;
    }

    try {
        const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
          if (user) {
            await validateUserSession(user.uid);
          } else {
            setCurrentUser(null);
            const path = window.location.pathname;
            if (path !== '/login' && path !== '/cadastro' && path !== '/obrigado') {
                setAppState('landing');
            }
            setIsLoadingAuth(false);
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
  }, [validateUserSession]);

  useEffect(() => {
    let interval: any;
    if (appState === 'app' && currentUser?.uid) {
        interval = setInterval(() => {
            console.log("Verificando status da assinatura em segundo plano...");
            validateUserSession(currentUser.uid, true);
        }, 60000);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [appState, currentUser?.uid, validateUserSession]);

  const handleLoginSuccess = useCallback((user: User) => {
    setIsLoadingAuth(true);
    validateUserSession(user.uid); 
  }, [validateUserSession]);

  const handleLogout = useCallback(async () => {
      await logout();
      setAppState('landing');
      setCurrentUser(null);
      safePushState('/'); 
  }, []);

  const handleRenewSubscription = useCallback(async () => {
      await logout();
      setLandingScrollTarget('pricing'); 
      setAppState('landing');
      setCurrentUser(null);
      safePushState('/');
  }, []);

  const handleStart = useCallback((view: 'login' | 'register' | 'privacy' | 'terms') => {
    if (view === 'privacy') {
      setIsPrivacyPolicyModalOpen(true);
      setAppState('landing'); 
    } else if (view === 'terms') {
      setIsTermsOfServiceModalOpen(true);
      setAppState('landing'); 
    } else {
      setAuthRenderKey(Date.now());
      setAuthInitialView(view);
      setAppState('auth');
      const newPath = view === 'login' ? '/login' : '/cadastro';
      safePushState(newPath);
    }
  }, []);
  
  const handleBackFromAuth = useCallback(() => {
      setAppState('landing');
      safePushState('/');
  }, []);

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
                  Não foi possível inicializar os serviços do Firebase. Verifique sua conexão com a internet ou as configurações do projeto.
              </p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
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

  // Lógica de Visibilidade do Botão de Chat
  const showChatButton = (() => {
      if (appState === 'auth' || appState === 'thankyou') return false;
      if (appState === 'landing') return true;
      if (appState === 'app') {
          // No app, comportamento específico:
          // Desktop (md): Sempre visível
          // Mobile: Visível apenas se estiver na tela de 'profile'
          return true; // Controlado via classes CSS abaixo
      }
      return false;
  })();

  // Classes dinâmicas para visibilidade
  const chatButtonVisibilityClass = appState === 'app' 
      ? (currentAppView === 'profile' ? 'flex' : 'hidden md:flex') // Mobile: só profile. Desktop: sempre.
      : 'flex'; // Landing page: sempre.

  return (
    <ToastProvider> 
      {appState === 'landing' && <LandingPage onStart={handleStart} scrollTarget={landingScrollTarget} clearScrollTarget={() => setLandingScrollTarget(null)} />}
      
      {appState === 'auth' && (
        <Auth 
            key={authRenderKey} 
            onLoginSuccess={handleLoginSuccess} 
            onBack={handleBackFromAuth} 
            initialView={authInitialView} 
        />
      )}

      {appState === 'thankyou' && (
        <ThankYouPage onContinue={() => handleStart('login')} />
      )}

      {appState === 'expired' && (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
              <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-red-600">sentiment_sad</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Assinatura Expirada</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                  Olá, <span className="font-semibold">{currentUser?.name}</span>. <br/>
                  O período de acesso da sua conta encerrou. Renove sua assinatura agora para continuar controlando suas finanças.
              </p>
              <div className="space-y-3">
                 <button onClick={handleRenewSubscription} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">workspace_premium</span>
                      Renovar Agora
                  </button>
                  <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-600 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors">
                      Sair da Conta
                  </button>
              </div>
           </div>
        </div>
      )}
      {appState === 'app' && currentUser && (
        <MainAppContent 
          key={currentUser.uid} 
          currentUser={currentUser} 
          onOpenGlobalPrivacyPolicy={onOpenGlobalPrivacyPolicy} 
          onOpenGlobalTermsOfService={onOpenGlobalTermsOfService} 
          expirationWarning={expirationWarning} 
          onOpenSupport={onOpenSupportChat} 
          onViewChange={setCurrentAppView} // Atualiza o estado local quando a navegação interna muda
        />
      )}
      {appState === 'app' && !currentUser && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">Carregando dados do usuário...</p>
        </div>
      )}

      {/* GLOBAL MODALS */}
      <PrivacyPolicyModal isOpen={isPrivacyPolicyModalOpen} onClose={() => setIsPrivacyPolicyModalOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOfServiceModalOpen} onClose={() => setIsTermsOfServiceModalOpen(false)} />
      
      {/* SUPPORT CHAT ANIMATION LOGIC */}
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
                    style={{ borderRadius: "50%" }} // Garante forma circular no morph
                    className={`fixed right-6 w-14 h-14 bg-black hover:scale-110 text-white rounded-full shadow-2xl shadow-black/40 items-center justify-center z-50 group overflow-hidden ${chatButtonVisibilityClass} ${appState === 'app' ? 'bottom-24' : 'bottom-6'}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    aria-label="Abrir Suporte"
                >
                    {/* Liquid Animation Elements - High Contrast */}
                    <div className="absolute inset-0 w-[200%] h-[200%] bg-gray-800 rounded-[40%] top-[90%] left-[-50%] z-0 liquid-wave opacity-50 pointer-events-none"></div>
                    <div className="absolute inset-0 w-[200%] h-[200%] bg-gray-700 rounded-[45%] top-[95%] left-[-50%] z-0 liquid-wave opacity-40 pointer-events-none" style={{ animationDuration: '7s' }}></div>
                    
                    <div className="relative z-10">
                        <ChatBubbleIcon className="text-2xl" />
                    </div>
                    
                    {/* Tooltip */}
                    <span className="absolute right-full mr-3 bg-black text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Suporte
                    </span>
                </motion.button>
            )
        )}
      </AnimatePresence>

    </ToastProvider>
  );
};

export default App;
