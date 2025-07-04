
'use server';
/**
 * @fileOverview A collection of server-side flows for user data mutations.
 * These flows centralize all database write operations (CUD) to ensure
 * they are executed with the correct server-side permissions, fixing
 * client-side permission errors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, setDoc, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { manualSessionSchema, RosterPlayerSchema, AttendanceDataSchema, MatchStatsSchema, OpponentPlayerSchema, TeamStatsSchema } from '@/lib/schemas';
import type { GeneratedSessionOutput } from './generate-session-flow';

// --- Favorite Exercise Flow ---

const ToggleFavoriteInputSchema = z.object({
  userId: z.string(),
  exerciseId: z.string(),
  isFavorite: z.boolean(),
});
type ToggleFavoriteInput = z.infer<typeof ToggleFavoriteInputSchema>;

export async function toggleFavorite(input: ToggleFavoriteInput): Promise<{ success: boolean }> {
  return toggleFavoriteFlow(input);
}

const toggleFavoriteFlow = ai.defineFlow(
  {
    name: 'toggleFavoriteFlow',
    inputSchema: ToggleFavoriteInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ userId, exerciseId, isFavorite }) => {
    const favDocRef = doc(db, "usuarios", userId, "user_favorites", exerciseId);
    if (isFavorite) {
      await setDoc(favDocRef, { addedAt: serverTimestamp() });
    } else {
      await deleteDoc(favDocRef);
    }
    return { success: true };
  }
);


// --- Save Session Flow ---

const SaveSessionInputSchema = z.object({
    userId: z.string(),
    sessionData: z.any(), // Not ideal, but session structure is complex and varies
});
type SaveSessionInput = z.infer<typeof SaveSessionInputSchema>;

export async function saveSession(input: SaveSessionInput): Promise<{ sessionId: string }> {
    return saveSessionFlow(input);
}

const saveSessionFlow = ai.defineFlow(
    {
        name: 'saveSessionFlow',
        inputSchema: SaveSessionInputSchema,
        outputSchema: z.object({ sessionId: z.string() }),
    },
    async ({ userId, sessionData }) => {
        // Check for duplicate numero_sesion if it exists
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
    }
);


// --- Save Roster Flow ---

const SaveRosterInputSchema = z.object({
    userId: z.string(),
    club: z.string(),
    equipo: z.string(),
    campeonato: z.string(),
    players: z.array(RosterPlayerSchema),
});
type SaveRosterInput = z.infer<typeof SaveRosterInputSchema>;

export async function saveRoster(input: SaveRosterInput): Promise<{ success: boolean }> {
    return saveRosterFlow(input);
}

const saveRosterFlow = ai.defineFlow(
    {
        name: 'saveRosterFlow',
        inputSchema: SaveRosterInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ userId, club, equipo, campeonato, players }) => {
        const docRef = doc(db, 'usuarios', userId, 'team', 'roster');
        await setDoc(docRef, {
            club,
            equipo,
            campeonato,
            players,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    }
);


// --- Save Attendance Flow ---

const SaveAttendanceInputSchema = z.object({
    userId: z.string(),
    dateString: z.string(),
    attendance: AttendanceDataSchema,
});
type SaveAttendanceInput = z.infer<typeof SaveAttendanceInputSchema>;

export async function saveAttendance(input: SaveAttendanceInput): Promise<{ success: boolean }> {
    return saveAttendanceFlow(input);
}

const saveAttendanceFlow = ai.defineFlow(
    {
        name: 'saveAttendanceFlow',
        inputSchema: SaveAttendanceInputSchema,
        outputSchema: z.object({ success: z.boolean() }),
    },
    async ({ userId, dateString, attendance }) => {
        const docRef = doc(db, 'usuarios', userId, 'team', 'attendance');
        await setDoc(docRef, {
            [dateString]: attendance,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return { success: true };
    }
);


// --- Save Match Flow (Add & Update) ---

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

export async function saveMatch(input: SaveMatchInput): Promise<{ matchId: string }> {
  return saveMatchFlow(input);
}

const saveMatchFlow = ai.defineFlow({
    name: 'saveMatchFlow',
    inputSchema: SaveMatchInputSchema,
    outputSchema: z.object({ matchId: z.string() }),
}, async ({ matchId, matchData }) => {
    if (matchId) {
        // Update existing match
        const docRef = doc(db, "partidos_estadisticas", matchId);
        await updateDoc(docRef, {
            ...matchData,
            updatedAt: serverTimestamp(),
        });
        return { matchId };
    } else {
        // Add new match
        const docRef = await addDoc(collection(db, "partidos_estadisticas"), {
            ...matchData,
            createdAt: serverTimestamp(),
        });
        return { matchId: docRef.id };
    }
});


// --- Delete Match Flow ---

const DeleteMatchInputSchema = z.object({
    matchId: z.string(),
});
type DeleteMatchInput = z.infer<typeof DeleteMatchInputSchema>;

export async function deleteMatch(input: DeleteMatchInput): Promise<{ success: boolean }> {
    return deleteMatchFlow(input);
}

const deleteMatchFlow = ai.defineFlow({
    name: 'deleteMatchFlow',
    inputSchema: DeleteMatchInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ matchId }) => {
    await deleteDoc(doc(db, "partidos_estadisticas", matchId));
    return { success: true };
});

// --- Delete Session Flow ---
const DeleteSessionInputSchema = z.object({
    sessionId: z.string(),
});
type DeleteSessionInput = z.infer<typeof DeleteSessionInputSchema>;

export async function deleteSession(input: DeleteSessionInput): Promise<{ success: boolean }> {
    return deleteSessionFlow(input);
}

const deleteSessionFlow = ai.defineFlow({
    name: 'deleteSessionFlow',
    inputSchema: DeleteSessionInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
}, async ({ sessionId }) => {
    await deleteDoc(doc(db, "mis_sesiones", sessionId));
    return { success: true };
});
