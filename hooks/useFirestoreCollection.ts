
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebaseService';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  doc,
  QueryConstraint,
  FirestoreError
} from 'firebase/firestore';
import type { DocumentWithId } from '../types';

interface UseFirestoreCollectionResult<T> {
  data: DocumentWithId<T>[];
  loading: boolean;
  error: FirestoreError | null;
  addDocument: (docData: Omit<T, 'id'>) => Promise<string | null>;
  updateDocument: (id: string, docData: Partial<T>) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;
}

export const useFirestoreCollection = <T extends DocumentData>(
  collectionName: string,
  userId: string,
  queryConstraints: QueryConstraint[] = []
): UseFirestoreCollectionResult<T> => {
  const [data, setData] = useState<DocumentWithId<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const getCollectionRef = useCallback(() => {
    if (!userId || !collectionName) {
      return null;
    }
    return collection(db, 'users', userId, collectionName);
  }, [userId, collectionName]);

  useEffect(() => {
    const colRef = getCollectionRef();
    if (!colRef) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(colRef, ...queryConstraints);

    // includeMetadataChanges: true é crucial para mostrar escritas locais imediatamente
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const fetchedData: DocumentWithId<T>[] = [];
      snapshot.forEach((doc) => {
        fetchedData.push({ id: doc.id, ...(doc.data() as T) });
      });
      setData(fetchedData);
      setLoading(false);
    }, (e) => {
      // Ignora erro de permissão durante o logout (condição de corrida)
      if (e.code === 'permission-denied') {
        console.debug(`Firestore (collection ${collectionName}) permission denied. Likely logout.`);
        setLoading(false);
        return;
      }
      console.error(`Firestore Error (${collectionName}):`, e.code, e.message);
      setError(e);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [getCollectionRef, collectionName, userId, queryConstraints]);

  const addDocument = useCallback(async (docData: Omit<T, 'id'>): Promise<string | null> => {
    const colRef = getCollectionRef();
    if (!colRef) return null;
    try {
      const docRef = await addDoc(colRef, docData);
      return docRef.id;
    } catch (e) {
      console.error(`Error adding to ${collectionName}:`, e);
      return null;
    }
  }, [getCollectionRef, collectionName]);

  const updateDocument = useCallback(async (id: string, docData: Partial<T>): Promise<boolean> => {
    const colRef = getCollectionRef();
    if (!colRef) return false;
    try {
      const docRef = doc(colRef, id);
      // Cast docData to any to bypass strict Typescript generic mismatch in updateDoc
      await updateDoc(docRef, docData as any);
      return true;
    } catch (e) {
      console.error(`Error updating ${collectionName}:`, e);
      return false;
    }
  }, [getCollectionRef, collectionName]);

  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    const colRef = getCollectionRef();
    if (!colRef) return false;
    try {
      const docRef = doc(colRef, id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error(`Error deleting from ${collectionName}:`, e);
      return false;
    }
  }, [getCollectionRef, collectionName]);

  return { data, loading, error, addDocument, updateDocument, deleteDocument };
};
