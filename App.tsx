
import React, { useState, useEffect, useCallback } from 'react';
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

  const safePushState = (path: string) => {
    try {
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
    } catch (e) {
        console.warn('History pushState failed:', e);
    }
  };

  useEffect(() => {
    if (appState !== 'app' || !currentUser?.uid) return;

    const updatePresence = async () => {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { 
                lastSeen: serverTimestamp() 
            });
            const ticketRef = doc(db, 'tickets', currentUser.uid);
            updateDoc(ticketRef, { userLastActive: serverTimestamp() }).catch(() => {});
        } catch (e) {
            console.error("Error updating presence:", e);
        }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    return () => clearInterval(interval);
  }, [appState, currentUser?.uid]);

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
    } else if (path === '/') {
        setAppState('landing');
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
            setAppState('landing');
        } else if (['/dashboard', '/lancamentos', '/relatorios', '/perfil', '/planejamento', '/admin'].includes(currentPath)) {
            if (currentUser) {
                setAppState('app');
            }
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

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
            // Durante o cadastro, o documento pode não existir ainda se o Auth.tsx não chamou onLoginSuccess
            // Se não for check periódico e não houver documento, só prosseguimos se não estivermos na tela de Auth
            const isAuthPath = window.location.pathname === '/login' || window.location.pathname === '/cadastro';
            if (isAuthPath && !isPeriodicCheck) {
                setIsLoadingAuth(false);
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
                setCurrentUser(userData);
                setAppState('expired');
                setIsLoadingAuth(false);
                return; 
            } else if (diffDays <= 5) {
                setExpirationWarning({ show: true, days: diffDays });
            }
        }

        setCurrentUser(userData);
        
        if (!isPeriodicCheck) {
             if (window.location.pathname !== '/obrigado') {
                 setAppState('app');
                 const currentPath = window.location.pathname;
                 const validAppPaths = ['/dashboard', '/lancamentos', '/relatorios', '/perfil', '/planejamento', '/admin'];
                 if (currentPath === '/' || currentPath === '/login' || currentPath === '/cadastro' || !validAppPaths.includes(currentPath)) {
                     safePushState('/dashboard');
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
    if (!firebaseInitialized || !auth) {
        setIsLoadingAuth(false);
        return;
    }

    try {
        const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
          if (user) {
            // CRÍTICO: Se estamos nas rotas de Auth, ignoramos o auto-redirecionamento do onAuthStateChanged.
            // O componente Auth.tsx chamará handleLoginSuccess/validateUserSession quando as validações de banco terminarem.
            const path = window.location.pathname;
            const isAuthPath = path === '/login' || path === '/cadastro';
            
            if (!isAuthPath || appState === 'app') {
                await validateUserSession(user.uid);
            } else {
                setIsLoadingAuth(false);
            }
          } else {
            setCurrentUser(null);
            const path = window.location.pathname;
            if (path !== '/login' && path !== '/cadastro' && path !== '/obrigado') {
                setAppState('landing');
            }
            setIsLoadingAuth(false);
          }
        });

        return () => unsubscribe(); 
    } catch (e) {
        console.error("Critical Auth Error:", e);
        setIsLoadingAuth(false);
    }
  }, [validateUserSession, appState]);

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
      setAppState('landing');
      setCurrentUser(null);
      safePushState('/'); 
  }, [currentUser]);

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
    } else if (view === 'terms') {
      setIsTermsOfServiceModalOpen(true);
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
      {appState === 'landing' && <LandingPage 
        onStart={handleStart} 
        scrollTarget={landingScrollTarget} 
        clearScrollTarget={() => setLandingScrollTarget(null)} 
        onOpenSupport={() => setIsSupportChatOpen(true)}
      />}
      
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
           <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Assinatura Expirada</h2>
              <p className="text-gray-600 mb-6">O período de acesso da sua conta encerrou.</p>
              <div className="space-y-3">
                 <button onClick={handleRenewSubscription} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg">Renovar Agora</button>
                  <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-600 font-semibold py-3 px-6 rounded-lg">Sair da Conta</button>
              </div>
           </div>
        </div>
      )}
      
      {appState === 'app' && currentUser && (
        <MainAppContent 
          currentUser={currentUser} 
          onOpenGlobalPrivacyPolicy={() => setIsPrivacyPolicyModalOpen(true)} 
          onOpenGlobalTermsOfService={() => setIsTermsOfServiceModalOpen(true)} 
          expirationWarning={expirationWarning} 
          onOpenSupport={() => setIsSupportChatOpen(true)} 
          onViewChange={setCurrentAppView} 
        />
      )}

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
