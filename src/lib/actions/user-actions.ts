
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions where needed, or the client SDK for user-specific queries.
 */

import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, deleteDoc, setDoc } from 'firebase/firestore';


// --- Favorite Exercise ---

const ToggleFavoriteInputSchema = z.object({
  userId: z.string(),
  exerciseId: z.string(),
  isFavorite: z.boolean(),
});
type ToggleFavoriteInput = z.infer<typeof ToggleFavoriteInputSchema>;

export async function toggleFavorite({ userId, exerciseId, isFavorite }: ToggleFavoriteInput): Promise<{ success: boolean }> {
  try {
    const clientDb = getFirebaseDb();
    const favDocRef = doc(clientDb, "usuarios", userId, "user_favorites", exerciseId);
    if (isFavorite) {
      // Using client-side timestamp equivalent if needed, but often not necessary for this kind of action.
      // For simplicity, let's just mark its existence.
      await setDoc(favDocRef, { addedAt: new Date() });
    } else {
      await deleteDoc(favDocRef);
    }
    return { success: true };
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw new Error("Failed to update favorite status.");
  }
}


// --- Save Session ---

const SaveSessionInputSchema = z.object({
    userId: z.string(),
    sessionData: z.any(),
});
type SaveSessionInput = z.infer<typeof SaveSessionInputSchema>;

export async function saveSession({ userId, sessionData }: SaveSessionInput): Promise<{ sessionId: string }> {
  try {
    const adminDb = getAdminDb();
    if (sessionData.numero_sesion) {
      const q = adminDb.collection("mis_sesiones")
        .where("userId", "==", userId)
        .where("numero_sesion", "==", sessionData.numero_sesion);
      const querySnapshot = await q.get();
      if (!querySnapshot.empty) {
        throw new Error("Ya hay una sesión con este número.");
      }
    }
    
    const docRef = await adminDb.collection("mis_sesiones").add({
      ...sessionData,
      userId,
      createdAt: FieldValue.serverTimestamp(),
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
    const adminDb = getAdminDb();
    await adminDb.collection("mis_sesiones").doc(sessionId).delete();
  } catch(error) {
     console.error("Error deleting session:", error);
     throw new Error("Failed to delete session.");
  }
  return { success: true };
}
