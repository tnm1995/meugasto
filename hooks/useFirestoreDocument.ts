
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebaseService';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, DocumentData, DocumentSnapshot } from 'firebase/firestore';

interface UseFirestoreDocumentResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  updateDocument: (docData: Partial<T>) => Promise<boolean>;
  setDocument: (docData: T) => Promise<boolean>;
}

/**
 * Custom hook for managing a single Firestore document for a specific user.
 * Data is typically stored under `users/{userId}`.
 *
 * @param docPath The path to the document (e.g., 'users/{userId}').
 * @param initialValue The initial value for the data if the document does not exist.
 * @returns An object containing data, loading state, error, and CRUD functions.
 */
export const useFirestoreDocument = <T>(
  docPath: string,
  initialValue: T | null = null
): UseFirestoreDocumentResult<T> => {
  const [data, setData] = useState<T | null>(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDocRef = useCallback(() => {
    if (!docPath) {
      console.warn(`FirestoreDocument: docPath not provided.`);
      return null;
    }
    return doc(db, docPath);
  }, [docPath]);

  useEffect(() => {
    const docRef = getDocRef();
    if (!docRef) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(docRef, (snapshot: DocumentSnapshot<DocumentData>) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.data() as T;
        setData(fetchedData);
      } else {
        setData(null);
      }
      setLoading(false);
    }, (e) => {
      // Ignora erro de permissão durante o logout (condição de corrida)
      if (e.code === 'permission-denied') {
        console.debug(`Firestore (document ${docPath}) permission denied. Likely logout.`);
        setLoading(false);
        return;
      }
      console.error(`Error fetching document ${docPath}:`, e);
      setError('Failed to load data.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [getDocRef, initialValue, docPath]);

  const updateDocument = useCallback(async (docData: Partial<T>): Promise<boolean> => {
    const docRef = getDocRef();
    if (!docRef) {
      setError('Document reference not available for update.');
      return false;
    }
    try {
      // Cast docData to any to bypass strict Typescript generic mismatch in updateDoc
      await updateDoc(docRef, docData as any);
      return true;
    } catch (e) {
      console.error(`Error updating document ${docPath}:`, e);
      setError('Failed to update document.');
      return false;
    }
  }, [getDocRef, docPath]);

  const setDocument = useCallback(async (docData: T): Promise<boolean> => {
    const docRef = getDocRef();
    if (!docRef) {
      setError('Document reference not available for set.');
      return false;
    }
    try {
      await setDoc(docRef, docData, { merge: true });
      return true;
    } catch (e) {
      console.error(`Error setting document ${docPath}:`, e);
      setError('Failed to set document.');
      return false;
    }
  }, [getDocRef, docPath]);


  return { data, loading, error, updateDocument, setDocument };
};
