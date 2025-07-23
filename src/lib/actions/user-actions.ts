
'use server';
/**
 * @fileOverview A collection of server-side actions for user data mutations.
 * These actions use the Firebase Client SDK to ensure they are executed
 * with the correct user permissions from server components.
 */

import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, getDoc, serverTimestamp, FieldValue, arrayUnion, Timestamp } from 'firebase/firestore';


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
