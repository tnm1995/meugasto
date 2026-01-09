
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo (ex: .env, .env.production)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Define process.env.API_KEY globalmente para ser substituído em tempo de build
      // Prioriza VITE_GEMINI_API_KEY, tenta API_KEY, ou usa a chave fornecida como fallback.
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.API_KEY || 'AIzaSyButX1v7EiV55oWWnHl2xaSgB1JaHlVSp0')
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
