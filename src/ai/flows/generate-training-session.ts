// src/ai/flows/generate-training-session.ts
'use server';

/**
 * @fileOverview Generates a personalized futsal training session based on user input.
 *
 * - generateTrainingSession - A function that generates a training session.
 * - GenerateTrainingSessionInput - The input type for the generateTrainingSession function.
 * - GenerateTrainingSessionOutput - The return type for the generateTrainingSession function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTrainingSessionInputSchema = z.object({
  teamDescription: z
    .string()
    .describe('Description of the team, including skill level and experience.'),
  trainingGoals: z
    .string()
    .describe('The goals for the training session, e.g., improving passing accuracy, shooting power.'),
  sessionFocus: z
    .string()
    .describe('The focus of the training session, e.g., attack, defense, transition.'),
  preferredSessionLengthMinutes: z
    .number()
    .describe('The desired length of the training session in minutes.'),
});
export type GenerateTrainingSessionInput = z.infer<
  typeof GenerateTrainingSessionInputSchema
>;

const GenerateTrainingSessionOutputSchema = z.object({
  sessionTitle: z.string().describe('The title of the training session.'),
  warmUp: z.string().describe('A warm-up exercise for the session.'),
  mainExercises: z.array(z.string()).describe('Main exercises for the session.'),
  coolDown: z.string().describe('A cool-down exercise for the session.'),
  coachNotes: z
    .string()
    .describe('Additional notes for the coach, including specific instructions or modifications.'),
});
export type GenerateTrainingSessionOutput = z.infer<
  typeof GenerateTrainingSessionOutputSchema
>;

export async function generateTrainingSession(
  input: GenerateTrainingSessionInput
): Promise<GenerateTrainingSessionOutput> {
  return generateTrainingSessionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTrainingSessionPrompt',
  input: {schema: GenerateTrainingSessionInputSchema},
  output: {schema: GenerateTrainingSessionOutputSchema},
  prompt: `You are an expert futsal coach, creating training sessions based on user input.

  Consider the team description, training goals, session focus and preferred session length to create a training session plan.

  Team Description: {{{teamDescription}}}
  Training Goals: {{{trainingGoals}}}
  Session Focus: {{{sessionFocus}}}
  Preferred Session Length (minutes): {{{preferredSessionLengthMinutes}}}

  The output should be structured into warm-up, main exercises (a list of exercises) and cool-down sections, along with coach's notes.
  Make sure the session is tailored for futsal, not football.
  Use existing well-known futsal exercises, don't invent new exercises.

  Make the training session suitable for the provided time.
  `,}
);

const generateTrainingSessionFlow = ai.defineFlow(
  {
    name: 'generateTrainingSessionFlow',
    inputSchema: GenerateTrainingSessionInputSchema,
    outputSchema: GenerateTrainingSessionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
