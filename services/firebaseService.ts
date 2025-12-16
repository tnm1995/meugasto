
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// @ts-ignore
import { getAnalytics } from 'firebase/analytics';

// Função segura para acessar variáveis de ambiente em diferentes ambientes (Vite, Create React App, etc)
const getEnv = (key: string, fallback: string): string => {
  try {
    // Verifica process.env (Node/CRA)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
    // Verifica import.meta.env (Vite)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // Ignora erros de acesso
  }
  return fallback;
};

// Configuração com fallbacks explícitos para garantir que o app sempre inicie
export const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyCxoflM16AOIdWq7ej3B9wkNNXaEXRwQUE"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "meugasto-e6f64.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "meugasto-e6f64"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "meugasto-e6f64.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "658960757092"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:658960757092:web:a71bb2185941271f15ca71"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-NC93789KE9")
};

// Define types manually using 'any' to bypass "Module has no exported member" errors during build
type FirebaseAppType = any;
type Analytics = any;

let app: FirebaseAppType;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | null = null;
const googleProvider = new GoogleAuthProvider();

let firebaseInitialized = false;
let firebaseInitializationError: any = null;

try {
  // Verificação simples para alertar o desenvolvedor no VS Code se as chaves estiverem faltando
  if (firebaseConfig.apiKey === "AIzaSyCxoflM16AOIdWq7ej3B9wkNNXaEXRwQUE" && window.location.hostname === "localhost") {
     console.warn("⚠️ AVISO: Você parece estar usando as chaves de API padrão/fallback. Para desenvolvimento local, crie um arquivo .env na raiz do projeto com suas credenciais reais (VITE_FIREBASE_...).");
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Analytics initialization failed:", e);
    }
  }
  firebaseInitialized = true;
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Erro crítico ao inicializar Firebase:", error);
  firebaseInitializationError = error;
  // Em caso de erro fatal, não relançamos o erro para não travar a importação dos módulos.
  // O app pode tentar renderizar uma tela de erro ou funcionar parcialmente.
  // @ts-ignore
  app = {} as FirebaseAppType;
  // @ts-ignore
  auth = {} as Auth;
  // @ts-ignore
  db = {} as Firestore;
}

export { app, auth, db, analytics, googleProvider, firebaseInitialized, firebaseInitializationError };
