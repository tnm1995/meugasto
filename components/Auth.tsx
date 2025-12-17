import React, { useState, useEffect, useRef } from 'react'; 
import { login, register, sendPasswordResetEmail } from '../services/authService';
import type { User } from '../types';
import { useToast } from '../contexts/ToastContext'; 
import { useNavigate } from 'react-router-dom';

interface AuthProps {
    onLoginSuccess: (user: User) => void;
    onBack: () => void;
    initialView: 'login' | 'register'; 
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onBack, initialView }) => {
    // Agora o estado inicial depende apenas da prop, mas a navegação muda a URL
    const isLoginView = initialView === 'login';
    const [isResetPasswordView, setIsResetPasswordView] = useState(false); 
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(''); 
    const [success, setSuccess] = useState(''); 
    const [isLoading, setIsLoading] = useState(false); 
    const [showSpinner, setShowSpinner] = useState(false); 
    const loadingTimeoutRef = useRef<number | null>(null); 

    const { showToast } = useToast(); 
    const navigate = useNavigate();

    // Resetar forms ao mudar de view
    useEffect(() => {
        setIsResetPasswordView(false);
        clearForm();
    }, [initialView]);

    const clearForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setPhone('');
        setError('');
        setSuccess('');
    };

    const toggleView = () => {
        // Navegar para a rota oposta
        if (isLoginView) {
            navigate('/cadastro');
        } else {
            navigate('/login');
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        let formatted = value;

        if (value.length > 7) {
            formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        } else if (value.length > 2) {
            formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        }

        setPhone(formatted);
    };

    const validateForm = () => {
        setError(''); 
        if (!email || (!password && !isResetPasswordView)) { 
            setError('Email e senha são obrigatórios.');
            return false;
        }
        if (!isLoginView && !isResetPasswordView) { 
            if (!name) {
                setError('Nome é obrigatório.');
                return false;
            }
            if (!phone) {
                setError('Celular é obrigatório.');
                return false;
            }
            if (password !== confirmPassword) {
                setError('As senhas não coincidem.');
                return false;
            }
        }
        return true;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true); 
        
        loadingTimeoutRef.current = setTimeout(() => {
            setShowSpinner(true);
        }, 250) as unknown as number;

        if (!validateForm()) {
            setIsLoading(false);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            setShowSpinner(false);
            return;
        }

        try {
            if (isLoginView && !isResetPasswordView) { // Login flow
                const result = await login(email, password);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                    showToast('Login realizado com sucesso!', 'success');
                    navigate('/app/dashboard');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else if (!isLoginView && !isResetPasswordView) { // Register flow
                const result = await register(name, email, password, phone);
                if (result.success) {
                    setSuccess(result.message + ' Por favor, faça o login.');
                    showToast(result.message + ' Agora, faça o login.', 'success');
                    navigate('/login');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else if (isResetPasswordView) { // Password reset flow
                const result = await sendPasswordResetEmail(email);
                if (result.success) {
                    setSuccess(result.message);
                    showToast(result.message, 'success');
                    setEmail(''); 
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            }
        } catch (err) {
            setError('Ocorreu um erro. Tente novamente.');
            showToast('Ocorreu um erro. Tente novamente.', 'error');
            console.error(err);
        } finally {
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            setIsLoading(false);
            setShowSpinner(false);
        }
    };
    
    const inputClasses = "w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-lg border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors duration-200";

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 relative">
             <div className="absolute top-4 left-4">
                <button onClick={onBack} className="text-sm text-gray-600 hover:text-blue-600 flex items-center" aria-label="Voltar para a página inicial">
                    <span className="material-symbols-outlined mr-1" aria-hidden="true">arrow_back</span>
                    Voltar
                </button>
            </div>
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-400 text-transparent bg-clip-text">
                        MeuGasto
                    </h1>
                    <p className="text-gray-500 mt-1">Seu assistente financeiro pessoal.</p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
                        {isResetPasswordView ? 'Redefinir Senha' : (isLoginView ? 'Login' : 'Cadastro')}
                    </h2>
                    <p className="text-center text-gray-500 mb-6 text-sm">
                        {isResetPasswordView ? 'Enviaremos um link de redefinição para seu e-mail.' : (isLoginView ? 'Bem-vindo de volta!' : 'Crie sua conta para começar.')}
                    </p>
                    
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert" aria-live="polite">{error}</div>}
                    {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert" aria-live="polite">{success}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-4" aria-label={isResetPasswordView ? "Formulário de Redefinição de Senha" : (isLoginView ? "Formulário de Login" : "Formulário de Cadastro")}>
                        
                        {/* Email field (always present) */}
                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={inputClasses}
                                required
                                autoComplete="email"
                                aria-required="true"
                            />
                        </div>

                        {!isResetPasswordView && ( // Fields for Login/Register
                            <>
                                {!isLoginView && ( // Fields only for Register
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="name">Nome</label>
                                            <input
                                                type="text"
                                                id="name"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                className={inputClasses}
                                                required
                                                autoComplete="name"
                                                aria-required="true"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="phone">Celular</label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                value={phone}
                                                onChange={handlePhoneChange}
                                                className={inputClasses}
                                                required
                                                autoComplete="tel"
                                                placeholder="(99) 99999-9999"
                                                maxLength={15}
                                                aria-required="true"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="password">Senha</label>
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className={inputClasses}
                                        required
                                        autoComplete={isLoginView ? "current-password" : "new-password"}
                                        aria-required="true"
                                    />
                                </div>
                                {!isLoginView && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="confirm-password">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            id="confirm-password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className={inputClasses}
                                            required
                                            autoComplete="new-password"
                                            aria-required="true"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                        
                        {/* Forgot password link in Login view */}
                        {isLoginView && !isResetPasswordView && (
                            <div className="text-right">
                                <button type="button" onClick={() => setIsResetPasswordView(true)} className="text-sm text-blue-600 hover:underline" aria-label="Esqueceu a senha?">
                                    Esqueceu a senha?
                                </button>
                            </div>
                        )}

                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300" disabled={isLoading}>
                            {showSpinner ? ( 
                                <span className="flex items-center justify-center">
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                                    {isResetPasswordView ? 'Enviando...' : (isLoginView ? 'Entrando...' : 'Cadastrando...')}
                                </span>
                            ) : (
                                isResetPasswordView ? 'Redefinir Senha' : (isLoginView ? 'Entrar' : 'Cadastrar')
                            )}
                        </button>
                    </form>
                    
                    <div className="text-center mt-6">
                        {isResetPasswordView ? (
                            <button onClick={() => { setIsResetPasswordView(false); clearForm(); }} className="text-sm text-blue-600 hover:underline" aria-live="polite">
                                Voltar para o Login
                            </button>
                        ) : (
                            <button onClick={toggleView} className="text-sm text-blue-600 hover:underline" aria-live="polite">
                                {isLoginView ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};