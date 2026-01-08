
import type { User, UserRole } from '../types';
import { auth, db, firebaseConfig } from './firebaseService';
// @ts-ignore
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail as firebaseSendPasswordResetEmail, getAuth, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
// @ts-ignore
import { initializeApp, deleteApp } from 'firebase/app';
import { DEFAULT_PROFILE_IMAGE, DEFAULT_REMINDER_SETTINGS } from '../types';

const isValidCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};

// Gera um email fictício para o Firebase Auth baseado no CPF
const generateAuthEmail = (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    return `${cleanCpf}@login.meugasto`;
};

// Helper para tratar erros de API bloqueada e outros erros comuns do Auth
const handleAuthError = (error: any): string => {
    const code = error.code || '';
    const message = error.message || '';
    
    // Erro específico reportado (403 Forbidden na API Identity Toolkit)
    if (message.includes('requests-to-this-api-identitytoolkit') || code === 'auth/operation-not-allowed') {
        return 'A API Key configurada não tem permissão para Autenticação (Identity Toolkit). Verifique as restrições da chave no Google Cloud Console.';
    }
    
    if (code === 'auth/email-already-in-use') return 'Este CPF já está cadastrado.';
    if (code === 'auth/weak-password') return 'A senha é muito fraca.';
    if (code === 'auth/invalid-email') return 'Formato de dados inválido.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'CPF ou senha incorretos.';
    if (code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde um momento e tente novamente.';
    if (code === 'auth/network-request-failed') return 'Erro de conexão. Verifique sua internet.';
    
    return 'Ocorreu um erro inesperado. Tente novamente.';
};

export const register = async (name: string, cpf: string, password: string, phone: string, contactEmail: string = ''): Promise<{ success: boolean, message: string, user?: User }> => {
    try {
        if (!name || !cpf || !password || !phone) {
            return { success: false, message: 'Todos os campos obrigatórios devem ser preenchidos.' };
        }

        const cleanCpf = cpf.replace(/\D/g, '');
        if (!isValidCPF(cleanCpf)) {
            return { success: false, message: 'Este número de CPF parece inválido. Verifique os dígitos.' };
        }

        const authEmail = generateAuthEmail(cleanCpf);
        const cleanPhone = phone.replace(/\D/g, '');
        const finalContactEmail = contactEmail.trim().toLowerCase();

        // 1. Cria o usuário no Auth usando o CPF como "email"
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
        const firebaseUser = userCredential.user;

        try {
            // 2. APROVISIONAMENTO: Verifica assinatura PENDENTE pelo CPF
            let subscriptionExpiresAt = null;
            let lastPayment = null; 
            
            const pendingSubRef = doc(db, 'pending_subscriptions', cleanCpf);
            const pendingSubSnap = await getDoc(pendingSubRef);

            let successMessage = 'Cadastro realizado com sucesso!';

            if (pendingSubSnap.exists()) {
                const pendingData = pendingSubSnap.data();
                subscriptionExpiresAt = pendingData.subscriptionExpiresAt || null;
                lastPayment = pendingData.lastPayment || null;
                
                // Remove a pendência pois já foi vinculada
                await deleteDoc(pendingSubRef);
                console.log("Assinatura pendente vinculada ao novo usuário via CPF.");
                successMessage = 'Cadastro realizado! Sua assinatura foi localizada e ativada.';
            }

            // 3. Salva os dados do usuário no Firestore
            await updateProfile(firebaseUser, { displayName: name });

            const userDocRef = doc(db, 'users', firebaseUser.uid);
            
            const newUser: User = { 
                uid: firebaseUser.uid, 
                name, 
                email: finalContactEmail || authEmail, // Salva o email de contato visualmente ou o de login
                phone: `+55${cleanPhone}`,
                cpf: cleanCpf,
                profileImage: DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS,
                role: 'user', 
                status: 'active', 
                createdAt: new Date().toISOString(),
                subscriptionExpiresAt: subscriptionExpiresAt,
                lastPayment: lastPayment || undefined,
                scanCount: 0, // Inicializa contagem de scans
            };
            
            // Sanitização para remover undefined
            const firestoreData = JSON.parse(JSON.stringify(newUser));
            if (!lastPayment) delete firestoreData.lastPayment;

            await setDoc(userDocRef, firestoreData);

            // Desloga para garantir refresh completo na próxima entrada
            await signOut(auth);

            return { success: true, message: successMessage };

        } catch (innerError: any) {
            console.error("Erro interno no cadastro (rollback):", innerError);
            try { await deleteUser(firebaseUser); } catch(e) {}
            return { success: false, message: 'Erro ao salvar dados. Tente novamente.' };
        }

    } catch (error: any) {
        console.error("Firebase registration error:", error);
        return { success: false, message: handleAuthError(error) };
    }
};

export const adminCreateUser = async (name: string, email: string, password: string, role: UserRole, cpf: string): Promise<{ success: boolean, message: string }> => {
    let secondaryApp: any = null;
    try {
        const cleanCpf = cpf.replace(/\D/g, '');
        if (!isValidCPF(cleanCpf)) return { success: false, message: 'CPF inválido.' };

        // Admin pode criar usuário via CPF
        const authEmail = generateAuthEmail(cleanCpf); 
        const contactEmail = email.trim().toLowerCase();

        // Verifica duplicidade CPF
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('cpf', '==', cleanCpf));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) return { success: false, message: 'CPF já cadastrado.' };

        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, password);
        const newUser = userCredential.user;

        await updateProfile(newUser, { displayName: name });

        const userDocRef = doc(db, 'users', newUser.uid);
        const newUserData: User = {
            uid: newUser.uid,
            name,
            email: contactEmail,
            phone: '', 
            cpf: cleanCpf,
            profileImage: DEFAULT_PROFILE_IMAGE,
            reminderSettings: DEFAULT_REMINDER_SETTINGS,
            role: role,
            status: 'active',
            createdAt: new Date().toISOString(),
            subscriptionExpiresAt: null,
            scanCount: 0,
        };
        
        await setDoc(userDocRef, newUserData);
        await signOut(secondaryAuth);

        return { success: true, message: 'Usuário criado com sucesso via CPF!' };

    } catch (error: any) {
        console.error("Admin create user error:", error);
        return { success: false, message: handleAuthError(error) };
    } finally {
        if (secondaryApp) await deleteApp(secondaryApp);
    }
};

export const login = async (cpf: string, password: string): Promise<{ success: boolean, user?: User, message: string }> => {
    try {
        if (!cpf || !password) return { success: false, message: 'CPF e senha são obrigatórios.' };
        
        const cleanCpf = cpf.replace(/\D/g, '');
        const authEmail = generateAuthEmail(cleanCpf);
        
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
        const firebaseUser = userCredential.user;
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        let userData: User;
        if (docSnap.exists()) {
            userData = docSnap.data() as User;
            if (userData.status === 'blocked') {
                await signOut(auth);
                return { success: false, message: 'Sua conta foi bloqueada pelo administrador.' };
            }
        } else {
             // Fallback improvável mas seguro
             userData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuário',
                email: firebaseUser.email || '',
                phone: '',
                role: 'user',
                status: 'active',
                profileImage: DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS,
                createdAt: new Date().toISOString(),
                subscriptionExpiresAt: null,
                cpf: cleanCpf
            };
        }
        return { success: true, user: userData, message: 'Login bem-sucedido!' };
    } catch (error: any) {
        console.error("Firebase login error:", error);
        return { success: false, message: handleAuthError(error) };
    }
};

export const logout = async (): Promise<{ success: boolean, message: string }> => {
    try {
        await signOut(auth);
        return { success: true, message: 'Logout realizado com sucesso!' };
    } catch (error: any) {
        return { success: false, message: 'Erro durante o logout.' };
    }
};

export const sendPasswordResetEmail = async (identifier: string): Promise<{ success: boolean, message: string }> => {
    try {
        // Se parece um email, tenta reset normal.
        if (identifier.includes('@')) {
             await firebaseSendPasswordResetEmail(auth, identifier.trim().toLowerCase());
             return { success: true, message: 'Link de redefinição enviado!' };
        } else {
             return { success: false, message: 'Para redefinir senha via CPF, entre em contato com o suporte.' };
        }
    } catch (error: any) {
        return { success: false, message: handleAuthError(error) };
    }
};
