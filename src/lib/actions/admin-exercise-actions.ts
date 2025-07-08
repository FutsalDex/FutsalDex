
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
  visibility: z.enum(['all', 'visible', 'hidden']).optional().default('all'),
  sortField: z.enum(['numero', 'ejercicio', 'categoria', 'fase']).default('ejercicio'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
  pageSize: z.number().default(15),
  startAfterDocId: z.string().optional(),
  searchTerm: z.string().optional(),
});
export type GetExercisesInput = z.infer<typeof GetExercisesInputSchema>;

const ExerciseAdminSchema = z.object({
  id: z.string(),
  numero: z.string().optional().nullable(),
  ejercicio: z.string(),
  fase: z.string(),
  categoria: z.string(),
  edad: z.array(z.string()),
  isVisible: z.boolean(),
  imagen: z.string().optional().nullable(),
});

const GetExercisesOutputSchema = z.object({
  exercises: z.array(ExerciseAdminSchema),
  lastDocId: z.string().optional().nullable(),
  hasNextPage: z.boolean(),
});
export type GetExercisesOutput = z.infer<typeof GetExercisesOutputSchema>;

export async function getAdminExercises(input: GetExercisesInput): Promise<GetExercisesOutput> {
  const { visibility, sortField, sortDirection, pageSize, startAfterDocId, searchTerm } = input;
  let baseQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection("ejercicios_futsal");

  // Apply visibility filter
  if (visibility === 'visible') {
    baseQuery = baseQuery.where('isVisible', '==', true);
  } else if (visibility === 'hidden') {
    baseQuery = baseQuery.where('isVisible', '==', false);
  }
  
  // Apply search term filter (prefix search)
  // Firestore requires that the first orderBy field matches the inequality field.
  const finalSortField = searchTerm ? 'ejercicio' : sortField;
  if (searchTerm) {
    const searchQuery = baseQuery
      .where('ejercicio', '>=', searchTerm)
      .where('ejercicio', '<=', searchTerm + '\uf8ff');
    baseQuery = searchQuery;
  }

  // Apply sorting
  let dataQuery = baseQuery.orderBy(finalSortField, sortDirection);

  // Apply pagination cursor if provided
  if (startAfterDocId) {
    const lastDoc = await adminDb.collection("ejercicios_futsal").doc(startAfterDocId).get();
    if (lastDoc.exists) {
      dataQuery = dataQuery.startAfter(lastDoc);
    }
  }
  
  // Fetch one more than page size to check for next page
  dataQuery = dataQuery.limit(pageSize + 1);
  
  const querySnapshot = await dataQuery.get();

  const hasNextPage = querySnapshot.docs.length > pageSize;
  const docsToMap = hasNextPage ? querySnapshot.docs.slice(0, -1) : querySnapshot.docs;

  const exercises = docsToMap.map(docSnap => {
    const data = docSnap.data();
    const edadData = data.edad;
    // Ensure 'edad' is always an array to prevent client-side errors.
    const processedEdad = Array.isArray(edadData) ? edadData : (edadData ? [String(edadData)] : []);
    
    return {
      id: docSnap.id,
      numero: data.numero,
      ejercicio: data.ejercicio,
      fase: data.fase,
      categoria: data.categoria,
      edad: processedEdad,
      isVisible: data.isVisible === undefined ? true : data.isVisible,
      imagen: data.imagen || null,
    };
  });
  
  const lastDocId = querySnapshot.docs.length > 0 ? querySnapshot.docs[docsToMap.length - 1]?.id : null;
  
  return {
    exercises,
    lastDocId,
    hasNextPage,
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
        
        const rawDuration = data.duracion || "";
        const numericDuration = (String(rawDuration).match(/\d+/) || [""])[0];
        
        const preparedData = {
            numero: data.numero || "",
            ejercicio: data.ejercicio || "",
            descripcion: data.descripcion || "",
            objetivos: data.objetivos || "",
            espacio_materiales: data.espacio_materiales || "",
            jugadores: data.jugadores || "",
            duracion: numericDuration,
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


// --- Set All Exercises Visibility ---
const SetAllExercisesVisibilityInputSchema = z.object({
  isVisible: z.boolean(),
});
export type SetAllExercisesVisibilityInput = z.infer<typeof SetAllExercisesVisibilityInputSchema>;

export async function setAllExercisesVisibility({ isVisible }: SetAllExercisesVisibilityInput): Promise<{ successCount: number }> {
  const collectionRef = adminDb.collection("ejercicios_futsal");
  const BATCH_SIZE = 400;
  let successCount = 0;
  let lastVisible: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;

  while (true) {
    let query = collectionRef.orderBy('__name__').limit(BATCH_SIZE);
    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isVisible });
    });
    
    await batch.commit();
    successCount += snapshot.size;
    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < BATCH_SIZE) {
      break; // Last batch
    }
  }

  return { successCount };
}

// --- Delete Exercises Without Custom Images ---
export async function deleteExercisesWithoutImages(): Promise<{ deletedCount: number }> {
  const collectionRef = adminDb.collection("ejercicios_futsal");
  const BATCH_SIZE = 400;
  let deletedCount = 0;
  let lastVisible: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData> | null = null;

  while (true) {
    let query = collectionRef.orderBy('__name__').limit(BATCH_SIZE);
    if (lastVisible) {
      query = query.startAfter(lastVisible);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    let docsInBatchToDelete = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const imagen = data.imagen;
      // Check for null, undefined, empty string, or placeholder URL
      if (!imagen || imagen.includes('placehold.co')) {
        batch.delete(doc.ref);
        docsInBatchToDelete++;
      }
    });

    if (docsInBatchToDelete > 0) {
      await batch.commit();
      deletedCount += docsInBatchToDelete;
    }
    
    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    if (snapshot.size < BATCH_SIZE) {
      break; // Last batch
    }
  }

  return { deletedCount };
}
