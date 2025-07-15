
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions, fixing client-side permission errors.
 */

import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { manualSessionSchema, RosterPlayerSchema, AttendanceDataSchema, MatchStatsSchema, OpponentPlayerSchema, TeamStatsSchema } from '@/lib/schemas';

// --- Favorite Exercise ---

const ToggleFavoriteInputSchema = z.object({
  userId: z.string(),
  exerciseId: z.string(),
  isFavorite: z.boolean(),
});
type ToggleFavoriteInput = z.infer<typeof ToggleFavoriteInputSchema>;

export async function toggleFavorite({ userId, exerciseId, isFavorite }: ToggleFavoriteInput): Promise<{ success: boolean }> {
  const adminDb = getAdminDb();
  const favDocRef = adminDb.collection("usuarios").doc(userId).collection("user_favorites").doc(exerciseId);
  if (isFavorite) {
    await favDocRef.set({ addedAt: FieldValue.serverTimestamp() });
  } else {
    await favDocRef.delete();
  }
  return { success: true };
}


// --- Save Session ---

const SaveSessionInputSchema = z.object({
    userId: z.string(),
    sessionData: z.any(),
});
type SaveSessionInput = z.infer<typeof SaveSessionInputSchema>;

export async function saveSession({ userId, sessionData }: SaveSessionInput): Promise<{ sessionId: string }> {
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
}


// --- Delete Match ---

const DeleteMatchInputSchema = z.object({
    matchId: z.string(),
});
type DeleteMatchInput = z.infer<typeof DeleteMatchInputSchema>;

export async function deleteMatch({ matchId }: DeleteMatchInput): Promise<{ success: boolean }> {
  const adminDb = getAdminDb();
  await adminDb.collection("partidos_estadisticas").doc(matchId).delete();
  return { success: true };
}

// --- Delete Session ---
const DeleteSessionInputSchema = z.object({
    sessionId: z.string(),
});
type DeleteSessionInput = z.infer<typeof DeleteSessionInputSchema>;

export async function deleteSession({ sessionId }: DeleteSessionInput): Promise<{ success: boolean }> {
  const adminDb = getAdminDb();
  await adminDb.collection("mis_sesiones").doc(sessionId).delete();
  return { success: true };
}
