
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, View } from './types';
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
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false); 
  
  const [currentAppView, setCurrentAppView] = useState<View>('dashboard');

  // Ref para evitar loops de processamento em transições rápidas
  const processingAuth = useRef(false);

  const safePushState = (path: string) => {
    try {
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
    } catch (e) {
        console.warn('History pushState failed:', e);
    }
  };

  // Helper para verificar expiração/assinatura ausente de forma síncrona
  const checkIsExpired = useCallback((userData: User | null): boolean => {
    if (!userData) return false;
    // Admins não expiram
    if (['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userData.role)) return false;
    
    // Se não tem data de expiração, é tratado como não assinado/expirado (a menos que seja free tier, mas aqui o app é pago)
    if (!userData.subscriptionExpiresAt) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const [year, month, day] = userData.subscriptionExpiresAt.split('-').map(Number);
    const expiryDate = new Date(year, month - 1, day);
    return expiryDate < today;
  }, []);

  // Monitor de presença
  useEffect(() => {
    if (appState !== 'app' || !currentUser?.uid || !currentUser?.createdAt) return;

    const updatePresence = async () => {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { lastSeen: serverTimestamp() });
            const ticketRef = doc(db, 'tickets', currentUser.uid);
            updateDoc(ticketRef, { userLastActive: serverTimestamp() }).catch(() => {});
        } catch (e) {
            if (!(e as any).message?.includes('No document to update')) {
                console.error("Presence error:", e);
            }
        }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, [appState, currentUser?.uid, currentUser?.createdAt]);

  // Gerenciador de Rotas e Sincronização de Estado
  useEffect(() => {
    const handleNavigation = () => {
        const path = window.location.pathname;
        
        if (path === '/login') {
            setAppState('auth');
            setAuthInitialView('login');
        } else if (path === '/cadastro') {
            setAppState('auth');
            setAuthInitialView('register');
        } else if (path === '/obrigado') {
            setAppState('thankyou');
        } else if (path === '/') {
            // Se o usuário já estiver logado e na landing, mas não estiver expirado, manda pro app
            if (currentUser && !checkIsExpired(currentUser)) {
                setAppState('app');
                safePushState('/dashboard');
            } else {
                setAppState('landing');
            }
        } else if (['/dashboard', '/lancamentos', '/relatorios', '/perfil', '/planejamento', '/admin'].includes(path)) {
            if (currentUser) {
                if (checkIsExpired(currentUser)) {
                    setAppState('expired');
                } else {
                    setAppState('app');
                }
            } else if (!isLoadingAuth) {
                // Se não tem user e tentou entrar em rota protegida, volta pra landing
                setAppState('landing');
                safePushState('/');
            }
        }
    };

    handleNavigation();
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, [currentUser, isLoadingAuth, checkIsExpired]);

  const validateUserSession = useCallback(async (uid: string, isPeriodicCheck: boolean = false) => {
    if (processingAuth.current && !isPeriodicCheck) return;
    if (!isPeriodicCheck) {
        setIsLoadingAuth(true);
        processingAuth.current = true;
    }

    setExpirationWarning({ show: false, days: 0 });

    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        let userData: User;

        if (docSnap.exists()) {
            userData = { ...docSnap.data(), uid } as User;
        } else {
            const isAuthPath = window.location.pathname === '/login' || window.location.pathname === '/cadastro';
            if (isAuthPath) {
                setIsLoadingAuth(false);
                processingAuth.current = false;
                return;
            }

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
            setAppState('landing');
            safePushState('/'); 
            if (!isPeriodicCheck) alert("Sua conta está bloqueada.");
            setIsLoadingAuth(false);
            processingAuth.current = false;
            return;
        }

        const isExpired = checkIsExpired(userData);
        setCurrentUser(userData);

        if (isExpired) {
            setAppState('expired');
            setIsLoadingAuth(false);
            processingAuth.current = false;
            return; 
        }

        // Aviso de expiração próxima (5 dias)
        if (userData.subscriptionExpiresAt && !['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userData.role)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [year, month, day] = userData.subscriptionExpiresAt.split('-').map(Number);
            const expiryDate = new Date(year, month - 1, day);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays <= 5) {
                setExpirationWarning({ show: true, days: diffDays });
            }
        }
        
        if (!isPeriodicCheck) {
             const path = window.location.pathname;
             if (path !== '/obrigado') {
                 setAppState('app');
                 const validAppPaths = ['/dashboard', '/lancamentos', '/relatorios', '/perfil', '/planejamento', '/admin'];
                 if (path === '/' || path === '/login' || path === '/cadastro' || !validAppPaths.includes(path)) {
                     safePushState('/dashboard');
                 }
             }
        }

    } catch (error) {
        console.error("Session validation error:", error);
        if (!isPeriodicCheck) {
             setAppState('landing');
             setCurrentUser(null);
        }
    } finally {
        if (!isPeriodicCheck) {
            setIsLoadingAuth(false);
            processingAuth.current = false;
        }
    }
  }, [checkIsExpired]);

  useEffect(() => {
    if (!firebaseInitialized || !auth) {
        setIsLoadingAuth(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      const path = window.location.pathname;
      const isAuthPath = path === '/login' || path === '/cadastro';

      if (user) {
        // Só valida automaticamente se não estiver no meio de um processo de login/cadastro manual
        if (!isAuthPath || appState === 'app') {
            await validateUserSession(user.uid);
        } else {
            setIsLoadingAuth(false);
        }
      } else {
        setCurrentUser(null);
        if (!isAuthPath && path !== '/obrigado') {
            setAppState('landing');
        }
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe(); 
  }, [validateUserSession, appState]);

  const handleLoginSuccess = useCallback((user: User) => {
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
      setAppState('landing');
      safePushState('/'); 
  }, [currentUser]);

  const handleRenewSubscription = useCallback(async () => {
      await logout();
      setLandingScrollTarget('pricing'); 
      setCurrentUser(null);
      setAppState('landing');
      safePushState('/');
  }, []);

  const handleStart = useCallback((view: 'login' | 'register' | 'privacy' | 'terms') => {
    if (view === 'privacy') {
      setIsPrivacyPolicyModalOpen(true);
    } else if (view === 'terms') {
      setIsTermsOfServiceModalOpen(true);
    } else {
      setAuthRenderKey(Date.now());
      setAuthInitialView(view);
      setAppState('auth');
      safePushState(view === 'login' ? '/login' : '/cadastro');
    }
  }, []);
  
  const handleBackFromAuth = useCallback(() => {
      setAppState('landing');
      safePushState('/');
  }, []);

  if (!firebaseInitialized || firebaseInitializationError) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-red-500 mb-6 bg-red-100 p-4 rounded-full">
                  <span className="material-symbols-outlined text-5xl">cloud_off</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Erro de Conexão</h1>
              <p className="text-gray-600 max-w-md mb-6">Não foi possível inicializar os serviços.</p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md">Tentar Novamente</button>
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

  const showChatButton = appState !== 'auth' && appState !== 'thankyou';
  const chatButtonVisibilityClass = appState === 'app' && currentAppView !== 'profile' ? 'hidden md:flex' : 'flex';

  return (
    <ToastProvider> 
      <AnimatePresence mode="wait">
        {appState === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LandingPage 
                    onStart={handleStart} 
                    scrollTarget={landingScrollTarget} 
                    clearScrollTarget={() => setLandingScrollTarget(null)} 
                    onOpenSupport={() => setIsSupportChatOpen(true)}
                />
            </motion.div>
        )}
        
        {appState === 'auth' && (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Auth 
                    key={authRenderKey} 
                    onLoginSuccess={handleLoginSuccess} 
                    onBack={handleBackFromAuth} 
                    initialView={authInitialView} 
                />
            </motion.div>
        )}

        {appState === 'thankyou' && (
            <motion.div key="thankyou" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ThankYouPage onContinue={() => handleStart('login')} />
            </motion.div>
        )}

        {appState === 'expired' && (
            <motion.div key="expired" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl">event_busy</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Assinatura Expirada</h2>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                      Sua assinatura encerrou ou sua conta ainda não possui um plano ativo. 
                      Para continuar utilizando o MeuGasto, escolha um plano.
                  </p>
                  <div className="space-y-3">
                     <button onClick={handleRenewSubscription} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">Ver Planos de Acesso</button>
                      <button onClick={handleLogout} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-xl transition-all">Sair da Conta</button>
                  </div>
               </div>
            </motion.div>
        )}
        
        {appState === 'app' && currentUser && (
            <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MainAppContent 
                    currentUser={currentUser} 
                    onOpenGlobalPrivacyPolicy={() => setIsPrivacyPolicyModalOpen(true)} 
                    onOpenGlobalTermsOfService={() => setIsTermsOfServiceModalOpen(true)} 
                    expirationWarning={expirationWarning} 
                    onOpenSupport={() => setIsSupportChatOpen(true)} 
                    onViewChange={setCurrentAppView} 
                />
            </motion.div>
        )}
      </AnimatePresence>

      <PrivacyPolicyModal isOpen={isPrivacyPolicyModalOpen} onClose={() => setIsPrivacyPolicyModalOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOfServiceModalOpen} onClose={() => setIsTermsOfServiceModalOpen(false)} />
      
      <AnimatePresence>
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
                    onClick={() => setIsSupportChatOpen(true)}
                    className={`fixed right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl items-center justify-center z-50 ${chatButtonVisibilityClass} ${appState === 'app' ? 'bottom-24 md:bottom-6' : 'bottom-6'}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                >
                    <ChatBubbleIcon className="text-2xl" />
                </motion.button>
            )
        )}
      </AnimatePresence>
    </ToastProvider>
  );
};

export default App;
