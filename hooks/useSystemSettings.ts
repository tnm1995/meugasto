
import { useState, useEffect } from 'react';
import { db } from '../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { PricingSettings, GlobalSettings, DEFAULT_PRICING, DEFAULT_GLOBAL_SETTINGS } from '../types';

export const useSystemSettings = () => {
  const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuta Pricing
    const pricingRef = doc(db, 'settings', 'pricing');
    const unsubscribePricing = onSnapshot(pricingRef, (docSnap) => {
      if (docSnap.exists()) {
        setPricing(docSnap.data() as PricingSettings);
      } else {
        setPricing(DEFAULT_PRICING);
      }
    }, (error) => {
      console.warn("Erro ao buscar preços:", error);
    });

    // Escuta Global Settings (Feature Flags)
    const globalRef = doc(db, 'settings', 'global');
    const unsubscribeGlobal = onSnapshot(globalRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge com defaults para garantir que campos novos não quebrem
        setSettings({ ...DEFAULT_GLOBAL_SETTINGS, ...data });
        console.log("Global Settings atualizadas:", data); // Debug
      } else {
        setSettings(DEFAULT_GLOBAL_SETTINGS);
      }
      setLoading(false); 
    }, (error) => {
      console.warn("Erro ao buscar configurações globais:", error);
      setLoading(false);
    });

    return () => {
      unsubscribePricing();
      unsubscribeGlobal();
    };
  }, []);

  return { pricing, settings, loading };
};
