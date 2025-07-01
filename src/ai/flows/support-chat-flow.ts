
'use server';
/**
 * @fileOverview A flow for handling support chat with an AI futsal coach.
 * 
 * - askCoach - A function that takes a user's question and returns an AI response.
 * - SupportChatInput - The input type for the askCoach function.
 * - SupportChatOutput - The return type for the askCoach function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SupportChatInputSchema = z.object({
  question: z.string().describe("The user's question for the AI coach."),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  answer: z.string().describe("The AI coach's answer to the user's question."),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;

export async function askCoach(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'supportChatPrompt',
  input: {schema: SupportChatInputSchema},
  output: {schema: SupportChatOutputSchema},
  prompt: `
    You are FutsalDex AI Coach, an expert and friendly online futsal coach. Your role is to answer user questions about exercises, training sessions, tactics, player development, and any other futsal-related topic. 

    Provide clear, helpful, and concise advice. Be encouraging and professional.

    User's question: {{{question}}}
  `,
});

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid answer.");
    }
    return output;
  }
);
