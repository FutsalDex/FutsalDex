
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
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  limit,
  startAfter,
  getCountFromServer,
  deleteDoc,
  getDoc,
  orderBy as firestoreOrderBy,
  QueryConstraint,
} from 'firebase/firestore';

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


// --- Batch Add Exercises Flow ---

const BatchAddExercisesInputSchema = z.array(addExerciseSchema);
export type BatchAddExercisesInput = z.infer<typeof BatchAddExercisesInputSchema>;

const BatchAddExercisesOutputSchema = z.object({
  successCount: z.number(),
  message: z.string(),
});
export type BatchAddExercisesOutput = z.infer<typeof BatchAddExercisesOutputSchema>;

export async function batchAddExercises(input: BatchAddExercisesInput): Promise<BatchAddExercisesOutput> {
  return batchAddExercisesFlow(input);
}

const batchAddExercisesFlow = ai.defineFlow(
  {
    name: 'batchAddExercisesFlow',
    inputSchema: BatchAddExercisesInputSchema,
    outputSchema: BatchAddExercisesOutputSchema,
  },
  async (exercisesToSave) => {
    const MAX_BATCH_SIZE = 499;
    let successCount = 0;
    
    for (let i = 0; i < exercisesToSave.length; i += MAX_BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = exercisesToSave.slice(i, i + MAX_BATCH_SIZE);
      chunk.forEach(exData => {
        const newExerciseRef = doc(collection(db, "ejercicios_futsal"));
        batch.set(newExerciseRef, {
          ...exData,
          createdAt: serverTimestamp(),
          numero: exData.numero || null,
          variantes: exData.variantes || null,
          consejos_entrenador: exData.consejos_entrenador || null,
          isVisible: exData.isVisible === undefined ? true : exData.isVisible,
        });
      });
      await batch.commit();
      successCount += chunk.length;
    }

    return {
      successCount,
      message: `${successCount} exercises added successfully via batch operation.`
    };
  }
);


// --- Get Exercises Flow (for admin list) ---

const GetExercisesInputSchema = z.object({
  sortField: z.enum(['numero', 'ejercicio', 'fase', 'categoria', 'edad']),
  sortDirection: z.enum(['asc', 'desc']),
  pageSize: z.number().int().positive(),
  startAfterDocId: z.string().optional(),
});
export type GetExercisesInput = z.infer<typeof GetExercisesInputSchema>;

const ExerciseAdminSchema = z.object({
  id: z.string(),
  numero: z.string().optional().nullable(),
  ejercicio: z.string(),
  fase: z.string(),
  categoria: z.string(),
  edad: z.union([z.array(z.string()), z.string()]),
  isVisible: z.boolean(),
});

const GetExercisesOutputSchema = z.object({
  exercises: z.array(ExerciseAdminSchema),
  lastDocId: z.string().optional(),
});
export type GetExercisesOutput = z.infer<typeof GetExercisesOutputSchema>;

export async function getAdminExercises(input: GetExercisesInput): Promise<GetExercisesOutput> {
  return getAdminExercisesFlow(input);
}

const getAdminExercisesFlow = ai.defineFlow(
  {
    name: 'getAdminExercisesFlow',
    inputSchema: GetExercisesInputSchema,
    outputSchema: GetExercisesOutputSchema,
  },
  async ({ sortField, sortDirection, pageSize, startAfterDocId }) => {
    const ejerciciosCollection = collection(db, "ejercicios_futsal");

    const qConstraints: QueryConstraint[] = [
      firestoreOrderBy(sortField === 'edad' ? 'categoria' : sortField, sortDirection),
      limit(pageSize),
    ];
    
    if (startAfterDocId) {
        const startAfterDoc = await getDoc(doc(db, "ejercicios_futsal", startAfterDocId));
        if (startAfterDoc.exists()) {
            qConstraints.push(startAfter(startAfterDoc));
        }
    }
    
    const q = query(ejerciciosCollection, ...qConstraints);
    const querySnapshot = await getDocs(q);

    let exercises = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        numero: data.numero,
        ejercicio: data.ejercicio,
        fase: data.fase,
        categoria: data.categoria,
        edad: data.edad,
        isVisible: data.isVisible === undefined ? true : data.isVisible,
      };
    });
    
    // Replicate client-side sorting for fields that Firestore can't sort optimally (e.g., alphanumeric strings as numbers)
    if (sortField === 'numero') {
        exercises.sort((a, b) => {
          const numA = (a.numero || "").trim(); 
          const numB = (b.numero || "").trim();
          const comparison = numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
          return sortDirection === 'asc' ? comparison : -comparison;
        });
    } else if (sortField === 'edad') {
        exercises.sort((a, b) => {
          const edadA = Array.isArray(a.edad) ? a.edad.join(', ') : (a.edad || '');
          const edadB = Array.isArray(b.edad) ? b.edad.join(', ') : (b.edad || '');
          const comparison = edadA.localeCompare(edadB);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
    }
    
    const lastDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    return {
      exercises: exercises,
      lastDocId: lastDoc?.id,
    };
  }
);

// --- Get Exercise By ID Flow ---

const GetExerciseByIdInputSchema = z.object({
  exerciseId: z.string(),
});
export type GetExerciseByIdInput = z.infer<typeof GetExerciseByIdInputSchema>;

// The output must be compatible with AddExerciseFormValues (derived from addExerciseSchema)
const GetExerciseByIdOutputSchema = addExerciseSchema;
export type GetExerciseByIdOutput = z.infer<typeof GetExerciseByIdOutputSchema>;

export async function getExerciseById(input: GetExerciseByIdInput): Promise<GetExerciseByIdOutput | null> {
    return getExerciseByIdFlow(input);
}

const getExerciseByIdFlow = ai.defineFlow({
    name: 'getExerciseByIdFlow',
    inputSchema: GetExerciseByIdInputSchema,
    outputSchema: z.nullable(GetExerciseByIdOutputSchema),
}, async ({ exerciseId }) => {
    const docRef = doc(db, "ejercicios_futsal", exerciseId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Prepare data for validation, ensuring no nulls are passed to zod where not expected
        // and providing defaults for potentially missing fields.
        const preparedData = {
            numero: data.numero || "",
            ejercicio: data.ejercicio || "",
            descripcion: data.descripcion || "",
            objetivos: data.objetivos || "",
            espacio_materiales: data.espacio_materiales || "",
            jugadores: data.jugadores || "",
            duracion: data.duracion || "",
            variantes: data.variantes || "",
            fase: data.fase || "",
            categoria: data.categoria || "",
            edad: Array.isArray(data.edad) ? data.edad : (data.edad ? [String(data.edad)] : []),
            consejos_entrenador: data.consejos_entrenador || "",
            imagen: data.imagen || "",
            isVisible: typeof data.isVisible === 'boolean' ? data.isVisible : true,
        };
        
        // This will throw if the data from Firestore is fundamentally invalid (e.g., missing a required field)
        // which is good for data integrity. The client will catch this as an error.
        const validatedData = addExerciseSchema.parse(preparedData);
        return validatedData;
    } else {
        return null;
    }
});


// --- Get Exercises Count Flow ---

const GetExercisesCountOutputSchema = z.object({
  count: z.number(),
});
export type GetExercisesCountOutput = z.infer<typeof GetExercisesCountOutputSchema>;

export async function getExercisesCount(): Promise<GetExercisesCountOutput> {
  return getExercisesCountFlow();
}

const getExercisesCountFlow = ai.defineFlow({
  name: 'getExercisesCountFlow',
  inputSchema: z.void(),
  outputSchema: GetExercisesCountOutputSchema,
}, async () => {
    const q = query(collection(db, "ejercicios_futsal"));
    const snapshot = await getCountFromServer(q);
    return { count: snapshot.data().count };
});

// --- Delete Exercise Flow ---
const DeleteExerciseInputSchema = z.object({
  exerciseId: z.string(),
});
export type DeleteExerciseInput = z.infer<typeof DeleteExerciseInputSchema>;

export async function deleteExercise(input: DeleteExerciseInput): Promise<{ success: boolean }> {
  return deleteExerciseFlow(input);
}

const deleteExerciseFlow = ai.defineFlow({
  name: 'deleteExerciseFlow',
  inputSchema: DeleteExerciseInputSchema,
  outputSchema: z.object({ success: z.boolean() }),
}, async ({ exerciseId }) => {
  await deleteDoc(doc(db, "ejercicios_futsal", exerciseId));
  return { success: true };
});

// --- Toggle Exercise Visibility Flow ---
const ToggleVisibilityInputSchema = z.object({
  exerciseId: z.string(),
  newVisibility: z.boolean(),
});
export type ToggleVisibilityInput = z.infer<typeof ToggleVisibilityInputSchema>;

export async function toggleExerciseVisibility(input: ToggleVisibilityInput): Promise<{ success: boolean }> {
  return toggleExerciseVisibilityFlow(input);
}

const toggleExerciseVisibilityFlow = ai.defineFlow({
  name: 'toggleExerciseVisibilityFlow',
  inputSchema: ToggleVisibilityInputSchema,
  outputSchema: z.object({ success: z.boolean() }),
}, async ({ exerciseId, newVisibility }) => {
  const exerciseRef = doc(db, "ejercicios_futsal", exerciseId);
  await updateDoc(exerciseRef, {
    isVisible: newVisibility,
    updatedAt: serverTimestamp()
  });
  return { success: true };
});
