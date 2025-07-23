
'use server';

import { getFirebaseDb } from '@/lib/firebase-admin';
import { z } from 'zod';
import { getAuth } from 'firebase-admin/auth';
import type { UserSubscription } from '@/app/admin/manage-subscriptions/page';
import { Timestamp } from 'firebase-admin/firestore';


export async function getAllUsers(): Promise<{ success: boolean; users?: UserSubscription[]; error?: string; }> {
    try {
        const db = getFirebaseDb();
        const usersCollection = db.collection("usuarios");
        const querySnapshot = await usersCollection.orderBy('email', 'asc').get();

        if (querySnapshot.empty) {
            return { success: true, users: [] };
        }
        
        const usersFromDb = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            let subType: UserSubscription['subscriptionType'] = 'inactive';
            let expiresAt: number | undefined;

            if (data.subscriptionStatus === 'active') {
                subType = data.subscriptionType || 'Pro';
            }
            if (data.trialEndsAt instanceof Timestamp && data.trialEndsAt.toDate() > new Date()) {
                subType = 'Prueba';
                expiresAt = data.trialEndsAt.toMillis();
            }
            if (data.subscriptionExpiresAt instanceof Timestamp) {
                expiresAt = data.subscriptionExpiresAt.toMillis();
            }

            return {
              id: docSnap.id,
              email: data.email || '',
              role: data.role || 'user',
              subscriptionStatus: data.subscriptionStatus || 'inactive',
              subscriptionType: subType,
              subscriptionExpiresAt: expiresAt,
            };
        });

        return { success: true, users: usersFromDb as UserSubscription[] };

    } catch (error: any) {
        console.error("Error fetching all users in server action:", error.message);
        if (error.message.includes("ADMIN_SDK_NOT_CONFIGURED")) {
             return { success: false, error: 'La configuración del servidor no permite esta acción. Contacta al soporte técnico.' };
        }
        return { success: false, error: 'No se pudieron cargar los usuarios. Verifica las reglas de seguridad de Firestore y los permisos del servidor.' };
    }
}


const UpdateUserSubscriptionSchema = z.object({
    userId: z.string(),
    newStatus: z.enum(['active', 'inactive']),
});
type UpdateUserSubscriptionInput = z.infer<typeof UpdateUserSubscriptionSchema>;

export async function updateUserSubscription({ userId, newStatus }: UpdateUserSubscriptionInput): Promise<{ success: boolean; error?: string }> {
    try {
        const db = getFirebaseDb();
        const userDocRef = db.collection("usuarios").doc(userId);

        await userDocRef.update({
            subscriptionStatus: newStatus,
            updatedAt: Timestamp.now(),
        });
        
        return { success: true };

    } catch (error: any) {
        console.error("Error updating subscription in server action:", error.message);
        if (error.message.includes("ADMIN_SDK_NOT_CONFIGURED")) {
             return { success: false, error: 'La configuración del servidor no permite esta acción.' };
        }
        return { success: false, error: `No se pudo actualizar la suscripción: ${error.message}` };
    }
}

    