
'use server';
/**
 * @fileOverview Flow to generate a futsal training session using AI.
 *
 * - generateSession - A function that handles the futsal session generation.
 * - GenerateSessionInput - The input type for the generateSession function.
 * - GeneratedSessionOutput - The return type for the generateSession function.
 */

import { ai } from '@/ai/dev';
import { z } from 'zod';

const GenerateSessionInputSchema = z.object({
  teamDescription: z.string().describe("Detailed description of the team, including age, skill level, and characteristics."),
  trainingGoals: z.string().describe("Specific goals for this training session (e.g., improve passing, defensive positioning)."),
  sessionFocus: z.string().describe("Main focus of the session (e.g., 'Transitions', 'Ball Possession', 'Finishing')."),
  preferredSessionLengthMinutes: z.number().describe("The total desired duration of the session in minutes."),
});
export type GenerateSessionInput = z.infer<typeof GenerateSessionInputSchema>;

const GeneratedSessionOutputSchema = z.object({
    warmUp: z.string().describe("A detailed description of the warm-up exercise, including duration and objectives."),
    mainExercises: z.array(z.string()).describe("An array of 2 to 4 detailed main exercises. Each exercise should include its own description, objectives, and duration."),
    coolDown: z.string().describe("A detailed description of the cool-down exercise, including its duration and purpose."),
    coachNotes: z.string().describe("General notes and key points for the coach to focus on during the entire session."),
});
export type GeneratedSessionOutput = z.infer<typeof GeneratedSessionOutputSchema>;

export async function generateSession(input: GenerateSessionInput): Promise<GeneratedSessionOutput> {
  return generateSessionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSessionPrompt',
  input: {schema: GenerateSessionInputSchema},
  output: {schema: GeneratedSessionOutputSchema},
  prompt: `
    You are FutsalDex AI, an expert futsal coach with deep knowledge of modern training methodologies for all age groups. Your task is to design a complete, coherent, and effective training session based on the user's requirements.

    User's Requirements:
    - Team Description: {{{teamDescription}}}
    - Main Training Goals: {{{trainingGoals}}}
    - Session Focus: {{{sessionFocus}}}
    - Total Session Duration: {{{preferredSessionLengthMinutes}}} minutes.

    Instructions:
    1.  **Analyze Requirements:** Carefully consider the team's description, goals, focus, and total duration.
    2.  **Structure the Session:** Create a session with three distinct phases: Warm-Up, Main Part, and Cool-Down.
    3.  **Allocate Time:** Distribute the total session time logically across the three phases. The main part should be the longest.
    4.  **Design Exercises:**
        -   For each phase, provide a clear and detailed description of one or more exercises.
        -   The main part must contain between 2 and 4 exercises.
        -   All exercises must be directly related to the session's focus and goals.
        -   For each exercise, specify its objective and estimated duration.
    5.  **Provide Coach Notes:** Include a final section with key coaching points, things to watch out for, and advice on how to manage the session effectively.
    6.  **Output Format:** Ensure your response strictly follows the provided JSON schema. The output must be a valid JSON object.
  `,
});

const generateSessionFlow = ai.defineFlow(
  {
    name: 'generateSessionFlow',
    inputSchema: GenerateSessionInputSchema,
    outputSchema: GeneratedSessionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid session plan.");
    }
    return output;
  }
);
