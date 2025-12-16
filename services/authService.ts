
import type { User, UserRole } from '../types';
import { auth, db, googleProvider, firebaseConfig } from './firebaseService';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail as firebaseSendPasswordResetEmail, signInWithPopup, getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
// @ts-ignore
import { initializeApp, deleteApp } from 'firebase/app';
import { DEFAULT_PROFILE_IMAGE, DEFAULT_REMINDER_SETTINGS } from '../types'; // Import defaults from types

export const register = async (name: string, email: string, password: string, phone: string): Promise<{ success: boolean, message: string, user?: User }> => {
    try {
        if (!name || !email || !password || !phone) {
            return { success: false, message: 'Nome, email, senha e celular são obrigatórios.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, message: 'Formato de email inválido.' };
        }
        
        // Validação de senha forte: 8 caracteres, letra, número e especial
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return { success: false, message: 'A senha deve ter no mínimo 8 caracteres, contendo letras, números e caracteres especiais (@$!%*#?&).' };
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
            phone: `+55${cleanPhone}`, // Salva com o prefixo +55
            profileImage: DEFAULT_PROFILE_IMAGE,
            reminderSettings: DEFAULT_REMINDER_SETTINGS,
            role: 'user', // Default role
            status: 'active', // Default status
            createdAt: new Date().toISOString(),
            subscriptionExpiresAt: null,
        };
        await setDoc(userDocRef, newUser, { merge: true }); // Use merge to avoid overwriting if doc exists

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

// Função Especial para Admin criar usuários sem perder a sessão
export const adminCreateUser = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean, message: string }> => {
    let secondaryApp: any = null;
    try {
        // 1. Inicializa uma instância secundária do Firebase App
        // Isso evita que o createUserWithEmailAndPassword deslogue o Admin atual da instância principal 'auth'
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        // 2. Cria o usuário na Authentication usando a instância secundária
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;

        // 3. Atualiza o perfil básico
        await updateProfile(newUser, { displayName: name });

        // 4. Cria o documento no Firestore (usando a instância 'db' principal, pois o admin tem permissão de escrita)
        const userDocRef = doc(db, 'users', newUser.uid);
        const newUserData: User = {
            uid: newUser.uid,
            name,
            email,
            phone: '', // Pode ser editado depois
            profileImage: DEFAULT_PROFILE_IMAGE,
            reminderSettings: DEFAULT_REMINDER_SETTINGS,
            role: role,
            status: 'active',
            createdAt: new Date().toISOString(),
            subscriptionExpiresAt: null,
        };
        
        await setDoc(userDocRef, newUserData);

        // 5. Desloga da instância secundária
        await signOut(secondaryAuth);

        return { success: true, message: 'Usuário criado com sucesso!' };

    } catch (error: any) {
        console.error("Admin create user error:", error);
        let errorMessage = 'Erro ao criar usuário.';
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Email já está em uso.';
        if (error.code === 'auth/weak-password') errorMessage = 'Senha muito fraca.';
        return { success: false, message: errorMessage };
    } finally {
        // 6. Limpa a instância secundária para liberar memória
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

        // Fetch user data to check status/role
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);
        let userData: User;

        if (docSnap.exists()) {
            userData = docSnap.data() as User;
            
            // Verificação de Bloqueio
            if (userData.status === 'blocked') {
                await signOut(auth); // Desloga imediatamente
                return { success: false, message: 'Sua conta foi bloqueada pelo administrador.' };
            }
        } else {
            // Fallback se documento não existir (usuário antigo ou erro na criação)
             userData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                email: firebaseUser.email || '',
                phone: '',
                role: 'user',
                status: 'active',
            };
        }

        return { success: true, user: userData, message: 'Login bem-sucedido!' };

    } catch (error: any) {
        console.error("Firebase login error:", error);
        let errorMessage = 'Ocorreu um erro durante o login. Tente novamente.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Email ou senha inválidos.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Endereço de e-mail inválida.';
        } else if (error.code === 'auth/network-request-failed') {
             errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde.';
        }
        return { success: false, message: errorMessage };
    }
};

export const loginWithGoogle = async (): Promise<{ success: boolean, user?: User, message: string }> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const firebaseUser = result.user;

        // Verifica se o usuário já existe no Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);

        let userData: User;

        if (docSnap.exists()) {
            userData = docSnap.data() as User;
            // Verificação de Bloqueio
            if (userData.status === 'blocked') {
                await signOut(auth);
                return { success: false, message: 'Sua conta foi bloqueada pelo administrador.' };
            }
        } else {
            // Cria novo documento se for o primeiro login com Google
            userData = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Usuário Google',
                email: firebaseUser.email || '',
                phone: '', // Google não retorna telefone por padrão facilmente
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
        let errorMessage = 'Erro ao entrar com Google.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelado pelo usuário.';
        } else if (error.code === 'auth/unauthorized-domain') {
            // Mensagem específica para ajudar o usuário a configurar o Firebase
            errorMessage = `Domínio não autorizado (${window.location.hostname}). Adicione-o no Firebase Console > Authentication > Settings > Authorized Domains.`;
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'O navegador bloqueou o popup de login. Permita popups para este site.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'Já existe uma conta com este email associada a outro método de login.';
        }
        return { success: false, message: errorMessage };
    }
};

export const logout = async (): Promise<{ success: boolean, message: string }> => {
    try {
        await signOut(auth);
        return { success: true, message: 'Logout realizado com sucesso!' };
    } catch (error: any) {
        console.error("Firebase logout error:", error);
        return { success: false, message: 'Ocorreu um erro durante o logout. Tente novamente.' };
    }
};

export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean, message: string }> => {
    try {
        if (!email) {
            return { success: false, message: 'Por favor, insira seu e-mail.' };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, message: 'Formato de e-mail inválido.' };
        }
        await firebaseSendPasswordResetEmail(auth, email);
        return { success: true, message: 'Link de redefinição de senha enviado para o seu e-mail!' };
    } catch (error: any) {
        console.error("Firebase password reset error:", error);
        let errorMessage = 'Ocorreu um erro ao enviar o e-mail de redefinição.';
        if (error.code === 'auth/invalid-email') {
            errorMessage = 'Endereço de e-mail inválido.';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'Nenhum usuário encontrado com este e-mail.';
        } else if (error.code === 'auth/network-request-failed') {
             errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
        }
        return { success: false, message: errorMessage };
    }
};
