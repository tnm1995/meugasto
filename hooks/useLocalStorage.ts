

import React, { useState, useCallback } from 'react';
import type { Expense, Budget, ReminderSettings } from '../types';
import { getLocalStorageCompositeKey } from '../services/utils';
import { DEFAULT_REMINDER_SETTINGS, DEFAULT_PROFILE_IMAGE } from '../types'; // Import defaults from types.ts

// Define default values outside the component to ensure stable references
export const DEFAULT_EXPENSES: Expense[] = [];
export const DEFAULT_BUDGETS: Budget[] = [];
// DEFAULT_REMINDER_SETTINGS and DEFAULT_PROFILE_IMAGE are now imported from types.ts

// A custom hook to manage state in localStorage, now user-specific and robust
// This hook is kept for backward compatibility or if other local-only data is needed.
// For core app data (expenses, budgets, reminders, profileImage), use Firestore hooks.
export const useLocalStorage = <T,>(key: string, initialValue: T, userIdentifier: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  // Use lazy state initialization to read from localStorage only once on mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    const activeUserIdentifier = userIdentifier || 'guest';
    const compositeKey = getLocalStorageCompositeKey(key, activeUserIdentifier);

    try {
      const item = window.localStorage.getItem(compositeKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${compositeKey}” during initialization:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (typeof window === 'undefined') {
        console.warn(`useLocalStorage: setValue called in SSR/no-window environment for key ${key}. Value not stored.`);
        return;
    }
    
    // Always use the latest userIdentifier and key for the composite key when setting
    const currentActiveUserIdentifier = userIdentifier || 'guest';
    const currentCompositeKey = getLocalStorageCompositeKey(key, currentActiveUserIdentifier); 

    setStoredValue((prevStoredValue) => {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
        try {
            window.localStorage.setItem(currentCompositeKey, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key “${currentCompositeKey}”:`, error); 
        }
        return valueToStore;
    });
  }, [key, userIdentifier]);

  return [storedValue, setValue];
};