
'use server';
/**
 * @fileOverview Server actions for admin operations on exercises.
 */

import { z } from 'zod';
import { addExerciseSchema } from '@/lib/schemas';
// Admin DB is not available in this environment, using client DB for reads.
import { getFirebaseDb } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';


// --- Get Existing Exercise Names ---
// This is a read operation and can be safely performed.
export async function getExistingExerciseNames(): Promise<string[]> {
  const db = getFirebaseDb();
  const exercisesCollection = collection(db, "ejercicios_futsal");
  const q = query(exercisesCollection, where("isVisible", "==", true));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return [];
  }

  const names = snapshot.docs.map(doc => doc.data().ejercicio as string).filter(Boolean);
  return names;
}

// --- Get All Exercises for Export (AdminExercise is now defined in manage-exercises page)---
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
