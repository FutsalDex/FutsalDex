
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Client SDK to ensure they are executed
 * with the correct user permissions from server components.
 */

import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, getDoc, serverTimestamp, FieldValue, arrayUnion, Timestamp, increment } from 'firebase/firestore';


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


// --- Track Page View ---
const TrackPageViewInputSchema = z.object({
    userId: z.string(),
    pathname: z.string(),
});
type TrackPageViewInput = z.infer<typeof TrackPageViewInputSchema>;

export async function trackPageView(input: TrackPageViewInput): Promise<{ success: boolean }> {
    const { userId, pathname } = input;
    if (!userId || !pathname) {
        return { success: false };
    }

    try {
        const db = getFirebaseDb();
        const pageViewDocRef = doc(db, 'user_page_views', userId);
        
        // Sanitize the pathname to be a valid Firestore field key
        // Replace '/' with '_' and remove any other invalid characters.
        const fieldKey = pathname.replace(/\//g, '_').replace(/[^a-zA-Z0-9_]/g, '');

        // If the key is empty after sanitization (e.g., path was just "/"), use a default.
        const finalKey = fieldKey === '' ? 'home' : fieldKey;

        // Use dot notation to increment the nested field.
        await setDoc(pageViewDocRef, {
            [finalKey]: increment(1),
            lastVisitedPath: pathname,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        return { success: true };

    } catch (error) {
        console.error(`Error tracking page view for user ${userId} on path ${pathname}:`, error);
        // We don't throw an error to the client, as this is a background task.
        return { success: false };
    }
}
