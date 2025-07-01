
'use server';
/**
 * @fileOverview A flow for handling support chat with an AI futsal coach,
 * including saving conversation history to Firestore.
 * 
 * - askCoach - A function that takes a user's question and returns an AI response,
 *   while managing the conversation history.
 * - SupportChatInput - The input type for the askCoach function.
 * - SupportChatOutput - The return type for the askCoach function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from 'genkit';

// Internal Zod schemas
const SupportChatInputSchema = z.object({
  question: z.string().describe("The user's question for the AI coach."),
  chatId: z.string().optional().describe("The unique ID for the chat session."),
  userId: z.string().describe("The user's unique ID."),
});

const SupportChatOutputSchema = z.object({
  answer: z.string().describe("The AI coach's answer to the user's question."),
  chatId: z.string().describe("The unique ID for the chat session."),
});

// Exported Types
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;

// DB Message type
interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    createdAt: Timestamp;
}

// Exported main function
export async function askCoach(input: SupportChatInput): Promise<SupportChatOutput> {
  const currentChatId = input.chatId || doc(collection(db, 'support_chats')).id;
  let history: Message[] = [];
  const chatDocRef = doc(db, "support_chats", currentChatId);

  // 1. Fetch existing history if this is an ongoing chat
  if (input.chatId) {
    try {
      const docSnap = await getDoc(chatDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Convert Firestore messages to Genkit Message format
        if (data.messages && Array.isArray(data.messages)) {
            history = (data.messages as ChatMessage[]).map(msg => ({
              role: msg.role === 'ai' ? 'model' : 'user', // Map 'ai' to 'model' for Genkit
              parts: [{ text: msg.content }],
            }));
        }
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      // Proceed without history if fetch fails
    }
  }

  // 2. Call the AI model
  const systemPrompt = `You are FutsalDex AI Coach, an expert and friendly online futsal coach. Your role is to answer user questions about exercises, training sessions, tactics, player development, and any other futsal-related topic. Provide clear, helpful, and concise advice. Be encouraging and professional.`;

  const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      prompt: input.question,
      history: history,
      system: systemPrompt,
  });

  const answer = response.text;
  if (!answer) {
    throw new Error("The AI model did not return a valid answer.");
  }
  
  // 3. Save the new turn to Firestore
  const userMessage = {
    role: 'user',
    content: input.question,
    createdAt: serverTimestamp(),
  };

  const aiMessage = {
    role: 'ai', // Use 'ai' for our DB
    content: answer,
    createdAt: serverTimestamp(),
  };

  try {
    const docSnap = await getDoc(chatDocRef);
    if (docSnap.exists()) {
      // Chat exists, update it
      await updateDoc(chatDocRef, {
        messages: arrayUnion(userMessage, aiMessage),
        updatedAt: serverTimestamp(),
      });
    } else {
      // New chat, create it
      await setDoc(chatDocRef, {
        userId: input.userId,
        title: input.question.substring(0, 40) + '...',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        messages: [userMessage, aiMessage],
      });
    }
  } catch (error) {
    console.error("Error saving chat to Firestore:", error);
    // Don't block the response, just log the error.
  }

  // 4. Return the response to the client
  return {
    answer,
    chatId: currentChatId,
  };
}
