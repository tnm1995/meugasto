
import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from 'react';
import type { Expense, View, User, Budget, Goal, Reminder, Omit, SavingsGoal, Category } from '../types';
import { 
    EXPENSE_CATEGORIES_DEFAULT, 
    INCOME_CATEGORIES_DEFAULT,
    DEFAULT_REMINDER_SETTINGS, 
    DEFAULT_PROFILE_IMAGE, 
    getLevelInfo 
} from '../types';

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
import { CategoryManagerModal } from './CategoryManagerModal';
import { APISetupErrorModal } from './APISetupErrorModal';
import { PlusIcon } from './Icons';
import { Header } from './Header';
import { BottomNavItem } from './BottomNav';
import { Sidebar } from './Sidebar'; 

import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useFirestoreDocument } from '../hooks/useFirestoreDocument';
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
  onViewChange?: (view: View) => void;
}

const PATH_TO_VIEW: Record<string, View> = {
    '/dashboard': 'dashboard',
    '/lancamentos': 'entries',
    '/relatorios': 'reports',
    '/perfil': 'profile',
    '/planejamento': 'goals',
    '/admin': 'admin'
};

const VIEW_TO_PATH: Record<View, string> = {
    'dashboard': '/dashboard',
    'entries': '/lancamentos',
    'reports': '/relatorios',
    'profile': '/perfil',
    'goals': '/planejamento',
    'admin': '/admin'
};

export const MainAppContent: React.FC<MainAppContentProps> = ({ currentUser, onOpenGlobalPrivacyPolicy, onOpenGlobalTermsOfService, onOpenSupport, expirationWarning, onViewChange }) => {
  const [currentView, setCurrentViewState] = useState<View>(() => {
      const path = window.location.pathname;
      return PATH_TO_VIEW[path] || 'dashboard';
  });

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [initialExpenseData, setInitialExpenseData] = useState<Omit<Expense, 'id'> | null>(null);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false); 
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsGoalToEdit, setSavingsGoalToEdit] = useState<SavingsGoal | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [isSubscriptionModalOpen, setIsSubscriptionModalFromComponent] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isAPISetupErrorModalOpen, setIsAPISetupErrorModalOpen] = useState(false);

  const { showToast } = useToast();

  const setCurrentView = (view: View) => {
      setCurrentViewState(view);
      const newPath = VIEW_TO_PATH[view];
      if (newPath && window.location.pathname !== newPath) {
          window.history.pushState({}, '', newPath);
      }
  };

  useEffect(() => {
      const handlePopState = () => {
          const path = window.location.pathname;
          const mappedView = PATH_TO_VIEW[path];
          if (mappedView) setCurrentViewState(mappedView);
          else if (path === '/' || path === '') setCurrentViewState('dashboard');
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (onViewChange) onViewChange(currentView);
  }, [currentView, onViewChange]);

  // Firestore Queries
  const expenseQueryConstraints = useMemo(() => [orderBy('purchaseDate', 'desc')], []);
  const goalQueryConstraints = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [where('endDate', '>=', today), orderBy('endDate', 'asc')];
  }, []);
  const reminderQueryConstraints = useMemo(() => [orderBy('date', 'asc')], []);
  const savingsQueryConstraints = useMemo(() => [orderBy('targetAmount', 'desc')], []);
  const categoryQueryConstraints = useMemo(() => [orderBy('name', 'asc')], []);

  const { data: expenses, loading: loadingExpenses, error: errorExpenses, addDocument: addExpenseFirestore, updateDocument: updateExpenseFirestore, deleteDocument: deleteExpenseFirestore } = useFirestoreCollection<Expense>('expenses', currentUser.uid, expenseQueryConstraints);
  const { data: goals, loading: loadingGoals, error: errorGoals, addDocument: addGoalFirestore, updateDocument: updateGoalFirestore, deleteDocument: deleteGoalFirestore } = useFirestoreCollection<Goal>('goals', currentUser.uid, goalQueryConstraints);
  const { data: savingsGoals, loading: loadingSavings, addDocument: addSavingsFirestore, updateDocument: updateSavingsFirestore, deleteDocument: deleteSavingsFirestore } = useFirestoreCollection<SavingsGoal>('savings_goals', currentUser.uid, savingsQueryConstraints);
  const { data: reminders, loading: loadingReminders, error: errorReminders, addDocument: addReminderFirestore, deleteDocument: deleteReminderFirestore } = useFirestoreCollection<Reminder>('reminders', currentUser.uid, reminderQueryConstraints);
  const { data: categories, loading: loadingCategories, addDocument: addCategoryFirestore, updateDocument: updateCategoryFirestore, deleteDocument: deleteCategoryFirestore } = useFirestoreCollection<Category>('categories', currentUser.uid, categoryQueryConstraints);

  const userDocPath = `users/${currentUser.uid}`;
  const { data: userDataFromFirestore, loading: loadingUserDoc } = useFirestoreDocument<User>(userDocPath);

  // --- Lógica de Seeding de Categorias ---
  useEffect(() => {
    const seedCategories = async () => {
        if (!loadingCategories && categories.length === 0) {
            console.log("Semeando categorias iniciais para o usuário...");
            const batch = writeBatch(db);
            const userCatsRef = collection(db, 'users', currentUser.uid, 'categories');

            // Prepara categorias de despesa
            Object.entries(EXPENSE_CATEGORIES_DEFAULT).forEach(([name, subs]) => {
                const newDocRef = doc(userCatsRef);
                batch.set(newDocRef, { name, type: 'expense', subcategories: subs, isDefault: true });
            });

            // Prepara categorias de receita
            Object.entries(INCOME_CATEGORIES_DEFAULT).forEach(([name, subs]) => {
                const newDocRef = doc(userCatsRef);
                batch.set(newDocRef, { name, type: 'income', subcategories: subs, isDefault: true });
            });

            try {
                await batch.commit();
                console.log("Categorias semeadas com sucesso.");
            } catch (err) {
                console.error("Erro ao semear categorias:", err);
            }
        }
    };
    seedCategories();
  }, [loadingCategories, categories.length, currentUser.uid]);

  // --- Lógica de Notificações ---
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;
    const checkReminders = () => {
        if (Notification.permission !== 'granted') return;
        const now = new Date();
        const currentMinute = now.getHours() * 60 + now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];
        reminders.forEach(reminder => {
            if (reminder.date === todayStr) {
                const [rHour, rMinute] = reminder.time.split(':').map(Number);
                const rTime = rHour * 60 + rMinute;
                if (rTime === currentMinute) {
                    const notifKey = `notified_${reminder.id}_${todayStr}_${reminder.time}`;
                    if (!localStorage.getItem(notifKey)) {
                        new Notification(`Lembrete: ${reminder.title}`, { body: 'Está na hora! Toque para ver.', icon: '/favicon.ico' });
                        localStorage.setItem(notifKey, 'true');
                        setTimeout(() => localStorage.removeItem(notifKey), 61000);
                    }
                }
            }
        });
    };
    const interval = setInterval(checkReminders, 10000); 
    return () => clearInterval(interval);
  }, [reminders]);

  useEffect(() => {
    const error = errorExpenses || errorGoals || errorReminders;
    if (error) showToast(`Erro de conexão: ${error.message}`, 'error');
  }, [errorExpenses, errorGoals, errorReminders, showToast]);

  // Perfil e XP Logic
  useEffect(() => {
    const checkAndCreateUserDoc = async () => {
      if (!loadingUserDoc && !userDataFromFirestore) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            const newUserDocData: User = {
                uid: currentUser.uid, name: currentUser.name, email: currentUser.email, phone: currentUser.phone || '', profileImage: DEFAULT_PROFILE_IMAGE, reminderSettings: DEFAULT_REMINDER_SETTINGS, role: 'user', status: 'active', createdAt: new Date().toISOString(), subscriptionExpiresAt: null, xp: 0, currentStreak: 1, lastInteractionDate: getLocalDate()
            };
            try { await setDoc(userDocRef, newUserDocData); } catch (error) { console.error("Falha ao criar perfil:", error); }
        }
      } else if (userDataFromFirestore) {
          const today = getLocalDate();
          const lastDate = userDataFromFirestore.lastInteractionDate;
          if (lastDate !== today) {
              const userRef = doc(db, 'users', currentUser.uid);
              const yesterdayStr = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
              if (lastDate === yesterdayStr) await updateDoc(userRef, { currentStreak: increment(1), lastInteractionDate: today });
              else await updateDoc(userRef, { currentStreak: 1, lastInteractionDate: today });
          }
      }
    };
    checkAndCreateUserDoc();
  }, [currentUser, loadingUserDoc, userDataFromFirestore]);

  const userProfile: User = useMemo(() => {
    const baseProfile: User = { 
        uid: currentUser.uid, name: currentUser.name || 'Usuário', email: currentUser.email || '', phone: currentUser.phone || '', profileImage: DEFAULT_PROFILE_IMAGE, reminderSettings: DEFAULT_REMINDER_SETTINGS, role: 'user', status: 'active', xp: 0, currentStreak: 0, createdAt: currentUser.createdAt || new Date().toISOString(), subscriptionExpiresAt: currentUser.subscriptionExpiresAt || null
    };
    if (loadingUserDoc || !userDataFromFirestore) return baseProfile;
    return { ...baseProfile, ...userDataFromFirestore };
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
  }, [showToast]);

  // CRUD Handlers
  const onSaveExpense = useCallback(async (expenseData: Omit<Expense, 'id'>, idToUpdate?: string) => {
      if (idToUpdate) {
        const success = await updateExpenseFirestore(idToUpdate, expenseData);
        showToast(success ? 'Lançamento atualizado!' : 'Erro ao atualizar.', success ? 'success' : 'error');
      } else {
        const id = await addExpenseFirestore(expenseData);
        if (id) { showToast('Lançamento adicionado!', 'success'); awardXp(20, 'Gasto registrado'); } 
      }
      setExpenseToEdit(null); setInitialExpenseData(null); setIsExpenseModalOpen(false);
  }, [addExpenseFirestore, updateExpenseFirestore, showToast, awardXp]);

  const deleteExpense = useCallback(async (id: string) => {
        const success = await deleteExpenseFirestore(id);
        showToast(success ? 'Lançamento excluído.' : 'Erro ao excluir.', success ? 'success' : 'error');
  }, [deleteExpenseFirestore, showToast]);

  const onSaveGoal = useCallback(async (goalData: Omit<Goal, 'id'>, idToUpdate?: string) => {
      if (idToUpdate) await updateGoalFirestore(idToUpdate, goalData);
      else { await addGoalFirestore(goalData); awardXp(30, 'Meta definida'); }
      setGoalToEdit(null); setIsGoalModalOpen(false);
  }, [addGoalFirestore, updateGoalFirestore, awardXp]);

  const onSaveSavingsGoal = useCallback(async (data: Omit<SavingsGoal, 'id'>, idToUpdate?: string) => {
      if (idToUpdate) await updateSavingsFirestore(idToUpdate, data);
      else { await addSavingsFirestore(data); awardXp(50, 'Sonho criado'); }
      setSavingsGoalToEdit(null); setIsSavingsModalOpen(false);
  }, [addSavingsFirestore, updateSavingsFirestore, awardXp]);

  const onAddReminder = useCallback(async (reminderData: Omit<Reminder, 'id'>) => {
    const id = await addReminderFirestore(reminderData);
    if(id) awardXp(10, 'Lembrete agendado');
  }, [addReminderFirestore, awardXp]);

  const deleteGoal = (id: string) => deleteGoalFirestore(id);
  const deleteSavingsGoal = (id: string) => deleteSavingsFirestore(id);
  const onDeleteReminder = (id: string) => deleteReminderFirestore(id);

  const onUpdateProfileImage = useCallback(async (newImage: string): Promise<boolean> => {
    const userRef = doc(db, 'users', currentUser.uid);
    try { await updateDoc(userRef, { profileImage: newImage }); return true; } catch { return false; }
  }, [currentUser.uid]);

  const handleResetData = useCallback(async (period: 'all' | 'month' | 'year') => {
    try {
      const expensesRef = collection(db, 'users', currentUser.uid, 'expenses');
      let q = query(expensesRef);
      if (period === 'month') {
          const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
          const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
          q = query(expensesRef, where('purchaseDate', '>=', start), where('purchaseDate', '<=', end));
      }
      const snapshot = await getDocs(q);
      if (snapshot.empty) return true;
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      showToast(`${snapshot.docs.length} registros excluídos.`, 'success');
      return true;
    } catch { return false; }
  }, [currentUser.uid, showToast]);

  const isAdmin = userProfile.role && ['admin', 'super_admin', 'operational_admin', 'support_admin'].includes(userProfile.role);

  const renderView = useCallback(() => (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div><p>Carregando...</p></div>}>
      {(() => {
        switch (currentView) {
          case 'dashboard': return <Dashboard expenses={expenses} isLoading={loadingExpenses} userProfile={userProfile} onManageReminders={() => setIsReminderModalOpen(true)} reminders={reminders} onViewAll={() => setCurrentView('entries')} goals={goals} />;
          case 'entries': return <Entries expenses={expenses} onDeleteExpense={deleteExpense} onEditExpense={(e) => { setExpenseToEdit(e); setIsExpenseModalOpen(true); }} isLoading={loadingExpenses} onAddExpense={async (e, t) => { if(!t) { await addExpenseFirestore(e); } else { setInitialExpenseData(e); setIsExpenseModalOpen(true); } }} onAPISetupError={() => setIsAPISetupErrorModalOpen(true)} />;
          case 'reports': return <Reports expenses={expenses} isLoadingExpenses={loadingExpenses} />;
          case 'goals': return <Goals goals={goals} savingsGoals={savingsGoals} expenses={expenses} onOpenGoalModal={() => setIsGoalModalOpen(true)} onOpenSavingsModal={() => setIsSavingsModalOpen(true)} onEditGoal={(g) => { setGoalToEdit(g); setIsGoalModalOpen(true); }} onEditSavingsGoal={(s) => { setSavingsGoalToEdit(s); setIsSavingsModalOpen(true); }} onDeleteGoal={deleteGoal} onDeleteSavingsGoal={deleteSavingsGoal} isLoading={loadingGoals} />;
          case 'profile': return <Profile userProfile={userProfile} handleLogout={handleAppLogout} onManageSubscription={() => setIsSubscriptionModalFromComponent(true)} onUpdateProfileImage={onUpdateProfileImage} isLoading={loadingUserDoc} onOpenPrivacyPolicy={onOpenGlobalPrivacyPolicy} onOpenTermsOfService={onOpenGlobalTermsOfService} onOpenSupport={onOpenSupport} onOpenAdminPanel={() => setCurrentView('admin')} onResetData={handleResetData} onManageCategories={() => setIsCategoryModalOpen(true)} />;
          case 'admin': return isAdmin ? <AdminPanel currentUser={userProfile} /> : <div className="p-8 text-center text-red-600">Acesso negado.</div>;
          default: return null;
        }
      })()}
    </Suspense>
  ), [currentView, expenses, goals, savingsGoals, reminders, deleteExpense, userProfile, loadingExpenses, loadingGoals, loadingUserDoc]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="hidden md:flex flex-col h-full z-20 shadow-xl relative">
            <Sidebar currentView={currentView} onSetView={setCurrentView} onOpenNewExpense={() => { setInitialExpenseData(null); setExpenseToEdit(null); setIsExpenseModalOpen(true); }} onLogout={handleAppLogout} userProfile={userProfile} />
        </div>
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <Header userProfile={userProfile} currentView={currentView} onSetView={setCurrentView} onLogout={handleAppLogout} />
            <main className={`flex-1 overflow-y-auto pb-24 md:pb-8 w-full px-4 sm:px-6 lg:px-8 custom-scrollbar pt-4`}>
                <div className="max-w-7xl mx-auto h-full">
                    <AnimatePresence mode="wait">
                        <motion.div key={currentView} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="h-full w-full">
                            {renderView()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
            {currentView !== 'admin' && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-40">
                    <div className="grid grid-cols-5 h-16 w-full px-2">
                        <BottomNavItem icon="space_dashboard" label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
                        <BottomNavItem icon="receipt_long" label="Lançamentos" isActive={currentView === 'entries'} onClick={() => setCurrentView('entries')} />
                        <div className="relative flex justify-center items-center z-50">
                            <button onClick={() => { setInitialExpenseData(null); setExpenseToEdit(null); setIsExpenseModalOpen(true); }} className="absolute -top-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center border-4 border-gray-50"><PlusIcon className="text-2xl" /></button>
                        </div>
                        <BottomNavItem icon="track_changes" label="Planejamento" isActive={currentView === 'goals'} onClick={() => setCurrentView('goals')} />
                        <BottomNavItem icon="bar_chart" label="Relatórios" isActive={currentView === 'reports'} onClick={() => setCurrentView('reports')} />
                    </div>
                </nav>
            )}
        </div>
        <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setExpenseToEdit(null); }} onSaveExpense={onSaveExpense} expenseToEdit={expenseToEdit} initialData={initialExpenseData} onAPISetupError={() => setIsAPISetupErrorModalOpen(true)} categories={categories} />
        <GoalModal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setGoalToEdit(null); }} onSaveGoal={onSaveGoal} goalToEdit={goalToEdit} categories={categories} />
        <SavingsGoalModal isOpen={isSavingsModalOpen} onClose={() => { setIsSavingsModalOpen(false); setSavingsGoalToEdit(null); }} onSave={onSaveSavingsGoal} goalToEdit={savingsGoalToEdit} />
        <CategoryManagerModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} categories={categories} onSaveCategory={editingCatId => addCategoryFirestore(editingCatId) || updateCategoryFirestore(editingCatId, editingCatId)} onDeleteCategory={deleteCategoryFirestore} />
        <SubscriptionModal isOpen={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalFromComponent(false)} />
        <ReminderModal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} onAddReminder={onAddReminder} onDeleteReminder={onDeleteReminder} reminders={reminders} />
        <APISetupErrorModal isOpen={isAPISetupErrorModalOpen} onClose={() => setIsAPISetupErrorModalOpen(false)} />
    </div>
  );
};
