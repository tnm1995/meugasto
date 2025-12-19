
import type { User, UserRole } from '../types';
import { auth, db, googleProvider, firebaseConfig } from './firebaseService';
// @ts-ignore
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail as firebaseSendPasswordResetEmail, signInWithPopup, getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
// @ts-ignore
import { initializeApp, deleteApp } from 'firebase/app';
import { DEFAULT_PROFILE_IMAGE, DEFAULT_REMINDER_SETTINGS } from '../types'; // Import defaults from types

// Helper para validar CPF (Algoritmo Oficial)
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

export const register = async (name: string, email: string, password: string, phone: string, cpf: string): Promise<{ success: boolean, message: string, user?: User }> => {
    try {
        if (!name || !email || !password || !phone || !cpf) {
            return { success: false, message: 'Todos os campos são obrigatórios.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, message: 'Formato de email inválido.' };
        }
        
        // Validação de senha forte
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return { success: false, message: 'A senha deve ter no mínimo 8 caracteres, contendo letras, números e caracteres especiais (@$!%*#?&).' };
        }

        // Limpa e Valida CPF
        const cleanCpf = cpf.replace(/\D/g, '');
        if (!isValidCPF(cleanCpf)) {
            return { success: false, message: 'CPF inválido.' };
        }

        // Verifica unicidade do CPF no Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('cpf', '==', cleanCpf));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return { success: false, message: 'Este CPF já está cadastrado em outra conta.' };
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
            return { success: false, message: 'Número de celular inválido.' };
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        await updateProfile(firebaseUser, { displayName: name });

        // Create a complete user document in Firestore with default values
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const newUser: User = { 
            uid: firebaseUser.uid, 
            name, 
            email, 
            phone: `+55${cleanPhone}`,
            cpf: cleanCpf, // Salva o CPF limpo
            profileImage: DEFAULT_PROFILE_IMAGE,
            reminderSettings: DEFAULT_REMINDER_SETTINGS,
            role: 'user', 
            status: 'active', 
            createdAt: new Date().toISOString(),
            subscriptionExpiresAt: null,
        };
        await setDoc(userDocRef, newUser, { merge: true });

        return { success: true, message: 'Cadastro realizado com sucesso!', user: newUser };

    } catch (error: any) {
        console.error("Firebase registration error:", error);
        let errorMessage = 'Ocorreu um erro durante o cadastro. Tente novamente.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este email já está em uso.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Endereço de e-mail inválido.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'A senha é muito fraca.';
        }
        return { success: false, message: errorMessage };
    }
};

// Função Especial para Admin criar usuários
export const adminCreateUser = async (name: string, email: string, password: string, role: UserRole, cpf: string): Promise<{ success: boolean, message: string }> => {
    let secondaryApp: any = null;
    try {
        const cleanCpf = cpf.replace(/\D/g, '');
        if (!isValidCPF(cleanCpf)) return { success: false, message: 'CPF inválido.' };

        // Verifica unicidade do CPF
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('cpf', '==', cleanCpf));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) return { success: false, message: 'CPF já cadastrado.' };

        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;

        await updateProfile(newUser, { displayName: name });

        const userDocRef = doc(db, 'users', newUser.uid);
        const newUserData: User = {
            uid: newUser.uid,
            name,
            email,
            phone: '', 
            cpf: cleanCpf,
            profileImage: DEFAULT_PROFILE_IMAGE,
            reminderSettings: DEFAULT_REMINDER_SETTINGS,
            role: role,
            status: 'active',
            createdAt: new Date().toISOString(),
            subscriptionExpiresAt: null,
        };
        
        await setDoc(userDocRef, newUserData);
        await signOut(secondaryAuth);

        return { success: true, message: 'Usuário criado com sucesso!' };

    } catch (error: any) {
        console.error("Admin create user error:", error);
        let errorMessage = 'Erro ao criar usuário.';
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Email já está em uso.';
        if (error.code === 'auth/weak-password') errorMessage = 'Senha muito fraca.';
        return { success: false, message: errorMessage };
    } finally {
        if (secondaryApp) {
            await deleteApp(secondaryApp);
        }
    }
};

export const login = async (email: string, password: string): Promise<{ success: boolean, user?: User, message: string }> => {
    try {
        if (!email || !password) {
            return { success: false, message: 'Email e senha são obrigatórios.' };
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
             userData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                email: firebaseUser.email || '',
                phone: '',
                role: 'user',
                status: 'active',
                profileImage: DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS,
                createdAt: new Date().toISOString(),
                subscriptionExpiresAt: null,
            };
        }

        return { success: true, user: userData, message: 'Login bem-sucedido!' };

    } catch (error: any) {
        console.error("Firebase login error:", error);
        let errorMessage = 'Ocorreu um erro durante o login. Tente novamente.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Email ou senha inválidos.';
        }
        return { success: false, message: errorMessage };
    }
};

export const loginWithGoogle = async (): Promise<{ success: boolean, user?: User, message: string }> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

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
            userData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuário Google',
                email: firebaseUser.email || '',
                phone: '',
                profileImage: firebaseUser.photoURL || DEFAULT_PROFILE_IMAGE,
                reminderSettings: DEFAULT_REMINDER_SETTINGS,
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString(),
                subscriptionExpiresAt: null,
            };
            await setDoc(userDocRef, userData);
        }

        return { success: true, user: userData, message: 'Login com Google realizado com sucesso!' };
    } catch (error: any) {
        console.error("Google login error:", error);
        return { success: false, message: 'Erro ao entrar com Google.' };
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

export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean, message: string }> => {
    try {
        if (!email) return { success: false, message: 'Por favor, insira seu e-mail.' };
        await firebaseSendPasswordResetEmail(auth, email);
        return { success: true, message: 'Link de redefinição de senha enviado para o seu e-mail!' };
    } catch (error: any) {
        return { success: false, message: 'Erro ao enviar email de redefinição.' };
    }
};
