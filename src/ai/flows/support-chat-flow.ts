
'use server';
/**
 * @fileOverview A flow for handling support chat with an AI futsal coach.
 * This version uses a separate client-side action to save chat history,
 * avoiding the need for Admin SDK credentials in the development environment.
 * 
 * - askCoach - A function that takes a user's question and returns an AI response,
 *   while managing the conversation history.
 * - SupportChatInput - The input type for the askCoach function.
 * - SupportChatOutput - The return type for the askCoach function.
 */

import { ai } from '@/ai/dev';
import { z } from 'zod';
import type { Message } from 'genkit';
import { saveChatMessage } from '@/lib/actions/user-actions';

// Exported Types
export interface SupportChatInput {
  question: string;
  chatId?: string | null;
  userId: string;
  history: Message[]; // History is now passed from the client
}

export interface SupportChatOutput {
  answer: string;
  chatId: string;
}

// Internal Zod schemas (not exported)
const SupportChatInputSchema = z.object({
  question: z.string().describe("The user's question for the AI coach."),
  chatId: z.string().optional().nullable(),
  userId: z.string().describe("The user's unique ID. Can be 'guest-user' for non-registered users."),
  history: z.any().describe("The conversation history."), // Simplified for internal validation
});

const SupportChatOutputSchema = z.object({
  answer: z.string().describe("The AI coach's answer to the user's question."),
  chatId: z.string().describe("The unique ID for the chat session."),
});


// Exported main function
export async function askCoach(input: SupportChatInput): Promise<SupportChatOutput> {
  const isGuest = input.userId === 'guest-user';
  let currentChatId = input.chatId || '';

  // 1. Call the AI model with the provided history
  const systemPrompt = `You are FutsalDex AI Coach, a world-class futsal expert. Your persona is that of a professional, encouraging, and deeply knowledgeable mentor.

Your primary goal is to provide authentic, detailed, and precise answers to user questions.

When providing advice, follow these principles strictly:
1.  **Prioridad #1: Ser Extremadamente Breve y Conciso.** Tu objetivo principal es la claridad y la rapidez. Usa frases cortas y directas. Emplea listas con viñetas en lugar de párrafos largos. Evita las explicaciones extensas y la jerga innecesaria. Ve siempre al grano.
2.  **Ser Específico y Accionable:** No des consejos vagos. Proporciona instrucciones concretas, ejercicios específicos o configuraciones tácticas claras.
3.  **Proporcionar Detalle Suficiente (pero breve):** Si describes un ejercicio, incluye sus objetivos y materiales de forma escueta. Si hablas de una táctica, menciona su punto fuerte principal. No te extiendas.
4.  **Mantener el Contexto:** Utiliza el historial de la conversación para dar respuestas coherentes, pero no repitas información.

**IMPORTANTE: Debes responder en Español (es-ES).**`;

  const generateParams: any = {
      model: 'gemini-pro',
      prompt: input.question,
      history: input.history,
  };
  
  if (systemPrompt.trim()) {
      generateParams.system = systemPrompt;
  }

  const response = await ai.generate(generateParams);

  const answer = response.text;
  if (!answer) {
    throw new Error("The AI model did not return a valid answer.");
  }
  
  // 2. Save the new turn to Firestore for registered users using a dedicated server action
  if (!isGuest) {
    try {
        const result = await saveChatMessage({
            userId: input.userId,
            chatId: input.chatId,
            question: input.question,
            answer: answer
        });
        currentChatId = result.chatId; // Get the new chat ID if it was created
    } catch (error) {
        console.error("Error saving chat message via server action:", error);
        // Do not block the response to the user, but log the error.
        // The chat will just not be saved for this turn.
    }
  } else {
    currentChatId = 'guest-chat'; // Ephemeral ID for guests
  }

  // 3. Return the response to the client
  return {
    answer,
    chatId: currentChatId,
  };
}
