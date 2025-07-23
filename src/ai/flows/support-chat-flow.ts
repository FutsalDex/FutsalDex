
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

import { getGenkitAi } from '@/ai/genkit';
import { z } from 'zod';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, type DocumentData } from 'firebase/firestore';
import type { Message } from 'genkit';
import { saveChatMessage, type ChatMessage } from '@/lib/actions/user-actions';

const ai = getGenkitAi();

// Internal Zod schemas
const SupportChatInputSchema = z.object({
  question: z.string().describe("The user's question for the AI coach."),
  chatId: z.string().optional().describe("The unique ID for the chat session."),
  userId: z.string().describe("The user's unique ID. Can be 'guest-user' for non-registered users."),
});

const SupportChatOutputSchema = z.object({
  answer: z.string().describe("The AI coach's answer to the user's question."),
  chatId: z.string().describe("The unique ID for the chat session."),
});

// Exported Types
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;


// Exported main function
export async function askCoach(input: SupportChatInput): Promise<SupportChatOutput> {
  const isGuest = input.userId === 'guest-user';
  let currentChatId = input.chatId || '';
  let history: Message[] = [];

  // --- Database operations only for registered users ---
  if (!isGuest && input.chatId) {
    try {
      const db = getFirebaseDb();
      const chatDocRef = doc(db, "support_chats", input.chatId);
      const docSnap = await getDoc(chatDocRef);

      if (docSnap.exists() && docSnap.data()?.userId === input.userId) {
          const data = docSnap.data() as DocumentData;
          if (data?.messages && Array.isArray(data.messages)) {
              history = (data.messages as ChatMessage[]).map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }],
              }));
          }
      }
    } catch (error) {
      console.error("Error fetching chat history from client:", error);
      // Do not block the flow, just proceed without history
    }
  }

  // 2. Call the AI model
  const systemPrompt = `You are FutsalDex AI Coach, a world-class futsal expert with years of experience coaching at elite levels. Your persona is that of a professional, encouraging, and deeply knowledgeable mentor.

Your primary goal is to provide authentic, detailed, and precise answers to user questions.

When providing advice, follow these principles:
1.  **Be Specific and Actionable:** Don't give vague advice. Provide concrete, step-by-step instructions, specific drills, or tactical setups. Explain the 'why' behind your recommendations. For example, instead of "improve passing," suggest a drill like "a 4-corner passing drill focusing on one-touch passes and player movement after the pass."
2.  **Provide Detail:** Elaborate on your points. If you describe an exercise, include its objectives, necessary materials, and key coaching points. If you discuss a tactic, explain its strengths and potential weaknesses.
3.  **Use Your Expertise:** Draw upon your deep knowledge of futsal. Reference tactical concepts, modern training methodologies, and principles of player development.
4.  **Maintain Context:** You have access to the conversation history. Use it to remember previous questions and provide follow-up advice that is consistent and builds upon your prior responses. Always be helpful and aim to solve the user's problem or answer their question comprehensively.

**IMPORTANT: You MUST respond in Spanish (es-ES).**`;

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
  
  // 3. Save the new turn to Firestore for registered users using a dedicated server action
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


  // 4. Return the response to the client
  return {
    answer,
    chatId: currentChatId,
  };
}
