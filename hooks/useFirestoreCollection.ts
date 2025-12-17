
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
  FirestoreError,
  CollectionReference
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

/**
 * @param collectionName Nome da coleção
 * @param userId ID do usuário (se for null, assume que o overridePath será usado)
 * @param queryConstraints Filtros
 * @param overridePath Caminho completo caso não siga o padrão /users/uid/col
 */
export const useFirestoreCollection = <T extends DocumentData>(
  collectionName: string,
  userId: string | null,
  queryConstraints: QueryConstraint[] = [],
  overridePath?: string
): UseFirestoreCollectionResult<T> => {
  const [data, setData] = useState<DocumentWithId<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const getCollectionRef = useCallback(() => {
    if (overridePath) {
        return collection(db, overridePath) as CollectionReference<T>;
    }
    if (!userId || !collectionName) {
      return null;
    }
    return collection(db, 'users', userId, collectionName) as CollectionReference<T>;
  }, [userId, collectionName, overridePath]);

  useEffect(() => {
    const colRef = getCollectionRef();
    if (!colRef) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(colRef, ...queryConstraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedData: DocumentWithId<T>[] = [];
      snapshot.forEach((doc) => {
        fetchedData.push({ id: doc.id, ...(doc.data() as T) });
      });
      setData(fetchedData);
      setLoading(false);
    }, (e) => {
      console.error(`Firestore Error (${collectionName}):`, e.code, e.message);
      setError(e);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [getCollectionRef, collectionName, userId, queryConstraints, overridePath]);

  const addDocument = useCallback(async (docData: Omit<T, 'id'>): Promise<string | null> => {
    const colRef = getCollectionRef();
    if (!colRef) return null;
    try {
      const docRef = await addDoc(colRef, docData as T);
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
