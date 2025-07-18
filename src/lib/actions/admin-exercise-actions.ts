
'use server';
/**
 * @fileOverview Server actions for admin operations on exercises.
 */

import { z } from 'zod';
import { addExerciseSchema } from '@/lib/schemas';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';

// --- Add Exercise ---

const AddExerciseInputSchema = addExerciseSchema;
export type AddExerciseInput = z.infer<typeof AddExerciseInputSchema>;

const AddExerciseOutputSchema = z.object({
  exerciseId: z.string(),
  message: z.string(),
});
export type AddExerciseOutput = z.infer<typeof AddExerciseOutputSchema>;

export async function addExercise(data: AddExerciseInput): Promise<AddExerciseOutput> {
  const db = getFirebaseDb();
  const docRef = await addDoc(collection(db, "ejercicios_futsal"), {
    ...data,
    numero: data.numero || null,
    variantes: data.variantes || null,
    consejos_entrenador: data.consejos_entrenador || null,
    imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
    isVisible: data.isVisible === undefined ? true : data.isVisible,
    createdAt: new Date(),
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
  const db = getFirebaseDb();
  const MAX_BATCH_SIZE = 499;
  let successCount = 0;
  
  for (let i = 0; i < input.length; i += MAX_BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = input.slice(i, i + MAX_BATCH_SIZE);
    chunk.forEach(exData => {
      const newExerciseRef = doc(collection(db, "ejercicios_futsal"));
      batch.set(newExerciseRef, {
        ...exData,
        createdAt: new Date(),
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
  const db = getFirebaseDb();
  const exercisesCollection = collection(db, "ejercicios_futsal");
  const q = query(exercisesCollection);
  const snapshot = await getDocs(q);
  
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
    const db = getFirebaseDb();
    const q = query(collection(db, "ejercicios_futsal"), orderBy('ejercicio', 'asc'));
    const snapshot = await getDocs(q);
    
    const exercisesByName: { [name: string]: AdminExercise[] } = {};
    const exercisesToKeep: AdminExercise[] = [];
    const idsToDelete: string[] = [];

    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const parsed = AdminExerciseSchema.safeParse({
            id: docSnap.id,
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

        if (parsed.success) {
            const exercise = parsed.data;
            const nameKey = (exercise.ejercicio || '').toLowerCase().trim();
            if (!exercisesByName[nameKey]) {
                exercisesByName[nameKey] = [];
            }
            exercisesByName[nameKey].push(exercise);
        }
    });

    for (const nameKey in exercisesByName) {
        const duplicates = exercisesByName[nameKey];
        duplicates.sort((a, b) => (a.id > b.id ? 1 : -1)); // Consistent sorting
        exercisesToKeep.push(duplicates[0]); // Keep the first one
        for (let i = 1; i < duplicates.length; i++) {
            idsToDelete.push(duplicates[i].id);
        }
    }

    if (idsToDelete.length > 0) {
        const MAX_BATCH_SIZE = 499;
        for (let i = 0; i < idsToDelete.length; i += MAX_BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = idsToDelete.slice(i, i + MAX_BATCH_SIZE);
            chunk.forEach(id => {
                batch.delete(doc(db, "ejercicios_futsal", id));
            });
            await batch.commit();
        }
    }
    
    return { exercises: exercisesToKeep, deletedCount: idsToDelete.length };
}

// --- Update Exercise ---
const UpdateExerciseInputSchema = addExerciseSchema.extend({ id: z.string() });
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseInputSchema>;

export async function updateExercise(data: UpdateExerciseInput): Promise<{ success: boolean }> {
  const db = getFirebaseDb();
  const { id, ...exerciseData } = data;
  const docRef = doc(db, "ejercicios_futsal", id);
  await updateDoc(docRef, { ...exerciseData, updatedAt: new Date() });
  return { success: true };
}

// --- Delete Exercise ---
const DeleteExerciseInputSchema = z.object({ exerciseId: z.string() });
export type DeleteExerciseInput = z.infer<typeof DeleteExerciseInputSchema>;

export async function deleteExercise({ exerciseId }: DeleteExerciseInput): Promise<{ success: boolean }> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, "ejercicios_futsal", exerciseId));
  return { success: true };
}

// --- Delete All Exercises ---
export async function deleteAllExercises(): Promise<{ deletedCount: number }> {
    const db = getFirebaseDb();
    const collectionRef = collection(db, "ejercicios_futsal");
    const snapshot = await getDocs(query(collectionRef, limit(500)));
    let deletedCount = 0;

    if (snapshot.empty) {
        return { deletedCount: 0 };
    }

    let lastSnapshot = snapshot;
    while(lastSnapshot.size > 0) {
      const batch = writeBatch(db);
      lastSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      deletedCount += lastSnapshot.size;
      
      if (lastSnapshot.size < 500) break; // Exit loop if we've processed the last page
      lastSnapshot = await getDocs(query(collectionRef, limit(500)));
    }

    return { deletedCount };
}

// --- Get All Exercises for Export ---
export async function getAllExercisesForExport(): Promise<AdminExercise[]> {
    const db = getFirebaseDb();
    const exercisesCollection = collection(db, "ejercicios_futsal");
    const snapshot = await getDocs(query(exercisesCollection, orderBy('ejercicio', 'asc')));

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const parsed = AdminExerciseSchema.safeParse({
            id: docSnap.id,
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

        return parsed.success ? parsed.data : null;
    }).filter((ex): ex is AdminExercise => ex !== null);
}
