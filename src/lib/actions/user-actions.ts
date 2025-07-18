
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions where needed, or the client SDK for user-specific queries.
 * Note: Saving sessions has been moved to the client-side components to handle
 * complex queries and permission checks more effectively in the browser.
 */

import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';


// --- Save Session (DEPRECATED - LOGIC MOVED TO CLIENT) ---
// The logic for saving sessions is now handled directly within
// /src/app/crear-sesion/page.tsx and /src/app/crear-sesion-ia/page.tsx
// to correctly manage Firestore query permissions from the client.


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
