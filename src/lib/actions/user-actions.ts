
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Admin SDK to ensure they are executed with
 * server-side permissions, fixing client-side permission errors.
 */

import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
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


// --- Save Roster ---

const SaveRosterInputSchema = z.object({
    userId: z.string(),
    club: z.string(),
    equipo: z.string(),
    campeonato: z.string(),
    players: z.array(RosterPlayerSchema),
});
type SaveRosterInput = z.infer<typeof SaveRosterInputSchema>;

export async function saveRoster({ userId, club, equipo, campeonato, players }: SaveRosterInput): Promise<{ success: boolean }> {
  const docRef = adminDb.collection('usuarios').doc(userId).collection('team').doc('roster');
  await docRef.set({
    club,
    equipo,
    campeonato,
    players,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { success: true };
}


// --- Save Attendance ---

const SaveAttendanceInputSchema = z.object({
    userId: z.string(),
    dateString: z.string(),
    attendance: AttendanceDataSchema,
});
type SaveAttendanceInput = z.infer<typeof SaveAttendanceInputSchema>;

export async function saveAttendance({ userId, dateString, attendance }: SaveAttendanceInput): Promise<{ success: boolean }> {
  const docRef = adminDb.collection('usuarios').doc(userId).collection('team').doc('attendance');
  await docRef.set({
    [dateString]: attendance,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { success: true };
}


// --- Save Match (Add & Update) ---

const MatchDataSchema = z.object({
    userId: z.string(),
    myTeamName: z.string(),
    opponentTeamName: z.string(),
    myTeamWasHome: z.boolean(),
    fecha: z.string(),
    hora: z.string().nullable(),
    campeonato: z.string(),
    jornada: z.string(),
    tipoPartido: z.string().nullable(),
    myTeamStats: TeamStatsSchema,
    opponentTeamStats: TeamStatsSchema,
    myTeamPlayers: z.array(MatchStatsSchema),
    opponentPlayers: z.array(OpponentPlayerSchema),
});

const SaveMatchInputSchema = z.object({
  matchId: z.string().optional(),
  matchData: MatchDataSchema,
});
type SaveMatchInput = z.infer<typeof SaveMatchInputSchema>;

export async function saveMatch({ matchId, matchData }: SaveMatchInput): Promise<{ matchId: string }> {
  if (matchId) {
    const docRef = adminDb.collection("partidos_estadisticas").doc(matchId);
    await docRef.update({
      ...matchData,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { matchId };
  } else {
    const docRef = await adminDb.collection("partidos_estadisticas").add({
      ...matchData,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { matchId: docRef.id };
  }
}


// --- Delete Match ---

const DeleteMatchInputSchema = z.object({
    matchId: z.string(),
});
type DeleteMatchInput = z.infer<typeof DeleteMatchInputSchema>;

export async function deleteMatch({ matchId }: DeleteMatchInput): Promise<{ success: boolean }> {
  await adminDb.collection("partidos_estadisticas").doc(matchId).delete();
  return { success: true };
}

// --- Delete Session ---
const DeleteSessionInputSchema = z.object({
    sessionId: z.string(),
});
type DeleteSessionInput = z.infer<typeof DeleteSessionInputSchema>;

export async function deleteSession({ sessionId }: DeleteSessionInput): Promise<{ success: boolean }> {
  await adminDb.collection("mis_sesiones").doc(sessionId).delete();
  return { success: true };
}
