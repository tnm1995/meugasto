
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { login, register, sendPasswordResetEmail } from '../services/authService';
import type { User } from '../types';
import { useToast } from '../contexts/ToastContext';
import { 
    SparklesIcon, 
    ChartIcon, 
    ShieldCheckIcon, 
    WalletIcon,
    VisibilityIcon,
    VisibilityOffIcon
} from './Icons';

interface AuthProps {
    onLoginSuccess: (user: User) => void;
    onBack: () => void;
    initialView: 'login' | 'register';
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onBack, initialView }) => {
    const [isLoginView, setIsLoginView] = useState(initialView === 'login');
    const [isResetPasswordView, setIsResetPasswordView] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    
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
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        setIsResetPasswordView(false);
        clearForm();
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
        
        // Timer para mostrar spinner apenas se demorar um pouco (UX)
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
            if (isLoginView && !isResetPasswordView) {
                const result = await login(email, password);
                if (result.success && result.user) {
                    onLoginSuccess(result.user);
                    showToast('Login realizado com sucesso!', 'success');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else if (!isLoginView && !isResetPasswordView) {
                const result = await register(name, email, password, phone);
                if (result.success) {
                    setSuccess(result.message + ' Por favor, faça o login.');
                    showToast(result.message + ' Agora, faça o login.', 'success');
                    setIsLoginView(true);
                    setPassword('');
                    setConfirmPassword('');
                } else {
                    setError(result.message);
                    showToast(result.message, 'error');
                }
            } else if (isResetPasswordView) {
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
    
    const inputClasses = "w-full px-4 py-3.5 bg-gray-50 text-gray-800 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all duration-200 placeholder-gray-400 text-sm";

    const benefits = [
        {
            icon: <SparklesIcon className="text-xl" />,
            title: "Leitura com IA",
            desc: "Adeus digitação. Tire uma foto e a IA extrai tudo."
        },
        {
            icon: <ChartIcon className="text-xl" />,
            title: "Relatórios Inteligentes",
            desc: "Veja exatamente para onde seu dinheiro está indo."
        },
        {
            icon: <ShieldCheckIcon className="text-xl" />,
            title: "Segurança Total",
            desc: "Seus dados criptografados e protegidos 24/7."
        }
    ];

    return (
        <div className="min-h-screen w-full flex bg-white overflow-hidden">
            
            {/* LADO ESQUERDO: Formulário */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative overflow-y-auto">
                <div className="absolute top-6 left-6">
                    <button onClick={onBack} className="text-sm text-gray-600 hover:text-blue-600 flex items-center bg-gray-50 px-3 py-2 rounded-lg shadow-sm border border-gray-200 transition-colors" aria-label="Voltar para a página inicial">
                        <span className="material-symbols-outlined mr-1 text-base" aria-hidden="true">arrow_back</span>
                        Voltar
                    </button>
                </div>

                <div className="w-full max-w-sm mt-12 lg:mt-0">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center">
                                <WalletIcon className="text-2xl" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                            MeuGasto
                        </h1>
                        <p className="text-gray-500 font-medium text-sm">Entre para gerenciar suas finanças.</p>
                    </div>
                    
                    {/* Container do Formulário */}
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isResetPasswordView ? 'Redefinir Senha' : (isLoginView ? 'Bem-vindo de volta!' : 'Crie sua conta')}
                            </h2>
                            <p className="text-gray-500 mt-2 text-sm">
                                {isResetPasswordView ? 'Digite seu email para receber o link.' : (isLoginView ? 'Insira seus dados para acessar.' : 'Comece a economizar hoje mesmo.')}
                            </p>
                        </div>

                        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in" role="alert"><span className="material-symbols-outlined text-lg">error</span>{error}</div>}
                        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in" role="alert"><span className="material-symbols-outlined text-lg">check_circle</span>{success}</div>}
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block ml-1" htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={inputClasses}
                                    required
                                    autoComplete="email"
                                    placeholder="seu@email.com"
                                />
                            </div>

                            {!isResetPasswordView && (
                                <>
                                    {!isLoginView && (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block ml-1" htmlFor="name">Nome</label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    className={inputClasses}
                                                    required
                                                    autoComplete="name"
                                                    placeholder="Seu nome completo"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block ml-1" htmlFor="phone">Celular</label>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 pointer-events-none z-10 border-r border-gray-200 pr-2">
                                                        <img src="https://flagcdn.com/w40/br.png" alt="Brasil" className="w-5 h-auto rounded-sm shadow-sm" />
                                                        <span className="text-gray-500 font-medium text-sm">+55</span>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        id="phone"
                                                        value={phone}
                                                        onChange={handlePhoneChange}
                                                        className={`${inputClasses} pl-[5.5rem]`}
                                                        required
                                                        autoComplete="tel"
                                                        placeholder="(99) 99999-9999"
                                                        maxLength={15}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1" htmlFor="password">Senha</label>
                                            {isLoginView && (
                                                <button type="button" onClick={() => setIsResetPasswordView(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline" tabIndex={-1}>
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
                                                className={`${inputClasses} pr-10`}
                                                required
                                                autoComplete={isLoginView ? "current-password" : "new-password"}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                            >
                                                {showPassword ? <VisibilityOffIcon className="text-lg" /> : <VisibilityIcon className="text-lg" />}
                                            </button>
                                        </div>
                                    </div>
                                    {!isLoginView && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block ml-1" htmlFor="confirm-password">Confirmar Senha</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    id="confirm-password"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    className={`${inputClasses} pr-10`}
                                                    required
                                                    autoComplete="new-password"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                                                    aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                                                >
                                                    {showConfirmPassword ? <VisibilityOffIcon className="text-lg" /> : <VisibilityIcon className="text-lg" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:bg-blue-300 disabled:shadow-none disabled:cursor-not-allowed mt-2">
                                {showSpinner ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                                        {isResetPasswordView ? 'Enviando...' : (isLoginView ? 'Entrando...' : 'Criando Conta...')}
                                    </span>
                                ) : (
                                    isResetPasswordView ? 'Enviar Link' : (isLoginView ? 'Entrar' : 'Criar Conta')
                                )}
                            </button>
                        </form>
                        
                        <div className="pt-4 text-center border-t border-gray-100">
                            {isResetPasswordView ? (
                                <button onClick={() => { setIsResetPasswordView(false); clearForm(); }} className="text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">
                                    Voltar para o Login
                                </button>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    {isLoginView ? 'Novo por aqui? ' : 'Já tem conta? '}
                                    <button onClick={toggleView} className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                                        {isLoginView ? 'Criar conta grátis' : 'Fazer login'}
                                    </button>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LADO DIREITO: Benefícios (Escondido no Mobile) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-900 relative overflow-hidden flex-col justify-center items-center text-white p-12">
                {/* Efeitos de Fundo */}
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500 opacity-20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

                <div className="relative z-10 max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl font-extrabold mb-6 leading-tight">
                            Transforme sua relação com o dinheiro.
                        </h2>
                        <p className="text-blue-100 text-lg mb-10 leading-relaxed">
                            Junte-se a milhares de usuários que saíram do vermelho e começaram a investir com a ajuda do MeuGasto.
                        </p>
                    </motion.div>

                    <div className="space-y-6">
                        {benefits.map((item, index) => (
                            <motion.div 
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + (index * 0.15), type: "spring" }}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors"
                            >
                                <div className="bg-white text-blue-600 w-12 h-12 rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{item.title}</h3>
                                    <p className="text-sm text-blue-100 opacity-90">{item.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="mt-12 flex items-center gap-4 text-sm text-blue-200"
                    >
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-900 bg-gray-200 overflow-hidden">
                                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <p>Mais de <span className="font-bold text-white">5.000+</span> usuários ativos.</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};
