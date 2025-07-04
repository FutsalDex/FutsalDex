
'use server';
/**
 * @fileOverview Flow for admin operations on exercises.
 *
 * - addExercise - Saves a new exercise to the Firestore database.
 * - updateExercise - Updates an existing exercise in the Firestore database.
 *   These are admin-only operations, executed on the server to bypass client-side security rules.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { addExerciseSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// --- Add Exercise Flow ---

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

const addExerciseFlow = ai.defineFlow(
  {
    name: 'addExerciseFlow',
    inputSchema: AddExerciseInputSchema,
    outputSchema: AddExerciseOutputSchema,
  },
  async (data) => {
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


// --- Update Exercise Flow ---

const UpdateExerciseInputSchema = addExerciseSchema.extend({
  id: z.string().min(1, "Exercise ID is required for updates."),
});
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseInputSchema>;

const UpdateExerciseOutputSchema = z.object({
  exerciseId: z.string(),
  message: z.string(),
});
export type UpdateExerciseOutput = z.infer<typeof UpdateExerciseOutputSchema>;

export async function updateExercise(input: UpdateExerciseInput): Promise<UpdateExerciseOutput> {
  return updateExerciseFlow(input);
}

const updateExerciseFlow = ai.defineFlow(
  {
    name: 'updateExerciseFlow',
    inputSchema: UpdateExerciseInputSchema,
    outputSchema: UpdateExerciseOutputSchema,
  },
  async (input) => {
    const { id, ...data } = input;
    const docRef = doc(db, "ejercicios_futsal", id);
    
    // The data received here is already validated against the Zod schema
    await updateDoc(docRef, {
      ...data,
      // The flow now handles setting null for empty optional fields, matching the add logic
      numero: data.numero || null,
      variantes: data.variantes || null,
      consejos_entrenador: data.consejos_entrenador || null,
      imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
      isVisible: data.isVisible === undefined ? true : data.isVisible,
      updatedAt: serverTimestamp(),
    });

    return {
      exerciseId: id,
      message: `Exercise "${data.ejercicio}" updated successfully.`,
    };
  }
);
