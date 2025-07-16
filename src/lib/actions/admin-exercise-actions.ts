
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
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, getDocs, writeBatch as clientWriteBatch, doc } from 'firebase/firestore';


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
  let adminDb;
  try {
    adminDb = getAdminDb();
    // This line will throw if the Admin SDK is not initialized, and we'll catch it.
    await adminDb.listCollections();
  } catch (e) {
    console.warn(
      "Admin SDK no disponible en entorno local. " +
      "Se omitirá la limpieza de ejercicios duplicados. " +
      "La limpieza se ejecutará en producción."
    );
    // Fallback to client SDK just to read the data without cleaning
    const clientDb = getFirebaseDb();
    const snapshot = await getDocs(collection(clientDb, "ejercicios_futsal"));
    const exercises = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const parsed = AdminExerciseSchema.safeParse({ id: docSnap.id, ...data });
        return parsed.success ? parsed.data : null;
    }).filter((ex): ex is AdminExercise => ex !== null);

    return { exercises, deletedCount: 0 };
  }

  const exercisesCollection = adminDb.collection("ejercicios_futsal");
  const snapshot = await exercisesCollection.get();

  if (snapshot.empty) {
    return { exercises: [], deletedCount: 0 };
  }

  const exercisesByName: { [key: string]: AdminExercise[] } = {};
  
  snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const exerciseName = (data.ejercicio || "").trim().toLowerCase();
      
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
      group.sort((a, b) => {
        const aHasPlaceholder = a.imagen.includes('placehold.co');
        const bHasPlaceholder = b.imagen.includes('placehold.co');
        if (aHasPlaceholder !== bHasPlaceholder) {
            return aHasPlaceholder ? 1 : -1;
        }
        return (b.descripcion?.length || 0) - (a.descripcion?.length || 0);
      });
      
      const bestToKeep = group[0];
      exercisesToKeep.push(bestToKeep);

      for (let i = 1; i < group.length; i++) {
        exercisesToDeleteRefs.push(adminDb.collection("ejercicios_futsal").doc(group[i].id));
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

// --- Delete All Exercises ---
export async function deleteAllExercises(): Promise<{ deletedCount: number }> {
    const adminDb = getAdminDb();
    const collectionRef = adminDb.collection("ejercicios_futsal");
    const snapshot = await collectionRef.limit(500).get();
    let deletedCount = 0;

    if (snapshot.empty) {
        return { deletedCount: 0 };
    }

    let lastSnapshot = snapshot;
    while(lastSnapshot.size > 0) {
      const batch = adminDb.batch();
      lastSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      deletedCount += lastSnapshot.size;
      lastSnapshot = await collectionRef.limit(500).get();
    }

    return { deletedCount };
}

// --- Get All Exercises for Export ---
export async function getAllExercisesForExport(): Promise<AdminExercise[]> {
    const adminDb = getAdminDb();
    const exercisesCollection = adminDb.collection("ejercicios_futsal");
    const snapshot = await exercisesCollection.orderBy('ejercicio', 'asc').get();

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map(doc => {
        const data = doc.data();
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

        // Return valid data, or a default structure for invalid docs to avoid crashes
        if (parsed.success) {
            return parsed.data;
        }
        return null;
    }).filter((ex): ex is AdminExercise => ex !== null);
}
