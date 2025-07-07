'use server';
/**
 * @fileOverview Server actions for admin operations on exercises.
 *
 * These functions are executed on the server and use the Firebase Admin SDK
 * to bypass client-side security rules, ensuring admins can perform CRUD operations.
 */

import { z } from 'zod';
import { addExerciseSchema } from '@/lib/schemas';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// --- Add Exercise ---

const AddExerciseInputSchema = addExerciseSchema;
export type AddExerciseInput = z.infer<typeof AddExerciseInputSchema>;

const AddExerciseOutputSchema = z.object({
  exerciseId: z.string(),
  message: z.string(),
});
export type AddExerciseOutput = z.infer<typeof AddExerciseOutputSchema>;

export async function addExercise(data: AddExerciseInput): Promise<AddExerciseOutput> {
  const docRef = await adminDb.collection("ejercicios_futsal").add({
    ...data,
    numero: data.numero || null,
    variantes: data.variantes || null,
    consejos_entrenador: data.consejos_entrenador || null,
    imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
    isVisible: data.isVisible === undefined ? true : data.isVisible,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    exerciseId: docRef.id,
    message: `Exercise "${data.ejercicio}" added successfully.`,
  };
}


// --- Update Exercise ---

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
  const { id, ...data } = input;
  const docRef = adminDb.collection("ejercicios_futsal").doc(id);
  
  await docRef.update({
    ...data,
    numero: data.numero || null,
    variantes: data.variantes || null,
    consejos_entrenador: data.consejos_entrenador || null,
    imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
    isVisible: data.isVisible === undefined ? true : data.isVisible,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    exerciseId: id,
    message: `Exercise "${data.ejercicio}" updated successfully.`,
  };
}


// --- Batch Add Exercises ---

const BatchAddExercisesInputSchema = z.array(addExerciseSchema);
export type BatchAddExercisesInput = z.infer<typeof BatchAddExercisesInputSchema>;

const BatchAddExercisesOutputSchema = z.object({
  successCount: z.number(),
  message: z.string(),
});
export type BatchAddExercisesOutput = z.infer<typeof BatchAddExercisesOutputSchema>;

export async function batchAddExercises(input: BatchAddExercisesInput): Promise<BatchAddExercisesOutput> {
  const MAX_BATCH_SIZE = 499;
  let successCount = 0;
  
  for (let i = 0; i < input.length; i += MAX_BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = input.slice(i, i + MAX_BATCH_SIZE);
    chunk.forEach(exData => {
      const newExerciseRef = adminDb.collection("ejercicios_futsal").doc();
      batch.set(newExerciseRef, {
        ...exData,
        createdAt: FieldValue.serverTimestamp(),
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


// --- Get Exercises (for admin list) ---

const GetExercisesInputSchema = z.object({
  sortField: z.enum(['numero', 'ejercicio', 'fase', 'categoria', 'edad']),
  sortDirection: z.enum(['asc', 'desc']),
  pageSize: z.number().int().positive(),
  startAfterDocId: z.string().optional(),
  visibility: z.enum(['all', 'visible', 'hidden']).optional(),
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
  const { sortField, sortDirection, pageSize, startAfterDocId, visibility } = input;
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection("ejercicios_futsal");

  // Apply visibility filter
  if (visibility === 'visible') {
    q = q.where('isVisible', '==', true);
  } else if (visibility === 'hidden') {
    q = q.where('isVisible', '==', false);
  }

  q = q.orderBy(sortField === 'edad' ? 'categoria' : sortField, sortDirection).limit(pageSize);
  
  if (startAfterDocId) {
      const startAfterDoc = await adminDb.collection("ejercicios_futsal").doc(startAfterDocId).get();
      if (startAfterDoc.exists) {
          q = q.startAfter(startAfterDoc);
      }
  }
  
  const querySnapshot = await q.get();

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

// --- Get Exercise By ID ---

const GetExerciseByIdInputSchema = z.object({
  exerciseId: z.string(),
});
export type GetExerciseByIdInput = z.infer<typeof GetExerciseByIdInputSchema>;

const GetExerciseByIdOutputSchema = addExerciseSchema;
export type GetExerciseByIdOutput = z.infer<typeof GetExerciseByIdOutputSchema>;

export async function getExerciseById({ exerciseId }: GetExerciseByIdInput): Promise<GetExerciseByIdOutput | null> {
    const docRef = adminDb.collection("ejercicios_futsal").doc(exerciseId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const data = docSnap.data()!;
        
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
        
        const validatedData = addExerciseSchema.parse(preparedData);
        return validatedData;
    } else {
        return null;
    }
}


// --- Get Exercises Count ---

const GetExercisesCountOutputSchema = z.object({
  count: z.number(),
});
export type GetExercisesCountOutput = z.infer<typeof GetExercisesCountOutputSchema>;

export async function getExercisesCount(): Promise<GetExercisesCountOutput> {
  const snapshot = await adminDb.collection("ejercicios_futsal").count().get();
  return { count: snapshot.data().count };
}

// --- Delete Exercise ---
const DeleteExerciseInputSchema = z.object({
  exerciseId: z.string(),
});
export type DeleteExerciseInput = z.infer<typeof DeleteExerciseInputSchema>;

export async function deleteExercise({ exerciseId }: DeleteExerciseInput): Promise<{ success: boolean }> {
  await adminDb.collection("ejercicios_futsal").doc(exerciseId).delete();
  return { success: true };
}

// --- Toggle Exercise Visibility ---
const ToggleVisibilityInputSchema = z.object({
  exerciseId: z.string(),
  newVisibility: z.boolean(),
});
export type ToggleVisibilityInput = z.infer<typeof ToggleVisibilityInputSchema>;

export async function toggleExerciseVisibility({ exerciseId, newVisibility }: ToggleVisibilityInput): Promise<{ success: boolean }> {
  const exerciseRef = adminDb.collection("ejercicios_futsal").doc(exerciseId);
  await exerciseRef.update({
    isVisible: newVisibility,
    updatedAt: FieldValue.serverTimestamp()
  });
  return { success: true };
}
