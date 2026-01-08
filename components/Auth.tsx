
import React, { useState, useEffect, useRef } from 'react';
import { login, register, sendPasswordResetEmail } from '../services/authService';
import type { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
    VisibilityIcon, 
    VisibilityOffIcon, 
    WalletIcon, 
    SparklesIcon, 
    ChartIcon, 
    ShieldCheckIcon 
} from './Icons';

interface AuthProps {
    onLoginSuccess: (user: User) => void;
    onBack: () => void;
    initialView: 'login' | 'register';
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onBack, initialView }) => {
    const [isLoginView, setIsLoginView] = useState(initialView === 'login');
    const [isResetPasswordView, setIsResetPasswordView] = useState(false);
    
    // Form States
    const [name, setName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState('');
    
    // UI States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const { showToast } = useToast();

    useEffect(() => {
        setIsLoginView(initialView === 'login');
        setIsResetPasswordView(false);
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
        setIsResetPasswordView(false);
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
        
        if (!cpf && !isResetPasswordView) {
            setError('CPF é obrigatório.');
            return false;
        }
        if (cpf && cpf.replace(/\D/g, '').length < 11 && !isResetPasswordView) {
             setError('CPF incompleto.');
             return false;
        }

        if (!password && !isResetPasswordView) {
            setError('Senha é obrigatória.');
            return false;
        }

        if (!isLoginView && !isResetPasswordView) { 
            if (!name) { setError('Nome é obrigatório.'); return false; }
            if (!phone) { setError('Celular é obrigatório.'); return false; }
            if (!contactEmail) { setError('Email é obrigatório.'); return false; }
            if (password !== confirmPassword) { setError('As senhas não coincidem.'); return false; }
        }
        
        if (isResetPasswordView && !contactEmail) {
             setError('Digite seu email de contato para recuperar a senha.');
             return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        if (!validateForm()) {
            setIsLoading(false);
            return;
        }

        try {
            if (isLoginView && !isResetPasswordView) {
                const result = await login(cpf, password);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                    showToast('Login realizado com sucesso!', 'success');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else if (!isLoginView && !isResetPasswordView) {
                const result = await register(name, cpf, password, phone, contactEmail);
                if (result.success) {
                    setSuccess(result.message + ' Por favor, faça o login com seu CPF.');
                    showToast(result.message, 'success');
                    
                    // Força a atualização da URL para /login.
                    // Isso garante que quando o AuthState mudar (devido ao logout automático do registro),
                    // o componente pai (App.tsx) re-renderize o Auth com a view de Login, e não Register/Landing.
                    window.history.pushState({}, '', '/login');
                    
                    setIsLoginView(true);
                    setPassword('');
                    setConfirmPassword('');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else if (isResetPasswordView) {
                const result = await sendPasswordResetEmail(contactEmail);
                if (result.success) {
                    setSuccess(result.message);
                    showToast(result.message, 'success');
                    setContactEmail('');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            }
        } catch (err) {
            setError('Ocorreu um erro. Tente novamente.');
            showToast('Ocorreu um erro. Tente novamente.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Style classes from the image (Blue background inputs)
    const inputContainerClass = "w-full";
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";
    // Corrigido para azul claro conforme a imagem (bg-blue-50/50 ou similar)
    const inputClass = "w-full px-4 py-3.5 bg-blue-50/50 text-gray-900 font-medium rounded-xl border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 placeholder-gray-400 outline-none";

    return (
        <div className="min-h-screen w-full flex bg-white font-sans">
            {/* LADO ESQUERDO: Formulário */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 relative overflow-y-auto">
                {/* Botão Voltar */}
                <div className="absolute top-6 left-6 lg:top-8 lg:left-12">
                    <button 
                        onClick={onBack} 
                        className="flex items-center gap-2 py-2 px-4 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all text-sm font-medium border border-gray-200"
                    >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Voltar
                    </button>
                </div>

                <div className="w-full max-w-sm mt-16 lg:mt-0">
                    {/* Header do Form */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-200">
                            <WalletIcon className="text-2xl" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">MeuGasto</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                            {isResetPasswordView ? 'Recuperar Senha' : (isLoginView ? 'Bem-vindo de volta!' : 'Crie sua conta')}
                        </h2>
                        <p className="text-gray-500">
                            {isResetPasswordView 
                                ? 'Informe seu e-mail para receber o link.' 
                                : (isLoginView ? 'Insira seus dados para acessar.' : 'Preencha os dados abaixo.')}
                        </p>
                    </div>

                    {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg flex items-center gap-2"><span className="material-symbols-outlined text-lg">error</span>{error}</div>}
                    {success && <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded-r-lg flex items-center gap-2"><span className="material-symbols-outlined text-lg">check_circle</span>{success}</div>}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {!isResetPasswordView && (
                            <>
                                {!isLoginView && (
                                    <div className={inputContainerClass}>
                                        <label className={labelClass} htmlFor="name">Nome Completo</label>
                                        <input
                                            type="text"
                                            id="name"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className={inputClass}
                                            placeholder="Seu nome"
                                            autoComplete="name"
                                        />
                                    </div>
                                )}

                                <div className={inputContainerClass}>
                                    <label className={labelClass} htmlFor="cpf">CPF</label>
                                    <input
                                        type="text"
                                        id="cpf"
                                        value={cpf}
                                        onChange={handleCpfChange}
                                        className={inputClass}
                                        placeholder="000.000.000-00"
                                        maxLength={14}
                                        inputMode="numeric"
                                    />
                                </div>

                                {!isLoginView && (
                                    <>
                                        <div className={inputContainerClass}>
                                            <label className={labelClass} htmlFor="phone">Celular</label>
                                            <input
                                                type="tel"
                                                id="phone"
                                                value={phone}
                                                onChange={handlePhoneChange}
                                                className={inputClass}
                                                placeholder="(99) 99999-9999"
                                                maxLength={15}
                                            />
                                        </div>
                                        <div className={inputContainerClass}>
                                            <label className={labelClass} htmlFor="contactEmail">Email</label>
                                            <input
                                                type="email"
                                                id="contactEmail"
                                                value={contactEmail}
                                                onChange={e => setContactEmail(e.target.value)}
                                                className={inputClass}
                                                placeholder="seu@email.com"
                                                autoComplete="email"
                                                required
                                            />
                                        </div>
                                    </>
                                )}

                                <div className={inputContainerClass}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider" htmlFor="password">Senha</label>
                                        {isLoginView && (
                                            <button 
                                                type="button" 
                                                onClick={() => setIsResetPasswordView(true)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                Esqueceu?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={inputClass}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            {showPassword ? <VisibilityOffIcon className="text-lg" /> : <VisibilityIcon className="text-lg" />}
                                        </button>
                                    </div>
                                </div>

                                {!isLoginView && (
                                    <div className={inputContainerClass}>
                                        <label className={labelClass} htmlFor="confirm-password">Confirmar Senha</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                id="confirm-password"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className={inputClass}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                {showConfirmPassword ? <VisibilityOffIcon className="text-lg" /> : <VisibilityIcon className="text-lg" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {isResetPasswordView && (
                            <div className={inputContainerClass}>
                                <label className={labelClass} htmlFor="resetEmail">Email Cadastrado</label>
                                <input
                                    type="email"
                                    id="resetEmail"
                                    value={contactEmail}
                                    onChange={e => setContactEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all transform active:scale-[0.98] disabled:bg-blue-300 disabled:shadow-none disabled:cursor-not-allowed mt-4"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                    Processando...
                                </span>
                            ) : (
                                isResetPasswordView ? 'Enviar Link de Recuperação' : (isLoginView ? 'Entrar' : 'Criar Conta Grátis')
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        {isResetPasswordView ? (
                            <button 
                                onClick={() => { setIsResetPasswordView(false); clearForm(); }} 
                                className="text-blue-600 font-bold hover:underline text-sm"
                            >
                                Voltar para o Login
                            </button>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                {isLoginView ? 'Novo por aqui?' : 'Já tem uma conta?'}
                                <button 
                                    onClick={toggleView} 
                                    className="ml-2 text-blue-600 font-bold hover:underline"
                                >
                                    {isLoginView ? 'Criar conta grátis' : 'Fazer Login'}
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* LADO DIREITO: Banner Azul */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 relative flex-col justify-center px-16 text-white overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400 opacity-10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>

                <div className="relative z-10 max-w-lg">
                    <h2 className="text-4xl font-extrabold mb-6 leading-tight">Transforme sua relação com o dinheiro.</h2>
                    <p className="text-blue-100 text-lg mb-12 leading-relaxed">
                        Junte-se a milhares de usuários que saíram do vermelho e começaram a investir com a ajuda do MeuGasto.
                    </p>

                    <div className="space-y-5">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 aspect-square">
                                <SparklesIcon className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">Leitura com IA</h3>
                                <p className="text-blue-100 text-xs mt-0.5 opacity-90">Adeus digitação. Tire uma foto e a IA extrai tudo.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 aspect-square">
                                <ChartIcon className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">Relatórios Inteligentes</h3>
                                <p className="text-blue-100 text-xs mt-0.5 opacity-90">Veja exatamente para onde seu dinheiro está indo.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 aspect-square">
                                <ShieldCheckIcon className="text-xl" />
                            </div>
                            <div>
                                <h3 className="font-bold text-base">Segurança Total</h3>
                                <p className="text-blue-100 text-xs mt-0.5 opacity-90">Seus dados criptografados e protegidos 24/7.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-gray-200 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <p className="text-sm font-medium text-blue-100">Mais de <span className="font-bold text-white">5.000+</span> usuários ativos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
