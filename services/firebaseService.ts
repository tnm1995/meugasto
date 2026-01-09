
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
// @ts-ignore
import { getAnalytics } from 'firebase/analytics';
// @ts-ignore
import { getStorage, type FirebaseStorage } from 'firebase/storage';

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
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyADBQOvOHrP2sYOgo_SOJUyPwuDH-AWBAM"),
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
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

let firebaseInitialized = false;
let firebaseInitializationError: any = null;

try {
  // Verificação simples para alertar o desenvolvedor no VS Code se as chaves estiverem faltando
  if (firebaseConfig.apiKey === "AIzaSyADBQOvOHrP2sYOgo_SOJUyPwuDH-AWBAM" && typeof window !== 'undefined' && window.location.hostname === "localhost") {
     console.warn("⚠️ AVISO: Você parece estar usando as chaves de API padrão/fallback. Para desenvolvimento local, crie um arquivo .env na raiz do projeto com suas credenciais reais (VITE_FIREBASE_...).");
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  
  if (typeof window !== 'undefined') {
    try {
      // Prevent 403 errors by only initializing Analytics if we are NOT using the fallback API Key.
      // The default fallback key has strict restrictions preventing Installations/Analytics on unauthorized domains (like localhost or forks).
      const isFallbackKey = firebaseConfig.apiKey === "AIzaSyADBQOvOHrP2sYOgo_SOJUyPwuDH-AWBAM";
      
      if (!isFallbackKey) {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics initialized.");
      } else {
        console.debug("Firebase Analytics skipped to prevent 403 'Installations' errors with fallback API Key.");
      }
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
  // @ts-ignore
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage, analytics, firebaseInitialized, firebaseInitializationError };
