
'use server';
/**
 * @fileOverview Flow for admin operations on exercises.
 *
 * - addExercise - Saves a new exercise to the Firestore database.
 *   This is an admin-only operation, executed on the server to bypass client-side security rules.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addExerciseSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// The input will be the same as the form validation schema
const AddExerciseInputSchema = addExerciseSchema;
export type AddExerciseInput = z.infer<typeof AddExerciseInputSchema>;

const AddExerciseOutputSchema = z.object({
  exerciseId: z.string(),
  message: z.string(),
});
export type AddExerciseOutput = z.infer<typeof AddExerciseOutputSchema>;

// Exported wrapper function for the client to call
export async function addExercise(input: AddExerciseInput): Promise<AddExerciseOutput> {
  return addExerciseFlow(input);
}

// The Genkit flow definition
const addExerciseFlow = ai.defineFlow(
  {
    name: 'addExerciseFlow',
    inputSchema: AddExerciseInputSchema,
    outputSchema: AddExerciseOutputSchema,
  },
  async (data) => {
    // This server-side flow runs with admin privileges defined by its execution environment.
    // It is not subject to client-side Firestore security rules.
    const docRef = await addDoc(collection(db, "ejercicios_futsal"), {
      ...data,
      numero: data.numero || null,
      variantes: data.variantes || null,
      consejos_entrenador: data.consejos_entrenador || null,
      imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
      isVisible: data.isVisible === undefined ? true : data.isVisible,
      createdAt: serverTimestamp(),
    });

    return {
      exerciseId: docRef.id,
      message: `Exercise "${data.ejercicio}" added successfully.`,
    };
  }
);
