
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions where needed, or the client SDK for user-specific queries.
 */

import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';


// --- Save Session ---

const SaveSessionInputSchema = z.object({
    userId: z.string(),
    sessionData: z.any(),
});
type SaveSessionInput = z.infer<typeof SaveSessionInputSchema>;

export async function saveSession({ userId, sessionData }: SaveSessionInput): Promise<{ sessionId: string }> {
  try {
    const db = getFirebaseDb();
    if (sessionData.numero_sesion) {
      const q = query(
        collection(db, "mis_sesiones"),
        where("userId", "==", userId),
        where("numero_sesion", "==", sessionData.numero_sesion)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error("Ya hay una sesión con este número.");
      }
    }
    
    const docRef = await addDoc(collection(db, "mis_sesiones"), {
      ...sessionData,
      userId,
      createdAt: serverTimestamp(),
    });

    return { sessionId: docRef.id };
  } catch (error: any) {
    console.error("Error saving session:", error.message);
    throw error;
  }
}



// --- Delete Session ---
const DeleteSessionInputSchema = z.object({
    sessionId: z.string(),
});
type DeleteSessionInput = z.infer<typeof DeleteSessionInputSchema>;

export async function deleteSession({ sessionId }: DeleteSessionInput): Promise<{ success: boolean }> {
  try {
    const db = getFirebaseDb();
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, "mis_sesiones", sessionId));
  } catch(error) {
     console.error("Error deleting session:", error);
     throw new Error("Failed to delete session.");
  }
  return { success: true };
}
