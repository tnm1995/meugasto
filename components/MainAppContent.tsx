import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from 'react';
import type { Expense, User, Budget, Goal, Reminder, Omit, SavingsGoal } from '../types';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

// Importa componentes via React.lazy
const Dashboard = lazy(() => import('./Dashboard').then(module => ({ default: module.Dashboard })));
const Entries = lazy(() => import('./Entries').then(module => ({ default: module.Entries })));
const Reports = lazy(() => import('./Reports').then(module => ({ default: module.Reports })));
const Goals = lazy(() => import('./Goals').then(module => ({ default: module.Goals })));
const Profile = lazy(() => import('./Profile').then(module => ({ default: module.Profile })));
const AdminPanel = lazy(() => import('./AdminPanel').then(module => ({ default: module.AdminPanel }))); 

import { ExpenseModal } from './ExpenseModal';
import { SubscriptionModal } from './SubscriptionModal';
import { ReminderModal } from './ReminderModal';
import { BudgetModal } from './BudgetModal';
import { GoalModal } from './GoalModal';
import { SavingsGoalModal } from './SavingsGoalModal'; 
import { APISetupErrorModal } from './APISetupErrorModal';
import { PlusIcon } from './Icons';
import { Header } from './Header';
import { BottomNavItem } from './BottomNav';
import { Sidebar } from './Sidebar'; 

import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useFirestoreDocument } from '../hooks/useFirestoreDocument';
import { DEFAULT_REMINDER_SETTINGS, DEFAULT_PROFILE_IMAGE } from '../types';
import { db } from '../services/firebaseService';
import { where, orderBy, doc, setDoc, getDoc, updateDoc, increment, writeBatch, collection, getDocs, query } from 'firebase/firestore';
import { logout } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { getLocalDate } from '../services/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MainAppContentProps {
  currentUser: User;
  onOpenGlobalPrivacyPolicy: () => void;
  onOpenGlobalTermsOfService: () => void;
  onOpenSupport: () => void;
  expirationWarning?: { show: boolean; days: number };
}

export const MainAppContent: React.FC<MainAppContentProps> = ({ currentUser, onOpenGlobalPrivacyPolicy, onOpenGlobalTermsOfService, onOpenSupport, expirationWarning }) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [initialExpenseData, setInitialExpenseData] = useState<Omit<Expense, 'id'> | null>(null);
  
  // Modals de Planejamento
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); 
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsGoalToEdit, setSavingsGoalToEdit] = useState<SavingsGoal | null>(null);

  const [isSubscriptionModalOpen, setIsSubscriptionModalFromComponent] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isAPISetupErrorModalOpen, setIsAPISetupErrorModalOpen] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const expenseQueryConstraints = useMemo(() => [orderBy('purchaseDate', 'desc')], []);
  const goalQueryConstraints = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [where('endDate', '>=', today), orderBy('endDate', 'asc')];
  }, []);
  const reminderQueryConstraints = useMemo(() => [orderBy('date', 'asc')], []);
  const savingsQueryConstraints = useMemo(() => [orderBy('targetAmount', 'desc')], []);

  const { data: expenses, loading: loadingExpenses, error: errorExpenses, addDocument: addExpenseFirestore, updateDocument: updateExpenseFirestore, deleteDocument: deleteExpenseFirestore } = useFirestoreCollection<Expense>('expenses', currentUser.uid, expenseQueryConstraints);
  const { data: goals, loading: loadingGoals, error: errorGoals, addDocument: addGoalFirestore, updateDocument: updateGoalFirestore, deleteDocument: deleteGoalFirestore } = useFirestoreCollection<Goal>('goals', currentUser.uid, goalQueryConstraints);
  const { data: savingsGoals, loading: loadingSavings, addDocument: addSavingsFirestore, updateDocument: updateSavingsFirestore, deleteDocument: deleteSavingsFirestore } = useFirestoreCollection<SavingsGoal>('savings_goals', currentUser.uid, savingsQueryConstraints);
  const { data: reminders, loading: loadingReminders, error: errorReminders, addDocument: addReminderFirestore, deleteDocument: deleteReminderFirestore } = useFirestoreCollection<Reminder>('reminders', currentUser.uid, reminderQueryConstraints);

  const userDocPath = `users/${currentUser.uid}`;
  const { data: userDataFromFirestore, loading: loadingUserDoc } = useFirestoreDocument<User>(userDocPath);

  // --- Lógica de Notificações --- (Mantida)
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;
    const checkReminders = () => {
        if (Notification.permission !== 'granted') return;
        const now = new Date();
        const currentMinute = now.getHours() * 60 + now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];
        reminders.forEach(reminder => {
            const [rYear, rMonth, rDay] = reminder.date.split('-').map(Number);
            const [rHour, rMinute] = reminder.time.split(':').map(Number);
            let isDue = false;
            if (reminder.date === todayStr) {
                const rTime = rHour * 60 + rMinute;
                if (rTime === currentMinute) { isDue = true; }
            }
            if (isDue) {
                const notifKey = `notified_${reminder.id}_${todayStr}_${reminder.time}`;
                if (!localStorage.getItem(notifKey)) {
                    new Notification(`Lembrete: ${reminder.title}`, { body: 'Está na hora! Toque para ver.', icon: '/favicon.ico' });
                    localStorage.setItem(notifKey, 'true');
                    setTimeout(() => localStorage.removeItem(notifKey), 61000);
                }
            }
        });
    };
    const interval = setInterval(checkReminders, 10000); 
    return () => clearInterval(interval);
  }, [reminders]);

  useEffect(() => {
    const error = errorExpenses || errorGoals || errorReminders;
    if (error) {
        showToast(`Erro de conexão: ${error.message}`, 'error');
    }
  }, [errorExpenses, errorGoals, errorReminders, showToast]);

  // Gamification Logic
  useEffect(() => {
    const checkAndCreateUserDoc = async () => {
      if (!loadingUserDoc && !userDataFromFirestore) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            const newUserDocData: User = {
                uid: currentUser.uid,
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.phone || '',
                profileImage: DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS,
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString(),
                subscriptionExpiresAt: null,
                xp: 0,
                currentStreak: 1,
                lastInteractionDate: getLocalDate()
            };
            try { await setDoc(userDocRef, newUserDocData); } catch (error) { console.error("Falha ao criar perfil:", error); }
        }
      } else if (userDataFromFirestore) {
          const today = getLocalDate();
          const lastDate = userDataFromFirestore.lastInteractionDate;
          if (lastDate !== today) {
              const userRef = doc(db, 'users', currentUser.uid);
              const now = new Date();
              now.setDate(now.getDate() - 1);
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const day = String(now.getDate()).padStart(2, '0');
              const yesterdayStr = `${year}-${month}-${day}`;
              if (lastDate === yesterdayStr) {
                  await updateDoc(userRef, { currentStreak: increment(1), lastInteractionDate: today });
              } else {
                  await updateDoc(userRef, { currentStreak: 1, lastInteractionDate: today });
              }
          }
      }
    };
    checkAndCreateUserDoc();
  }, [currentUser, loadingUserDoc, userDataFromFirestore]);

  const userProfile: User = useMemo(() => {
    const baseProfile: User = { 
        uid: currentUser.uid, 
        name: currentUser.name || currentUser.email?.split('@')[0] || 'Usuário', 
        email: currentUser.email || '', 
        phone: currentUser.phone || '', 
        profileImage: DEFAULT_PROFILE_IMAGE, 
        reminderSettings: DEFAULT_REMINDER_SETTINGS, 
        role: 'user', 
        status: 'active', 
        xp: 0, 
        currentStreak: 0,
        createdAt: currentUser.createdAt || new Date().toISOString(),
        subscriptionExpiresAt: currentUser.subscriptionExpiresAt || null
    };
    if (loadingUserDoc || !userDataFromFirestore) return baseProfile;
    return { ...baseProfile, ...userDataFromFirestore, profileImage: userDataFromFirestore.profileImage || DEFAULT_PROFILE_IMAGE, reminderSettings: userDataFromFirestore.reminderSettings || DEFAULT_REMINDER_SETTINGS, xp: userDataFromFirestore.xp || 0, currentStreak: userDataFromFirestore.currentStreak || 0 };
  }, [currentUser, userDataFromFirestore, loadingUserDoc]);

  const awardXp = useCallback(async (amount: number, reason: string) => {
    if (!currentUser.uid) return;
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { xp: increment(amount), lastInteractionDate: getLocalDate() });
        showToast(`+${amount} XP: ${reason}`, 'success');
    } catch (error) { console.error("Error awarding XP:", error); }
  }, [currentUser.uid, showToast]);

  const handleAppLogout = useCallback(async () => {
    const { success, message } = await logout();
    showToast(message, success ? 'success' : 'error');
    if (success) navigate('/');
  }, [showToast, navigate]);

  const onSaveExpense = useCallback(async (expenseData: Omit<Expense, 'id'>, idToUpdate?: string) => {
      if (idToUpdate) {
        const success = await updateExpenseFirestore(idToUpdate, expenseData);
        showToast(success ? 'Despesa atualizada com sucesso!' : 'Erro ao atualizar despesa.', success ? 'success' : 'error');
      } else {
        const id = await addExpenseFirestore(expenseData);
        if (id) { showToast('Despesa adicionada com sucesso!', 'success'); awardXp(20, 'Lançamento adicionado'); } 
        else { showToast('Erro ao salvar a despesa.', 'error'); }
      }
      setExpenseToEdit(null); setInitialExpenseData(null); setIsExpenseModalOpen(false);
  }, [addExpenseFirestore, updateExpenseFirestore, showToast, awardXp]);

  const deleteExpense = useCallback(async (id: string) => {
        const success = await deleteExpenseFirestore(id);
        showToast(success ? 'Despesa excluída com sucesso!' : 'Erro ao excluir despesa.', success ? 'success' : 'error');
  }, [deleteExpenseFirestore, showToast]);

  const onSaveGoal = useCallback(async (goalData: Omit<Goal, 'id'>, idToUpdate?: string) => {
      if (idToUpdate) {
        const success = await updateGoalFirestore(idToUpdate, goalData);
        showToast(success ? 'Orçamento atualizado!' : 'Erro ao atualizar orçamento.', success ? 'success' : 'error');
      } else {
        const id = await addGoalFirestore(goalData);
        showToast(id ? 'Orçamento criado!' : 'Erro ao criar orçamento.', id ? 'success' : 'error');
        awardXp(30, 'Orçamento definido');
      }
      setGoalToEdit(null); setIsGoalModalOpen(false);
  }, [addGoalFirestore, updateGoalFirestore, showToast, awardXp]);

  const deleteGoal = useCallback(async (id: string) => {
        const success = await deleteGoalFirestore(id);
        showToast(success ? 'Orçamento excluído!' : 'Erro ao excluir.', success ? 'success' : 'error');
  }, [deleteGoalFirestore, showToast]);

  const onSaveSavingsGoal = useCallback(async (data: Omit<SavingsGoal, 'id'>, idToUpdate?: string) => {
      if (idToUpdate) {
          const success = await updateSavingsFirestore(idToUpdate, data);
          showToast(success ? 'Meta atualizada!' : 'Erro ao atualizar meta.', success ? 'success' : 'error');
      } else {
          const id = await addSavingsFirestore(data);
          showToast(id ? 'Meta de economia criada!' : 'Erro ao criar meta.', id ? 'success' : 'error');
          awardXp(50, 'Sonho criado');
      }
      setSavingsGoalToEdit(null); setIsSavingsModalOpen(false);
  }, [addSavingsFirestore, updateSavingsFirestore, showToast, awardXp]);

  const deleteSavingsGoal = useCallback(async (id: string) => {
      const success = await deleteSavingsFirestore(id);
      showToast(success ? 'Meta excluída.' : 'Erro ao excluir meta.', success ? 'success' : 'error');
  }, [deleteSavingsFirestore, showToast]);

  const onAddReminder = useCallback(async (reminderData: Omit<Reminder, 'id'>) => {
    const id = await addReminderFirestore(reminderData);
    showToast(id ? 'Lembrete adicionado!' : 'Erro ao adicionar lembrete.', id ? 'success' : 'error');
    if(id) awardXp(10, 'Lembrete criado');
  }, [addReminderFirestore, showToast, awardXp]);

  const onDeleteReminder = useCallback(async (id: string) => {
    const success = await deleteReminderFirestore(id);
    showToast(success ? 'Lembrete concluído/excluído!' : 'Erro ao excluir lembrete.', success ? 'success' : 'error');
  }, [deleteReminderFirestore, showToast]);

  const onUpdateProfileImage = useCallback(async (newImage: string): Promise<boolean> => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    try { await setDoc(userDocRef, { profileImage: newImage }, { merge: true }); return true; } catch { return false; }
  }, [currentUser.uid]);

  const onManageSubscription = useCallback(() => setIsSubscriptionModalFromComponent(true), []);
  const onManageReminders = useCallback(() => setIsReminderModalOpen(true), []);
  const handleAPISetupError = useCallback(() => { setIsAPISetupErrorModalOpen(true); }, []);

  const handleResetData = useCallback(async (period: 'all' | 'month' | 'year') => {
    if (!currentUser.uid) return false;
    try {
      const expensesRef = collection(db, 'users', currentUser.uid, 'expenses');
      let q;
      const now = new Date();
      if (period === 'month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          q = query(expensesRef, where('purchaseDate', '>=', startOfMonth), where('purchaseDate', '<=', endOfMonth));
      } else if (period === 'year') {
          const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
          q = query(expensesRef, where('purchaseDate', '>=', startOfYear), where('purchaseDate', '<=', endOfYear));
      } else {
          q = query(expensesRef);
      }
      const snapshot = await getDocs(q);
      if (snapshot.empty) { showToast('Não há lançamentos para apagar neste período.', 'info'); return true; }
      const batch = writeBatch(db);
      let count = 0;
      snapshot.docs.forEach((doc) => { batch.delete(doc.ref); count++; });
      await batch.commit();
      showToast(`${count} itens excluídos.`, 'success');
      return true;
    } catch (error) {
      console.error("Erro ao resetar dados:", error);
      showToast('Erro ao apagar dados. Tente novamente.', 'error');
      return false;
    }
  }, [currentUser.uid, showToast]);

  const isTrialPeriod = useMemo(() => {
    if (!currentUser.createdAt) return false;
    const created = new Date(currentUser.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 30; 
  }, [currentUser.createdAt]);

  const isAdmin = userProfile.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userProfile.role);

  const openNewExpenseModal = () => {
      setInitialExpenseData(null); 
      setExpenseToEdit(null); 
      setIsExpenseModalOpen(true);
  };

  const LoadingFallback = (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] text-center text-gray-500">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
        <p>Carregando...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* SIDEBAR */}
        <div className="hidden md:flex flex-col h-full z-20 shadow-xl relative">
            <Sidebar 
                onOpenNewExpense={openNewExpenseModal}
                onLogout={handleAppLogout}
                userProfile={userProfile}
            />
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <Header 
                userProfile={userProfile} 
                onLogout={handleAppLogout} 
            />
            
            {/* Alert Banner */}
            {expirationWarning?.show && (
                <div className="absolute z-30 top-20 left-4 right-4 md:left-8 md:right-8 flex justify-center animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
                    <div className={`pointer-events-auto backdrop-blur-md border rounded-2xl shadow-xl p-3 w-full max-w-2xl flex items-center justify-between gap-3 ring-1 ring-black/5 ${isTrialPeriod ? 'bg-indigo-50/95 border-indigo-200 shadow-indigo-500/10' : 'bg-white/95 border-orange-100 shadow-orange-500/10'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${isTrialPeriod ? 'bg-indigo-100' : 'bg-orange-50'}`}><span className={`material-symbols-outlined text-xl ${isTrialPeriod ? 'text-indigo-600' : 'text-orange-500'}`}>{isTrialPeriod ? 'hourglass_top' : 'av_timer'}</span></div>
                            <div className="flex flex-col min-w-0"><span className={`font-bold text-sm truncate ${isTrialPeriod ? 'text-indigo-900' : 'text-gray-800'}`}>{isTrialPeriod ? 'Teste Grátis Acabando' : 'Renovação Necessária'}</span><span className="text-gray-500 text-xs truncate">{isTrialPeriod ? 'Restam' : 'Vence em'} <span className={`font-bold ${isTrialPeriod ? 'text-indigo-600' : 'text-orange-600'}`}>{expirationWarning.days} dia(s)</span>.</span></div>
                        </div>
                        <button onClick={() => setIsSubscriptionModalFromComponent(true)} className={`text-xs font-bold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transform active:scale-95 transition-all whitespace-nowrap text-white ${isTrialPeriod ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gradient-to-r from-orange-500 to-amber-500'}`}>{isTrialPeriod ? 'Garantir Acesso' : 'Renovar Agora'}</button>
                    </div>
                </div>
            )}

            {/* Scrollable Main View */}
            <main className={`flex-1 overflow-y-auto pb-24 md:pb-8 w-full px-4 sm:px-6 lg:px-8 custom-scrollbar ${expirationWarning?.show ? 'pt-24' : 'pt-4'}`}>
                <div className="max-w-7xl mx-auto h-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="h-full w-full"
                        >
                            <Suspense fallback={LoadingFallback}>
                                <Routes>
                                    <Route path="/" element={<Navigate to="dashboard" replace />} />
                                    <Route path="dashboard" element={<Dashboard expenses={expenses} isLoading={loadingExpenses} userProfile={userProfile} onManageReminders={onManageReminders} reminders={reminders} onViewAll={() => navigate('lancamentos')} goals={goals} />} />
                                    <Route path="lancamentos" element={<Entries expenses={expenses} onDeleteExpense={deleteExpense} onEditExpense={(e) => { setExpenseToEdit(e); setIsExpenseModalOpen(true); }} isLoading={loadingExpenses} onAddExpense={async (e, t) => { if(!t) { await addExpenseFirestore(e); } else { setInitialExpenseData(e); setIsExpenseModalOpen(true); } }} onAPISetupError={handleAPISetupError} />} />
                                    <Route path="relatorios" element={<Reports expenses={expenses} isLoadingExpenses={loadingExpenses} />} />
                                    <Route path="planejamento" element={<Goals goals={goals} savingsGoals={savingsGoals} expenses={expenses} onOpenGoalModal={() => setIsGoalModalOpen(true)} onOpenSavingsModal={() => setIsSavingsModalOpen(true)} onEditGoal={(g) => { setGoalToEdit(g); setIsGoalModalOpen(true); }} onEditSavingsGoal={(s) => { setSavingsGoalToEdit(s); setIsSavingsModalOpen(true); }} onDeleteGoal={deleteGoal} onDeleteSavingsGoal={deleteSavingsGoal} isLoading={loadingGoals} />} />
                                    <Route path="perfil" element={<Profile userProfile={userProfile} handleLogout={handleAppLogout} onManageSubscription={onManageSubscription} onUpdateProfileImage={onUpdateProfileImage} isLoading={loadingUserDoc} onOpenPrivacyPolicy={onOpenGlobalPrivacyPolicy} onOpenTermsOfService={onOpenGlobalTermsOfService} onOpenSupport={onOpenSupport} onOpenAdminPanel={() => navigate('admin')} onResetData={handleResetData} />} />
                                    <Route path="admin" element={isAdmin ? <AdminPanel currentUser={userProfile} /> : <Navigate to="dashboard" />} />
                                    <Route path="*" element={<Navigate to="dashboard" />} />
                                </Routes>
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* BOTTOM NAV - Mobile Only */}
            {location.pathname !== '/app/admin' && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-200 z-40 safe-area-pb">
                    <div className="grid grid-cols-5 h-16 w-full px-2">
                        <BottomNavItem icon="space_dashboard" label="Dashboard" to="/app/dashboard" />
                        <BottomNavItem icon="receipt_long" label="Lançamentos" to="/app/lancamentos" />
                        <div className="relative flex justify-center items-center z-50">
                            <button onClick={openNewExpenseModal} className="absolute -top-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/40 flex items-center justify-center hover:bg-blue-700 transition-all transform active:scale-95 focus:outline-none border-4 border-gray-50">
                                <PlusIcon className="text-2xl" />
                            </button>
                        </div>
                        <BottomNavItem icon="track_changes" label="Planejamento" to="/app/planejamento" />
                        <BottomNavItem icon="bar_chart" label="Relatórios" to="/app/relatorios" />
                    </div>
                </nav>
            )}
        </div>

        {/* Global Modals */}
        <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }} onSaveExpense={onSaveExpense} expenseToEdit={expenseToEdit} initialData={initialExpenseData} onAPISetupError={handleAPISetupError} />
        <GoalModal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setGoalToEdit(null); }} onSaveGoal={onSaveGoal} goalToEdit={goalToEdit} />
        <SavingsGoalModal isOpen={isSavingsModalOpen} onClose={() => { setIsSavingsModalOpen(false); setSavingsGoalToEdit(null); }} onSave={onSaveSavingsGoal} goalToEdit={savingsGoalToEdit} />
        <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalFromComponent(false)} />
        <ReminderModal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} onAddReminder={onAddReminder} onDeleteReminder={onDeleteReminder} reminders={reminders} />
        <APISetupErrorModal isOpen={isAPISetupErrorModalOpen} onClose={() => setIsAPISetupErrorModalOpen(false)} />
    </div>
  );
};