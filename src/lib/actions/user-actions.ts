
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


// --- Save Chat Message ---
export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    createdAt: FieldValue | Timestamp;
}
const SaveChatMessageInputSchema = z.object({
    userId: z.string(),
    chatId: z.string().optional().nullable(),
    question: z.string(),
    answer: z.string(),
});
type SaveChatMessageInput = z.infer<typeof SaveChatMessageInputSchema>;

export async function saveChatMessage(input: SaveChatMessageInput): Promise<{ chatId: string }> {
    const { userId, chatId, question, answer } = input;
    const db = getFirebaseDb();
    
    let effectiveChatId: string;
    let isNewChat = false;

    if (chatId) {
        effectiveChatId = chatId;
    } else {
        effectiveChatId = doc(collection(db, 'support_chats')).id;
        isNewChat = true;
    }

    const chatDocRef = doc(db, "support_chats", effectiveChatId);

    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      createdAt: serverTimestamp(),
    };

    const aiMessage: ChatMessage = {
      role: 'ai',
      content: answer,
      createdAt: serverTimestamp(),
    };

    try {
        if (isNewChat) {
            await setDoc(chatDocRef, {
                userId: userId,
                title: question.substring(0, 40) + '...',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                messages: [userMessage, aiMessage],
            });
        } else {
            await updateDoc(chatDocRef, {
                messages: arrayUnion(userMessage, aiMessage),
                updatedAt: serverTimestamp(),
            });
        }
        return { chatId: effectiveChatId };
    } catch (error) {
        console.error("Error saving chat to Firestore:", error);
        throw new Error("Failed to save chat message.");
    }
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
