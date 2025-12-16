import { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { PricingSettings, DEFAULT_PRICING } from '../types';

export const useSystemSettings = () => {
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'pricing');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setPricing(docSnap.data() as PricingSettings);
      } else {
        // Se não existe configuração salva no banco, usa o padrão (mas não salva automaticamente para evitar criar doc sem querer)
        setPricing(DEFAULT_PRICING);
      }
      setLoading(false);
    }, (error) => {
      // Se der erro de permissão (permission-denied), significa que as regras do Firestore estão bloqueando
      if (error.code === 'permission-denied') {
        console.warn("Permissão negada ao ler preços. Verifique firestore.rules. Usando preços padrão.");
      } else {
        console.error("Erro ao buscar configurações de preço:", error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { pricing, loading };
};