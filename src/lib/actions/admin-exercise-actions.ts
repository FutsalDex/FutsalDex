
'use server';
/**
 * @fileOverview Server actions for admin operations on exercises.
 *
 * These functions are executed on the server and use the Firebase Admin SDK
 * to bypass client-side security rules, ensuring admins can perform CRUD operations.
 */

import { z } from 'zod';
import { addExerciseSchema } from '@/lib/schemas';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// --- Add Exercise ---

const AddExerciseInputSchema = addExerciseSchema;
export type AddExerciseInput = z.infer<typeof AddExerciseInputSchema>;

const AddExerciseOutputSchema = z.object({
  exerciseId: z.string(),
  message: z.string(),
});
export type AddExerciseOutput = z.infer<typeof AddExerciseOutputSchema>;

export async function addExercise(data: AddExerciseInput): Promise<AddExerciseOutput> {
  const adminDb = getAdminDb();
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

// --- Batch Add Exercises ---

const BatchAddExercisesInputSchema = z.array(addExerciseSchema);
export type BatchAddExercisesInput = z.infer<typeof BatchAddExercisesInputSchema>;

const BatchAddExercisesOutputSchema = z.object({
  successCount: z.number(),
  message: z.string(),
});
export type BatchAddExercisesOutput = z.infer<typeof BatchAddExercisesOutputSchema>;

export async function batchAddExercises(input: BatchAddExercisesInput): Promise<BatchAddExercisesOutput> {
  const adminDb = getAdminDb();
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

// --- Get Existing Exercise Names ---
export async function getExistingExerciseNames(): Promise<string[]> {
  const adminDb = getAdminDb();
  const exercisesCollection = adminDb.collection("ejercicios_futsal");
  const snapshot = await exercisesCollection.select('ejercicio').get();
  
  if (snapshot.empty) {
    return [];
  }

  const names = snapshot.docs.map(doc => doc.data().ejercicio as string).filter(Boolean);
  return names;
}


// --- Get Exercises for Admin Panel and Clean ---
const AdminExerciseSchema = addExerciseSchema.extend({
  id: z.string(),
});
export type AdminExercise = z.infer<typeof AdminExerciseSchema>;

const AdminExerciseListOutputSchema = z.object({
  exercises: z.array(AdminExerciseSchema),
  deletedCount: z.number(),
});
export type AdminExerciseListOutput = z.infer<typeof AdminExerciseListOutputSchema>;

export async function getAdminExercisesAndClean(): Promise<AdminExerciseListOutput> {
  const adminDb = getAdminDb();
  const exercisesCollection = adminDb.collection("ejercicios_futsal");
  const snapshot = await exercisesCollection.get();

  if (snapshot.empty) {
    return { exercises: [], deletedCount: 0 };
  }

  const exercisesByName: { [key: string]: AdminExercise[] } = {};
  
  snapshot.forEach(doc => {
      const data = doc.data();
      const exerciseName = (data.ejercicio || "").trim().toLowerCase();
      
      const parsed = AdminExerciseSchema.safeParse({
        id: doc.id,
        numero: data.numero || "",
        ejercicio: data.ejercicio || "",
        descripcion: data.descripcion || "",
        objetivos: data.objetivos || "",
        espacio_materiales: data.espacio_materiales || "",
        jugadores: data.jugadores || "",
        duracion: data.duracion || "10",
        variantes: data.variantes || "",
        fase: data.fase || "",
        categoria: data.categoria || "",
        edad: Array.isArray(data.edad) ? data.edad : (typeof data.edad === 'string' ? [data.edad] : []),
        consejos_entrenador: data.consejos_entrenador || "",
        imagen: data.imagen || "",
        isVisible: data.isVisible !== false,
      });

      if (parsed.success && exerciseName) {
        if (!exercisesByName[exerciseName]) {
          exercisesByName[exerciseName] = [];
        }
        exercisesByName[exerciseName].push(parsed.data);
      }
  });

  const exercisesToKeep: AdminExercise[] = [];
  const exercisesToDeleteRefs: FirebaseFirestore.DocumentReference[] = [];

  for (const name in exercisesByName) {
    const group = exercisesByName[name];
    if (group.length > 1) {
      // Find the "best" one to keep: prefers non-placeholder images and more complete data
      group.sort((a, b) => {
        const aHasPlaceholder = a.imagen.includes('placehold.co');
        const bHasPlaceholder = b.imagen.includes('placehold.co');
        if (aHasPlaceholder !== bHasPlaceholder) {
            return aHasPlaceholder ? 1 : -1; // b is better
        }
        // Optional: further sorting by completeness, for now image is primary criteria
        return (b.descripcion?.length || 0) - (a.descripcion?.length || 0);
      });
      
      const bestToKeep = group[0];
      exercisesToKeep.push(bestToKeep);

      // Mark the rest for deletion
      for (let i = 1; i < group.length; i++) {
        exercisesToDeleteRefs.push(exercisesCollection.doc(group[i].id));
      }
    } else {
      exercisesToKeep.push(group[0]);
    }
  }


  let deletedCount = 0;
  if (exercisesToDeleteRefs.length > 0) {
    deletedCount = exercisesToDeleteRefs.length;
    const BATCH_SIZE = 499;
    for (let i = 0; i < exercisesToDeleteRefs.length; i += BATCH_SIZE) {
        const batch = adminDb.batch();
        const chunk = exercisesToDeleteRefs.slice(i, i + BATCH_SIZE);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
    }
  }

  exercisesToKeep.sort((a, b) => (a.ejercicio || '').localeCompare(b.ejercicio || ''));

  return { exercises: exercisesToKeep, deletedCount };
}


// --- Update Exercise ---
const UpdateExerciseInputSchema = addExerciseSchema.extend({ id: z.string() });
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseInputSchema>;

export async function updateExercise(data: UpdateExerciseInput): Promise<{ success: boolean }> {
  const adminDb = getAdminDb();
  const { id, ...exerciseData } = data;
  const docRef = adminDb.collection("ejercicios_futsal").doc(id);
  await docRef.update({ ...exerciseData, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
}

// --- Delete Exercise ---
const DeleteExerciseInputSchema = z.object({ exerciseId: z.string() });
export type DeleteExerciseInput = z.infer<typeof DeleteExerciseInputSchema>;

export async function deleteExercise({ exerciseId }: DeleteExerciseInput): Promise<{ success: boolean }> {
  const adminDb = getAdminDb();
  await adminDb.collection("ejercicios_futsal").doc(exerciseId).delete();
  return { success: true };
}
