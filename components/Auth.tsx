
import React, { useState, useEffect, useRef } from 'react';
import { login, register } from '../services/authService';
import type { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { VisibilityIcon, VisibilityOffIcon } from './Icons';

interface AuthProps {
    onLoginSuccess: (user: User) => void;
    onBack: () => void;
    initialView: 'login' | 'register';
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onBack, initialView }) => {
    const [isLoginView, setIsLoginView] = useState(initialView === 'login');
    const [name, setName] = useState('');
    const [contactEmail, setContactEmail] = useState(''); // Email opcional para contato
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const loadingTimeoutRef = useRef<number | null>(null);

    const { showToast } = useToast();

    useEffect(() => {
        setIsLoginView(initialView === 'login');
        clearForm();
    }, [initialView]);

    const clearForm = () => {
        setName('');
        setContactEmail('');
        setPassword('');
        setConfirmPassword('');
        setPhone('');
        setCpf('');
        setError('');
        setSuccess('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        clearForm();
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('55') && (value.length === 12 || value.length === 13)) {
            value = value.substring(2);
        }
        value = value.slice(0, 11);
        let formatted = value;
        if (value.length > 7) {
            formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        } else if (value.length > 2) {
            formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        }
        setPhone(formatted);
    };

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        let formatted = value;
        if (value.length > 9) {
            formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
        } else if (value.length > 6) {
            formatted = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
        } else if (value.length > 3) {
            formatted = `${value.slice(0, 3)}.${value.slice(3)}`;
        }
        setCpf(formatted);
    };

    const validateForm = () => {
        setError('');
        
        // Validação comum
        if (!cpf || cpf.replace(/\D/g, '').length < 11) {
            setError('CPF incompleto ou inválido.');
            return false;
        }
        if (!password) {
            setError('Senha é obrigatória.');
            return false;
        }

        if (!isLoginView) { // Cadastro
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
        
        loadingTimeoutRef.current = window.setTimeout(() => {
            setShowSpinner(true);
        }, 250);

        if (!validateForm()) {
            setIsLoading(false);
            if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            setShowSpinner(false);
            return;
        }

        try {
            if (isLoginView) {
                const result = await login(cpf, password);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                    showToast('Login realizado com sucesso!', 'success');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else {
                // Passa o CPF e o Email de contato
                const result = await register(name, cpf, password, phone, contactEmail);
                if (result.success) {
                    setSuccess(result.message + ' Por favor, faça o login com seu CPF.');
                    showToast(result.message, 'success');
                    setIsLoginView(true);
                    setPassword('');
                    setConfirmPassword('');
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
    
    // Classes do visual original (inputs cinzas)
    const inputClasses = "w-full px-4 py-3 bg-gray-100 text-gray-800 rounded-lg border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors duration-200 placeholder-gray-400";

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 relative">
             <div className="absolute top-4 left-4">
                <button onClick={onBack} className="text-sm text-gray-600 hover:text-blue-600 flex items-center" aria-label="Voltar">
                    <span className="material-symbols-outlined mr-1" aria-hidden="true">arrow_back</span>
                    Voltar
                </button>
            </div>
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    {/* Visual original do Título */}
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-400 text-transparent bg-clip-text">
                        MeuGasto
                    </h1>
                    <p className="text-gray-500 mt-1">Acesso Seguro via CPF</p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">
                        {isLoginView ? 'Entrar' : 'Cadastro'}
                    </h2>
                    <p className="text-center text-gray-500 mb-6 text-sm">
                        {isLoginView ? 'Digite seu CPF e senha.' : 'Preencha seus dados para começar.'}
                    </p>
                    
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-sm flex items-center gap-2" role="alert"><span className="material-symbols-outlined text-base">error</span>{error}</div>}
                    {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 text-sm flex items-center gap-2" role="alert"><span className="material-symbols-outlined text-base">check_circle</span>{success}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {!isLoginView && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="name">Nome Completo</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className={inputClasses}
                                    required
                                    autoComplete="name"
                                    placeholder="Seu nome"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="cpf">CPF</label>
                            <input
                                type="text"
                                id="cpf"
                                value={cpf}
                                onChange={handleCpfChange}
                                className={inputClasses}
                                required
                                placeholder="000.000.000-00"
                                maxLength={14}
                                inputMode="numeric"
                            />
                        </div>

                        {!isLoginView && (
                            <>
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
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="email">E-mail (Opcional)</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={contactEmail}
                                        onChange={e => setContactEmail(e.target.value)}
                                        className={inputClasses}
                                        placeholder="Para recuperação de conta"
                                        autoComplete="email"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="password">Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className={`${inputClasses} pr-10`}
                                    required
                                    autoComplete={isLoginView ? "current-password" : "new-password"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <VisibilityOffIcon className="text-lg" /> : <VisibilityIcon className="text-lg" />}
                                </button>
                            </div>
                        </div>

                        {!isLoginView && (
                            <div>
                                <label className="text-sm font-medium text-gray-600 mb-1 block" htmlFor="confirm-password">Confirmar Senha</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={`${inputClasses} pr-10`}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <VisibilityOffIcon className="text-lg" /> : <VisibilityIcon className="text-lg" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg active:scale-[0.98] disabled:bg-blue-300 disabled:shadow-none disabled:cursor-not-allowed mt-2" disabled={isLoading}>
                            {showSpinner ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                    {isLoginView ? 'Entrando...' : 'Cadastrando...'}
                                </span>
                            ) : (
                                isLoginView ? 'Entrar' : 'Cadastrar'
                            )}
                        </button>
                    </form>
                    
                    <div className="text-center mt-6 pt-4 border-t border-gray-100">
                        <button onClick={toggleView} className="text-sm text-blue-600 hover:underline transition-colors font-medium">
                            {isLoginView ? 'Não tem conta? Cadastre-se com CPF' : 'Já tem conta? Entrar com CPF'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
