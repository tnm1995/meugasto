
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
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);

  const [isPrivacyPolicyModalOpen, setIsPrivacyPolicyModalOpen] = useState(false);
  const [isTermsOfServiceModalOpen, setIsTermsOfServiceModalOpen] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false); 
  const [currentAppView, setCurrentAppView] = useState<View>('dashboard');

  const safePushState = (path: string) => {
    try {
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path);
        }
    } catch (e) {}
  };

  const checkIsExpired = useCallback((userData: User | null): boolean => {
    if (!userData) return false;
    if (['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userData.role)) return false;
    
    // 1. Se tem data de expiração definida, valida ela
    if (userData.subscriptionExpiresAt) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const [year, month, day] = userData.subscriptionExpiresAt.split('-').map(Number);
        const expiryDate = new Date(year, month - 1, day);
        return expiryDate < today;
    }

    // 2. Se NÃO tem data (usuário novo), verifica se está no período de teste (7 dias)
    // Se estiver no trial, NÃO está expirado.
    if (userData.createdAt) {
        const created = new Date(userData.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 7; // Expira se passar de 7 dias sem assinar
    }

    return true; // Fallback: Sem data e sem createdAt é considerado expirado
  }, []);

  // 1. Monitor de Presença
  useEffect(() => {
    if (appState !== 'app' || !currentUser?.uid) return;
    const updatePresence = async () => {
        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, { lastSeen: serverTimestamp() });
        } catch (e) {}
    };
    updatePresence();
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, [appState, currentUser?.uid]);

  // 2. ÚNICA FONTE DE VERDADE PARA ROTEAMENTO E ESTADO
  useEffect(() => {
    if (isLoadingAuth) return;

    const syncStateWithUrl = () => {
        const path = window.location.pathname;
        const isAuthPath = path === '/login' || path === '/cadastro';
        const isAppPath = ['/dashboard', '/lancamentos', '/relatorios', '/perfil', '/planejamento', '/admin'].includes(path);
        const isThankYouPath = path === '/obrigado' || path === '/obrigado-kirvano';
        
        if (!currentUser) {
            // USUÁRIO DESLOGADO
            if (isThankYouPath) setAppState('thankyou');
            else if (isAuthPath) {
                setAppState('auth');
                setAuthInitialView(path === '/login' ? 'login' : 'register');
            } else {
                setAppState('landing');
                if (isAppPath) safePushState('/');
            }
        } else {
            // USUÁRIO LOGADO
            const isExpired = checkIsExpired(currentUser);

            if (isExpired) {
                // LOGADO MAS EXPIRADO
                if (isAppPath) {
                    setAppState('expired');
                } else if (isAuthPath) {
                    setAppState('expired');
                    safePushState('/dashboard'); // Força a cair no bloco 'expired'
                } else if (isThankYouPath) {
                    setAppState('thankyou');
                } else {
                    setAppState('landing');
                }
            } else {
                // LOGADO E ATIVO
                if (isAppPath) {
                    setAppState('app');
                } else if (isAuthPath || path === '/') {
                    setAppState('app');
                    safePushState('/dashboard');
                } else if (isThankYouPath) {
                    setAppState('thankyou');
                } else {
                    setAppState('app');
                    safePushState('/dashboard');
                }
            }
        }
    };

    syncStateWithUrl();
    window.addEventListener('popstate', syncStateWithUrl);
    return () => window.removeEventListener('popstate', syncStateWithUrl);
  }, [currentUser, isLoadingAuth, checkIsExpired]);

  // 3. Validação de Sessão (Apenas Dados)
  const validateUserSession = useCallback(async (uid: string) => {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const userData = { ...docSnap.data(), uid } as User;
            if (userData.status === 'blocked') {
                await auth.signOut();
                setCurrentUser(null);
                alert("Sua conta está bloqueada.");
                return;
            }
            setCurrentUser(userData);

            // Calcula avisos de expiração
            if (userData.subscriptionExpiresAt && !['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userData.role)) {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const [year, month, day] = userData.subscriptionExpiresAt.split('-').map(Number);
                const expiryDate = new Date(year, month - 1, day);
                const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays <= 5) setExpirationWarning({ show: true, days: diffDays });
            }
        } else {
            // Perfil novo sendo criado ou em fluxo de auth
            setCurrentUser({
                uid, name: auth.currentUser?.displayName || 'Usuário', email: auth.currentUser?.email || '',
                role: 'user', status: 'active', profileImage: DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS, createdAt: new Date().toISOString(),
                subscriptionExpiresAt: null
            });
        }
    } catch (error) {
        console.error("Auth sync error:", error);
    } finally {
        setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseInitialized || !auth) return;
    return onAuthStateChanged(auth, (user: any) => {
      if (user) {
        validateUserSession(user.uid);
      } else {
        setCurrentUser(null);
        setIsLoadingAuth(false);
      }
    });
  }, [validateUserSession]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // O useEffect de roteamento cuidará do redirecionamento
  };

  const handleLogout = async () => {
      await logout();
      setCurrentUser(null);
      setAppState('landing');
      safePushState('/'); 
  };

  const handleRenewSubscription = async () => {
      await logout();
      setCurrentUser(null);
      setLandingScrollTarget('pricing'); 
      setAppState('landing');
      safePushState('/');
  };

  // Nova função para re-verificar status sem deslogar
  const handleVerifyPayment = async () => {
      if (!currentUser?.uid) return;
      setIsVerifyingPayment(true);
      // Força recarregamento dos dados do usuário
      await validateUserSession(currentUser.uid);
      setIsVerifyingPayment(false);
  };

  const handleStart = (view: 'login' | 'register' | 'privacy' | 'terms') => {
    if (view === 'privacy') setIsPrivacyPolicyModalOpen(true);
    else if (view === 'terms') setIsTermsOfServiceModalOpen(true);
    else {
      setAuthRenderKey(Date.now());
      setAuthInitialView(view);
      setAppState('auth');
      safePushState(view === 'login' ? '/login' : '/cadastro');
    }
  };
  
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium animate-pulse">Sincronizando...</p>
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
                    onBack={() => { setAppState('landing'); safePushState('/'); }} 
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
                     <button onClick={handleVerifyPayment} disabled={isVerifyingPayment} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                        {isVerifyingPayment ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <span className="material-symbols-outlined">sync</span>}
                        Já paguei, verificar agora
                     </button>
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
                    style={{ borderRadius: '50%' }}
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
