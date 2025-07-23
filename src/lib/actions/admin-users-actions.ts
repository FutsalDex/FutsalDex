
'use server';

import { z } from 'zod';
import { getAdminDb } from '../firebase-admin';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { Timestamp, collection, doc, setDoc } from 'firebase/firestore';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function createUserAsAdmin(formData: FormData) {
  try {
    const validatedData = CreateUserSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const db = getAdminDb();
    const auth = getAdminAuth();

    const userRecord = await auth.createUser({
      email: validatedData.email,
      password: validatedData.password,
    });

    const userDocRef = doc(db, "usuarios", userRecord.uid);
    await setDoc(userDocRef, {
        uid: userRecord.uid,
        email: userRecord.email,
        createdAt: Timestamp.now(),
        role: 'user',
        subscriptionStatus: 'inactive',
        subscriptionEnd: null,
        trialEndsAt: null,
    });

    return { success: true, message: `Usuario ${userRecord.email} creado.` };

  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
        return { success: false, error: 'El correo electrónico ya está en uso.' };
    }
    if (error instanceof z.ZodError) {
        return { success: false, error: 'Datos inválidos. ' + error.errors.map(e => e.message).join(' ') };
    }
     if (error.message?.includes('ADMIN_SDK_NOT_CONFIGURED')) {
      return { success: false, error: 'Esta función solo está disponible en un entorno con credenciales de administrador.' };
    }
    console.error("Error creating user as admin:", error);
    return { success: false, error: 'No se pudo crear el usuario. ' + error.message };
  }
}
