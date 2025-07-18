
'use server';
/**
 * @fileOverview Server actions for admin operations on exercises.
 */
import { z } from 'zod';
import { addExerciseSchema, type AddExerciseFormValues } from '@/lib/schemas';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';


// --- Get Existing Exercise Names ---
// This is a read operation and can be safely performed on client-side SDK.
export async function getExistingExerciseNames(): Promise<string[]> {
  const db = getFirebaseDb();
  const exercisesCollection = collection(db, "ejercicios_futsal");
  const q = query(exercisesCollection);
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return [];
  }

  const names = snapshot.docs.map(doc => doc.data().ejercicio as string).filter(Boolean);
  return names;
}

// --- Get All Exercises for Export (can be read by client) ---
export async function getAllExercisesForExport(): Promise<any[]> {
    const db = getFirebaseDb();
    const exercisesCollection = collection(db, "ejercicios_futsal");
    const snapshot = await getDocs(query(exercisesCollection, orderBy('ejercicio', 'asc')));

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
}


// --- ADD Exercise (uses Admin SDK) ---
export async function addExercise(data: AddExerciseFormValues): Promise<void> {
    const adminDb = getAdminDb();
    await adminDb.collection('ejercicios_futsal').add({
        ...data,
        numero: data.numero || null,
        variantes: data.variantes || null,
        consejos_entrenador: data.consejos_entrenador || null,
        imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
        isVisible: data.isVisible === undefined ? true : data.isVisible,
        createdAt: FieldValue.serverTimestamp(),
    });
}

// --- ADD Many Exercises (uses Admin SDK) ---
export async function addManyExercises(exercises: AddExerciseFormValues[]): Promise<void> {
    const adminDb = getAdminDb();
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection('ejercicios_futsal');

    exercises.forEach(exData => {
        const newDocRef = collectionRef.doc();
        batch.set(newDocRef, {
            ...exData,
            createdAt: FieldValue.serverTimestamp(),
            numero: exData.numero || null,
            variantes: exData.variantes || null,
            consejos_entrenador: exData.consejos_entrenador || null,
            isVisible: exData.isVisible === undefined ? true : exData.isVisible,
        });
    });

    await batch.commit();
}


// --- UPDATE Exercise (uses Admin SDK) ---
export async function updateExercise(id: string, data: AddExerciseFormValues): Promise<void> {
    const adminDb = getAdminDb();
    const docRef = adminDb.collection("ejercicios_futsal").doc(id);
    await docRef.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
}

// --- DELETE Exercise (uses Admin SDK) ---
export async function deleteExercise(id: string): Promise<void> {
    const adminDb = getAdminDb();
    await adminDb.collection("ejercicios_futsal").doc(id).delete();
}

// --- Clean Duplicate Exercises (uses Admin SDK) ---
export async function cleanDuplicateExercises(): Promise<number> {
    const adminDb = getAdminDb();
    const snapshot = await adminDb.collection("ejercicios_futsal").orderBy('ejercicio').get();
    
    if (snapshot.empty) return 0;

    const exercisesByName: { [name: string]: { id: string }[] } = {};
    const idsToDelete: string[] = [];

    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const nameKey = (data.ejercicio || '').toLowerCase().trim();
        if (!exercisesByName[nameKey]) {
            exercisesByName[nameKey] = [];
        }
        exercisesByName[nameKey].push({ id: docSnap.id });
    });

    for (const nameKey in exercisesByName) {
        const duplicates = exercisesByName[nameKey];
        if (duplicates.length > 1) {
            duplicates.sort((a, b) => (a.id > b.id ? 1 : -1));
            // Keep the first one, delete the rest
            for (let i = 1; i < duplicates.length; i++) {
                idsToDelete.push(duplicates[i].id);
            }
        }
    }

    if (idsToDelete.length > 0) {
        const batch = adminDb.batch();
        idsToDelete.forEach(id => {
            batch.delete(adminDb.collection("ejercicios_futsal").doc(id));
        });
        await batch.commit();
        return idsToDelete.length;
    }

    return 0;
}
