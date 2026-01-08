
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { db } from '../services/firebaseService';
import { collection, getDocs, doc, updateDoc, setDoc, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail, adminCreateUser } from '../services/authService';
import { User, UserStatus, UserRole, PricingSettings, ROLE_LABELS, AdminLog } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { AdminSupport } from './AdminSupport'; 
import { 
    SearchIcon, 
    GroupIcon, 
    CheckCircleIcon, 
    LockIcon, 
    LockOpenIcon,
    CalendarClockIcon,
    EditIcon,
    EmailIcon,
    KeyIcon,
    XMarkIcon,
    AdminPanelSettingsIcon,
    AttachMoneyIcon,
    PlusIcon,
    ShieldCheckIcon, 
    SupportAgentIcon,
    DescriptionIcon,
    ChatBubbleIcon,
    HistoryIcon,
    ProfileIcon,
    StarIcon,
    ConstructionIcon
} from './Icons';

const formatDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return '-';
    const datePart = isoDate.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface AdminPanelProps {
    currentUser: User;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { showToast } = useToast();
    const { pricing, settings: globalSettings, loading: loadingSettings } = useSystemSettings();

    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Pricing States
    const [editMonthlyPrice, setEditMonthlyPrice] = useState('');
    const [editAnnualPrice, setEditAnnualPrice] = useState('');
    const [editMonthlyLink, setEditMonthlyLink] = useState('');
    const [editAnnualLink, setEditAnnualLink] = useState('');
    const [isSavingPricing, setIsSavingPricing] = useState(false);

    // Global Settings States
    const [scannerMaintenance, setScannerMaintenance] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newCpf, setNewCpf] = useState('');
    const [subscriptionDate, setSubscriptionDate] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('user');
    const [internalNotes, setInternalNotes] = useState(''); 

    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createCpf, setCreateCpf] = useState('');
    const [createRole, setCreateRole] = useState<UserRole>('user');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    
    const [activeTab, setActiveTab] = useState<'users' | 'support' | 'settings' | 'logs'>('users');

    const userRole = currentUser.role || 'user';
    
    const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
    const isOperationalAdmin = userRole === 'operational_admin';
    const isSupportAdmin = userRole === 'support_admin';

    const canManagePricing = isSuperAdmin;
    const canManageAdmins = isSuperAdmin;
    const canEditUsers = isSuperAdmin || isOperationalAdmin;
    const canCreateUsers = isSuperAdmin || isOperationalAdmin;
    const canBlockUsers = isSuperAdmin || isOperationalAdmin;
    const canViewLogs = isSuperAdmin || isOperationalAdmin;
    
    useEffect(() => {
        if (!loadingSettings) {
            if (pricing) {
                setEditMonthlyPrice(pricing.monthlyPrice.toString());
                setEditAnnualPrice(pricing.annualPrice.toString());
                setEditMonthlyLink(pricing.monthlyLink || '');
                setEditAnnualLink(pricing.annualLink || '');
            }
            if (globalSettings) {
                setScannerMaintenance(!!globalSettings.scannerMaintenance);
            }
        }
    }, [loadingSettings, pricing, globalSettings]);

    const logAction = async (action: string, details: string, targetUser?: User) => {
        try {
            await addDoc(collection(db, 'admin_logs'), {
                adminId: currentUser.uid,
                adminName: currentUser.name || 'Admin',
                action,
                details,
                targetUserId: targetUser?.uid || null,
                targetUserName: targetUser?.name || null,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Failed to log admin action:", error);
        }
    };

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const querySnapshot = await getDocs(collection(db, 'users'));
            const userList: User[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as User;
                userList.push({
                    ...data,
                    uid: doc.id,
                    role: data.role || 'user',
                    status: data.status || 'active'
                });
            });
            setUsers(userList);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            showToast('Erro ao carregar lista de usuários.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        const interval = setInterval(fetchUsers, 60000); 
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab === 'logs' && canViewLogs) {
            setLoadingLogs(true);
            const q = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const logsData: AdminLog[] = [];
                snapshot.forEach(doc => {
                    logsData.push({ id: doc.id, ...doc.data() } as AdminLog);
                });
                setLogs(logsData);
                setLoadingLogs(false);
            });
            return () => unsubscribe();
        }
    }, [activeTab, canViewLogs]);

    const filteredUsers = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return users.filter(user => 
            user.name.toLowerCase().includes(lowerTerm) ||
            user.email.toLowerCase().includes(lowerTerm) ||
            user.uid.toLowerCase().includes(lowerTerm) ||
            user.cpf?.includes(lowerTerm)
        );
    }, [users, searchTerm]);

    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        
        return {
            total: users.length,
            active: users.filter(u => u.status === 'active').length,
            blocked: users.filter(u => u.status === 'blocked').length,
            expired: users.filter(u => {
                if (!u.subscriptionExpiresAt) return false;
                const [y, m, d] = u.subscriptionExpiresAt.split('-').map(Number);
                const expiry = new Date(y, m - 1, d);
                return expiry < now;
            }).length
        };
    }, [users]);

    const isUserOnline = (user: User) => {
        if (!user.lastSeen) return false;
        let lastSeenTime = 0;
        if (user.lastSeen.toMillis) lastSeenTime = user.lastSeen.toMillis();
        else if (user.lastSeen.seconds) lastSeenTime = user.lastSeen.seconds * 1000;
        else if (user.lastSeen instanceof Date) lastSeenTime = user.lastSeen.getTime();
        else if (typeof user.lastSeen === 'string') lastSeenTime = new Date(user.lastSeen).getTime();
        return (Date.now() - lastSeenTime) < 2 * 60 * 1000;
    };

    const handleToggleStatus = async (user: User) => {
        if (!canBlockUsers) return;
        if (user.uid === currentUser.uid) return;
        if ((user.role === 'super_admin' || user.role === 'admin') && !isSuperAdmin) return;
        const newStatus: UserStatus = user.status === 'active' ? 'blocked' : 'active';
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { status: newStatus });
            await logAction(newStatus === 'blocked' ? 'Bloqueio de Usuário' : 'Desbloqueio de Usuário', `Status alterado de ${user.status} para ${newStatus}`, user);
            setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, status: newStatus } : u));
            showToast(`Usuário ${newStatus === 'active' ? 'desbloqueado' : 'bloqueado'} com sucesso.`, 'success');
        } catch (error) {
            showToast('Erro ao atualizar status.', 'error');
        }
    };

    const handleOpenEdit = (user: User) => {
        if (!canEditUsers) return;
        setEditingUser(user);
        setNewName(user.name);
        setNewEmail(user.email);
        setNewCpf(user.cpf || '');
        setSubscriptionDate(user.subscriptionExpiresAt || '');
        setNewRole(user.role || 'user');
        setInternalNotes(user.internalNotes || ''); 
    };

    const handleExtendSubscription = (monthsToAdd: number) => {
        let baseDate = new Date(); 
        if (subscriptionDate) {
            const [y, m, d] = subscriptionDate.split('-').map(Number);
            const currentExpiry = new Date(y, m - 1, d);
            if (currentExpiry > new Date()) baseDate = currentExpiry;
        }
        baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
        setSubscriptionDate(baseDate.toISOString().split('T')[0]);
    };

    // Nova função para dar 7 dias
    const handleGrantTrial = () => {
        const trialDate = new Date();
        trialDate.setDate(trialDate.getDate() + 7);
        setSubscriptionDate(trialDate.toISOString().split('T')[0]);
        showToast('Data definida para 7 dias a partir de hoje.', 'success');
    };

    const handleRevokeSubscription = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setSubscriptionDate(yesterday.toISOString().split('T')[0]);
        showToast('Data definida para ontem. Salve para confirmar o cancelamento.', 'info');
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            const userRef = doc(db, 'users', editingUser.uid);
            await updateDoc(userRef, { 
                name: newName, 
                email: newEmail, 
                cpf: newCpf.replace(/\D/g, ''), 
                subscriptionExpiresAt: subscriptionDate || null, 
                role: newRole, 
                internalNotes: internalNotes 
            });
            await logAction('Edição de Usuário', `Atualizado`, editingUser);
            setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, name: newName, email: newEmail, cpf: newCpf.replace(/\D/g, ''), subscriptionExpiresAt: subscriptionDate || null, role: newRole, internalNotes: internalNotes } : u));
            showToast('Dados do usuário atualizados.', 'success');
            setEditingUser(null);
        } catch (error) {
            showToast('Erro ao salvar alterações.', 'error');
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canCreateUsers) return;
        setIsCreatingUser(true);
        try {
            const result = await adminCreateUser(createName, createEmail, createPassword, createRole, createCpf);
            if (result.success) {
                await logAction('Criação de Usuário', `Novo usuário: ${createEmail}`, { name: createName, email: createEmail } as User);
                showToast(result.message, 'success');
                setIsCreateUserModalOpen(false);
                setCreateName(''); setCreateEmail(''); setCreatePassword(''); setCreateCpf(''); setCreateRole('user');
                await fetchUsers(); 
            } else showToast(result.message, 'error');
        } catch (error) {
            showToast('Erro ao criar usuário.', 'error');
        } finally {
            setIsCreatingUser(false);
        }
    };
    
    const handleSaveSettings = async () => {
        if (!canManagePricing) return;
        
        // Validação de Preços
        const mPrice = parseFloat(editMonthlyPrice.replace(',', '.'));
        const aPrice = parseFloat(editAnnualPrice.replace(',', '.'));
        if (isNaN(mPrice) || isNaN(aPrice)) {
            showToast('Por favor, insira valores válidos.', 'error');
            return;
        }

        setIsSavingPricing(true);
        try {
            // Salva Pricing
            const pricingRef = doc(db, 'settings', 'pricing');
            await setDoc(pricingRef, {
                monthlyPrice: mPrice,
                annualPrice: aPrice,
                monthlyLink: editMonthlyLink,
                annualLink: editAnnualLink
            }, { merge: true });

            // Salva Global Settings (Features)
            const globalRef = doc(db, 'settings', 'global');
            await setDoc(globalRef, {
                scannerMaintenance: scannerMaintenance
            }, { merge: true });

            await logAction('Alteração de Configurações', `Preços ou Features atualizados.`);
            showToast('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Erro ao atualizar configurações.', 'error');
        } finally {
            setIsSavingPricing(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!editingUser) return;
        const { success, message } = await sendPasswordResetEmail(editingUser.email);
        if (success) await logAction('Reset de Senha', 'Email enviado', editingUser);
        showToast(message, success ? 'success' : 'error');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Copiado!', 'success');
    };

    const inputClasses = "w-full p-3 bg-white text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200";

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case 'super_admin':
            case 'admin': return <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold border border-purple-200 uppercase tracking-wider flex items-center gap-1 w-fit"><ShieldCheckIcon className="text-xs"/> Super Admin</span>;
            case 'operational_admin': return <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-200 uppercase tracking-wider flex items-center gap-1 w-fit"><AdminPanelSettingsIcon className="text-xs"/> Operacional</span>;
            case 'support_admin': return <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold border border-green-200 uppercase tracking-wider flex items-center gap-1 w-fit"><SupportAgentIcon className="text-xs"/> Suporte</span>;
            default: return <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold border border-gray-200 uppercase tracking-wider w-fit">Usuário</span>;
        }
    };

    // Calculate Subscription Status for visual feedback
    const isSubscriptionActive = subscriptionDate && new Date(subscriptionDate) >= new Date(new Date().setHours(0,0,0,0));

    return (
        <div className="p-4 space-y-6 flex flex-col h-full overflow-hidden">
            {/* ... (Header and Tabs code remains same) ... */}
            <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Painel Administrativo
                        {getRoleBadge(userRole)}
                    </h1>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-xl mt-4 sm:mt-0 shadow-inner overflow-x-auto">
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><GroupIcon className="text-lg" /> Usuários</button>
                    <button onClick={() => setActiveTab('support')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'support' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ChatBubbleIcon className="text-lg" /> Suporte</button>
                    {canViewLogs && <button onClick={() => setActiveTab('logs')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><HistoryIcon className="text-lg" /> Auditoria</button>}
                    {canManagePricing && <button onClick={() => setActiveTab('settings')} className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><AdminPanelSettingsIcon className="text-lg" /> Configurações</button>}
                </div>
            </div>

            {activeTab === 'support' && (
                <div className="flex-1 min-h-0 animate-fade-in">
                    <AdminSupport currentUser={currentUser} allUsers={users} />
                </div>
            )}

            {activeTab === 'logs' && canViewLogs && (
                <div className="flex-1 min-h-0 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200 flex flex-col h-full">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                            <HistoryIcon className="text-gray-400" />
                            <h2 className="font-bold text-gray-700">Histórico de Ações</h2>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Alvo</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detalhes</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loadingLogs ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="flex justify-center"><span className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></span></div></td></tr>
                                    ) : logs.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('pt-BR') : '...'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-blue-600">{log.adminName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-[10px] font-semibold rounded-full ${log.action.includes('Bloqueio') ? 'bg-red-100 text-red-800' : log.action.includes('Criação') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{log.action}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">{log.targetUserName || '-'}</td>
                                                <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">{log.details}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ... (Users Tab logic same as before) ... */}
            {activeTab === 'users' && (
                <div className="flex-1 min-h-0 flex flex-col space-y-4 animate-fade-in">
                    {/* ... (Stats and Search Bar code) ... */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-3 border border-gray-100">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-full text-blue-600 flex-shrink-0"><GroupIcon className="text-xl"/></div>
                            <div><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{stats.total}</p></div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-3 border border-gray-100">
                            <div className="w-10 h-10 flex items-center justify-center bg-green-100 rounded-full text-green-600 flex-shrink-0"><CheckCircleIcon className="text-xl"/></div>
                            <div><p className="text-xs text-gray-500">Ativos</p><p className="text-xl font-bold">{stats.active}</p></div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-3 border border-gray-100">
                            <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-full text-red-600 flex-shrink-0"><LockIcon className="text-xl"/></div>
                            <div><p className="text-xs text-gray-500">Bloqueados</p><p className="text-xl font-bold">{stats.blocked}</p></div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-3 border border-gray-100">
                            <div className="w-10 h-10 flex items-center justify-center bg-orange-100 rounded-full text-orange-600 flex-shrink-0"><CalendarClockIcon className="text-xl"/></div>
                            <div><p className="text-xs text-gray-500">Vencidos</p><p className="text-xl font-bold">{stats.expired}</p></div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-200 shrink-0">
                        <div className="relative w-full md:w-1/2">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
                            <input type="text" placeholder="Nome, Email, CPF ou ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-gray-50 text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-inner" />
                        </div>
                        {canCreateUsers && <button onClick={() => setIsCreateUserModalOpen(true)} className="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95 text-sm"><PlusIcon className="text-xl" /> Novo Usuário</button>}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CPF</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Plano Atual</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Criado em</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><div className="flex justify-center"><span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></span></div></td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">Nenhum usuário encontrado.</td></tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10 relative">
                                                            <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={user.profileImage || 'https://gravatar.com/avatar/?d=mp'} alt="" />
                                                            <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${user.status === 'blocked' ? 'bg-red-500' : (isUserOnline(user) ? 'bg-green-500' : 'bg-gray-300')}`}></span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="flex items-center gap-2"><div className="text-sm font-bold text-gray-900">{user.name}</div></div>
                                                            <div className="text-xs text-gray-500">{user.email}</div>
                                                            <button onClick={() => copyToClipboard(user.uid)} className="text-[10px] text-gray-400 font-mono hover:text-blue-500 mt-0.5">ID: {user.uid.substring(0, 8)}...</button>
                                                            <div className="mt-1">{getRoleBadge(user.role || 'user')}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                    {user.cpf || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.subscriptionExpiresAt ? (
                                                        <div className="flex flex-col">
                                                            <div className={`text-sm font-bold ${new Date(user.subscriptionExpiresAt) < new Date() ? 'text-red-600' : 'text-blue-600'}`}>{new Date(user.subscriptionExpiresAt) < new Date() ? 'Expirado' : 'Premium'}</div>
                                                            <div className="text-xs text-gray-500">Vence: {formatDate(user.subscriptionExpiresAt)}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col"><span className="text-sm font-bold text-gray-600">Free / Vitalício</span></div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(user.createdAt)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end items-center space-x-2">
                                                        {canBlockUsers && <button onClick={() => handleToggleStatus(user)} className={`p-2 rounded-lg border ${user.status === 'active' ? 'text-gray-400 hover:text-red-600 bg-white' : 'text-red-600 bg-red-50'}`} disabled={user.uid === currentUser.uid}>{user.status === 'active' ? <LockOpenIcon className="text-lg"/> : <LockIcon className="text-lg"/>}</button>}
                                                        {canEditUsers && <button onClick={() => handleOpenEdit(user)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100"><EditIcon className="text-lg" /></button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && canManagePricing && (
                <div className="flex-1 min-h-0 animate-fade-in flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                                <AdminPanelSettingsIcon className="text-2xl" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Ajustes do Sistema</h2>
                                <p className="text-xs text-gray-500">Valores, links e funcionalidades do app</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveSettings}
                            disabled={isSavingPricing || loadingSettings}
                            className="bg-black text-white font-bold py-2.5 px-8 rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 flex items-center gap-2 disabled:bg-gray-300 disabled:shadow-none active:scale-95"
                        >
                            {isSavingPricing ? <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Salvando...</span> : <><CheckCircleIcon className="text-xl" /> Salvar Alterações</>}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Feature Flags Section */}
                            <div className="space-y-6 lg:col-span-2">
                                <div className="flex items-center gap-2 text-gray-800 font-bold border-b border-gray-100 pb-3 mb-4">
                                    <ConstructionIcon className="text-orange-600" />
                                    <span>Funcionalidades do App</span>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">Manutenção do Scanner</h4>
                                        <p className="text-xs text-gray-500 mt-1 max-w-md">
                                            Se ativado, o botão de escanear nota será desabilitado para os usuários e exibirá uma mensagem de "Em manutenção".
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={scannerMaintenance}
                                                onChange={(e) => setScannerMaintenance(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-900">{scannerMaintenance ? 'Em Manutenção' : 'Funcionando'}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* ... Rest of settings (pricing, links) ... */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-gray-800 font-bold border-b border-gray-100 pb-3 mb-4">
                                    <AttachMoneyIcon className="text-green-600" />
                                    <span>Tabela de Preços</span>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Plano Mensal (Exibição)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={editMonthlyPrice}
                                                onChange={e => setEditMonthlyPrice(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold text-xl text-gray-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-blue-200 transition-colors">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Plano Anual (Exibição)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">R$</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={editAnnualPrice}
                                                onChange={e => setEditAnnualPrice(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono font-bold text-xl text-gray-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-gray-800 font-bold border-b border-gray-100 pb-3 mb-4">
                                    <span className="material-symbols-outlined text-blue-600">link</span>
                                    <span>Páginas de Checkout</span>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">Link Mensal</label>
                                        <input type="url" value={editMonthlyLink} onChange={e => setEditMonthlyLink(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-sm text-blue-600 font-medium" />
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">Link Anual</label>
                                        <input type="url" value={editAnnualLink} onChange={e => setEditAnnualLink(e.target.value)} className="w-full p-4 border border-gray-200 rounded-xl text-sm text-blue-600 font-medium" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ... (Modals remain the same) ... */}
            {editingUser && canEditUsers && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-fade-in border border-gray-200">
                        {/* Header Compacto com Identidade */}
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden shrink-0">
                                    <img src={editingUser.profileImage || 'https://gravatar.com/avatar/?d=mp'} alt="User" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 leading-tight">Editar Usuário</h2>
                                    <p className="text-xs text-gray-500 font-mono">ID: {editingUser.uid.substring(0,8)}...</p>
                                </div>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200/50 transition-colors">
                                <XMarkIcon className="text-xl" />
                            </button>
                        </div>

                        {/* Corpo Scrollável */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
                            
                            {/* Seção 1: Dados Cadastrais (Grid) */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 border-b border-blue-100 pb-2">
                                    <ProfileIcon className="text-sm"/> Dados Cadastrais
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Nome Completo</label>
                                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className={inputClasses} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">CPF (Somente Números)</label>
                                        <input type="text" value={newCpf} onChange={e => setNewCpf(e.target.value.replace(/\D/g, ''))} className={inputClasses} maxLength={11} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Email de Login</label>
                                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={inputClasses} />
                                    </div>
                                    {canManageAdmins && (
                                        <div className="md:col-span-2 bg-purple-50 p-3 rounded-xl border border-purple-100">
                                            <label className="block text-xs font-bold text-purple-700 uppercase mb-1.5 ml-1 flex items-center gap-2"><AdminPanelSettingsIcon className="text-sm"/> Nível de Acesso (Role)</label>
                                            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" disabled={editingUser.uid === currentUser.uid}>
                                                <option value="user">Usuário Comprador (Padrão)</option>
                                                <option value="support_admin">Admin Suporte</option>
                                                <option value="operational_admin">Admin Operacional</option>
                                                <option value="super_admin">Super Admin</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seção 2: Assinatura (Card Renovado) */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Header do Card de Assinatura com Status */}
                                <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <CalendarClockIcon className="text-gray-400 text-sm"/>
                                        <h3 className="text-sm font-bold text-gray-700">Assinatura Premium</h3>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isSubscriptionActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                        {isSubscriptionActive ? 'ATIVA' : 'EXPIRADA / INATIVA'}
                                    </span>
                                </div>

                                <div className="p-5">
                                    {/* Date Input Area */}
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Vencimento do Plano</label>
                                        <div className="relative">
                                            <input 
                                                type="date" 
                                                value={subscriptionDate} 
                                                onChange={e => setSubscriptionDate(e.target.value)} 
                                                className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" 
                                            />
                                        </div>
                                    </div>

                                    {/* Quick Actions Grid */}
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block ml-1">Ações Rápidas</label>
                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        {/* Trial Button */}
                                        <button onClick={handleGrantTrial} className="flex items-center gap-3 p-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors text-left group">
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <StarIcon className="text-sm" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-orange-800">Trial 7 Dias</div>
                                                <div className="text-[10px] text-orange-600/70 font-medium">Conceder teste</div>
                                            </div>
                                        </button>

                                        {/* +1 Month Button */}
                                        <button onClick={() => handleExtendSubscription(1)} className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left group">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <PlusIcon className="text-sm" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-blue-800">+1 Mês</div>
                                                <div className="text-[10px] text-blue-600/70 font-medium">Adicionar tempo</div>
                                            </div>
                                        </button>

                                        {/* +1 Year Button */}
                                        <button onClick={() => handleExtendSubscription(12)} className="flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left group">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <CalendarClockIcon className="text-sm" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-indigo-800">+1 Ano</div>
                                                <div className="text-[10px] text-indigo-600/70 font-medium">Renovação anual</div>
                                            </div>
                                        </button>

                                        {/* Lifetime Button */}
                                        <button onClick={() => setSubscriptionDate('')} className="flex items-center gap-3 p-3 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors text-left group">
                                            <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                <span className="material-symbols-outlined text-sm">all_inclusive</span>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-purple-800">Vitalício</div>
                                                <div className="text-[10px] text-purple-600/70 font-medium">Acesso eterno</div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Revoke Button */}
                                    <button onClick={handleRevokeSubscription} className="w-full py-2.5 border border-red-100 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 hover:border-red-200 transition-all flex items-center justify-center gap-2">
                                        <XMarkIcon className="text-sm"/> Revogar Acesso Premium
                                    </button>
                                </div>
                            </div>

                            {/* Seção 3: Notas Internas */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <DescriptionIcon className="text-sm"/> Anotações (Admin)
                                </h3>
                                <textarea 
                                    value={internalNotes} 
                                    onChange={e => setInternalNotes(e.target.value)} 
                                    className="w-full p-3 border border-yellow-200 bg-yellow-50/50 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 outline-none resize-none h-24 placeholder-gray-400"
                                    placeholder="Observações sobre este usuário..."
                                />
                            </div>
                        </div>

                        {/* Footer Fixo */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                            <button onClick={handlePasswordReset} className="text-gray-500 hover:text-gray-800 text-xs font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors">
                                <KeyIcon className="text-sm"/> Resetar Senha
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingUser(null)} className="px-5 py-2.5 text-gray-600 font-bold text-sm hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
                                <button onClick={handleSaveUser} className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-all active:scale-95 flex items-center gap-2">
                                    <CheckCircleIcon className="text-lg"/> Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {isCreateUserModalOpen && canCreateUsers && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-gray-900/40 flex justify-center items-center z-[9999] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800">Criar Novo Usuário</h2>
                            <button onClick={() => setIsCreateUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0 aspect-square"><XMarkIcon className="text-xl" /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-5">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nome Completo</label><input type="text" value={createName} onChange={e => setCreateName(e.target.value)} className={inputClasses} placeholder="Ex: João Silva" required /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">CPF</label><input type="text" value={createCpf} onChange={e => setCreateCpf(e.target.value)} className={inputClasses} placeholder="000.000.000-00" required /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email de Login</label><input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} className={inputClasses} placeholder="exemplo@email.com" required /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Senha Temporária</label><input type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} className={inputClasses} placeholder="Mínimo 6 caracteres" required minLength={6} /></div>
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                                <label className="block text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1.5 flex items-center gap-2"><AdminPanelSettingsIcon className="text-lg" /> Função (Role)</label>
                                <select value={createRole} onChange={(e) => setCreateRole(e.target.value as UserRole)} className="w-full p-3 border border-yellow-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500 outline-none appearance-none">
                                    <option value="user">Usuário Comprador</option>
                                    {canManageAdmins && (
                                        <>
                                            <option value="support_admin">Admin Suporte</option>
                                            <option value="operational_admin">Admin Operacional</option>
                                            <option value="super_admin">Super Admin</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div className="pt-4 border-t border-gray-100"><button type="submit" disabled={isCreatingUser} className="w-full py-3.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-all shadow-md disabled:bg-green-300 flex items-center justify-center active:scale-95">{isCreatingUser ? <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Criando...</span> : 'Criar Usuário'}</button></div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
