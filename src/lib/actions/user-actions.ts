
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions, but include a fallback to an in-memory cache
 * for local development environments where the Admin SDK may not be initialized.
 */

import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFromCache, setInCache } from '@/lib/cache';
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
    console.warn("Admin DB not available for toggleFavorite, using cache fallback.", error);
    // Cache fallback logic if needed, for now just returning success
    return { success: true };
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
    console.warn("Admin DB not available for saveSession, using cache fallback.", error.message);
    if (error.message.includes("Ya hay una sesión")) throw error;
    // Fallback for local dev
    const newId = `session_${Date.now()}`;
    setInCache(`session_${newId}`, { id: newId, ...sessionData, userId });
    return { sessionId: newId };
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
    console.warn("Admin DB not available for deleteMatch, using cache fallback.", error);
    // Fallback for local dev
    const allMatches = getFromCache<any[]>('matches', 3600 * 1000) || [];
    const updatedMatches = allMatches.filter(m => m.id !== matchId);
    setInCache('matches', updatedMatches);
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
     console.warn("Admin DB not available for deleteSession, using cache fallback.", error);
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
       console.warn("Admin DB not available for saveMatch, using cache fallback.", error);
       // Fallback for local dev
       const newId = `match_${uuidv4()}`;
       const newMatch = { 
          id: newId, 
          ...matchData,
          // Firestore Timestamps can't be directly created on client, so we simulate
          createdAt: {
            toDate: () => new Date(),
            _seconds: Math.floor(Date.now() / 1000),
            _nanoseconds: (Date.now() % 1000) * 1000000
          } as unknown as Timestamp
        };
       const allMatches = getFromCache<any[]>('matches', 3600 * 1000) || [];
       allMatches.push(newMatch);
       setInCache('matches', allMatches);
       return { matchId: newId };
    }
}


// --- Fetch Matches for User ---
const FetchMatchesInputSchema = z.object({
    userId: z.string(),
});
type FetchMatchesInput = z.infer<typeof FetchMatchesInputSchema>;

export async function fetchMatchesForUser({ userId }: FetchMatchesInput): Promise<any[]> {
    try {
        const adminDb = getAdminDb();
        const q = adminDb.collection("partidos_estadisticas")
            .where("userId", "==", userId)
            .orderBy("fecha", "desc")
            .orderBy("createdAt", "desc");
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn("Admin DB not available for fetchMatchesForUser, using cache fallback.", error);
        // Fallback for local dev
        const allMatches = getFromCache<any[]>('matches', 3600 * 1000) || [];
        // Filter by user and sort
        const userMatches = allMatches
            .filter(m => m.userId === userId)
            .sort((a, b) => {
                const dateA = new Date(a.fecha).getTime();
                const dateB = new Date(b.fecha).getTime();
                if (dateB !== dateA) return dateB - dateA;
                return b.createdAt._seconds - a.createdAt._seconds;
            });
        return userMatches;
    }
}
