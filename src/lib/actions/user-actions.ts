
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions where needed, or the client SDK for user-specific queries.
 */

import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// --- Favorite Exercise ---

const ToggleFavoriteInputSchema = z.object({
  userId: z.string(),
  exerciseId: z.string(),
  isFavorite: z.boolean(),
});
type ToggleFavoriteInput = z.infer<typeof ToggleFavoriteInputSchema>;

export async function toggleFavorite({ userId, exerciseId, isFavorite }: ToggleFavoriteInput): Promise<{ success: boolean }> {
  try {
    const adminDb = getAdminDb();
    const favDocRef = adminDb.collection("usuarios").doc(userId).collection("user_favorites").doc(exerciseId);
    if (isFavorite) {
      await favDocRef.set({ addedAt: FieldValue.serverTimestamp() });
    } else {
      await favDocRef.delete();
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


// --- Delete Match ---

const DeleteMatchInputSchema = z.object({
    matchId: z.string(),
});
type DeleteMatchInput = z.infer<typeof DeleteMatchInputSchema>;

export async function deleteMatch({ matchId }: DeleteMatchInput): Promise<{ success: boolean }> {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection("partidos_estadisticas").doc(matchId).delete();
  } catch (error) {
    console.error("Error deleting match:", error);
    throw new Error("Failed to delete match.");
  }
  return { success: true };
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

// --- Save Match ---
const SaveMatchInputSchema = z.object({
    matchData: z.any(),
});
type SaveMatchInput = z.infer<typeof SaveMatchInputSchema>;

export async function saveMatch({ matchData }: SaveMatchInput): Promise<{ matchId: string }> {
    try {
      const adminDb = getAdminDb();
      const docRef = await adminDb.collection("partidos_estadisticas").add({
        ...matchData,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { matchId: docRef.id };
    } catch (error) {
       console.error("Error saving match:", error);
       throw new Error("Failed to save match.");
    }
}


// --- Fetch Matches for User ---
const FetchMatchesInputSchema = z.object({
    userId: z.string(),
});
type FetchMatchesInput = z.infer<typeof FetchMatchesInputSchema>;

export async function fetchMatchesForUser({ userId }: FetchMatchesInput): Promise<any[]> {
    try {
        const clientDb = getFirebaseDb();
        const q = query(
            collection(clientDb, "partidos_estadisticas"),
            where("userId", "==", userId),
            orderBy("fecha", "desc")
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            const createdAtTimestamp = data.createdAt as Timestamp;
            return {
                id: doc.id,
                ...data,
                // Convert Timestamp to ISO string for serialization
                createdAt: createdAtTimestamp?.toDate ? createdAtTimestamp.toDate().toISOString() : new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error("Error fetching matches:", error);
        throw new Error("Failed to fetch matches for user.");
    }
}
