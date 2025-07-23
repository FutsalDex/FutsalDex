'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';

const usersToCreate = [
    { displayName: 'Victor', email: 'test01@gmail.com', password: 'victor01' },
    { displayName: 'Isaac', email: 'test02@gmail.com', password: 'isaac02' },
    { displayName: 'Nando', email: 'test03@gmail.com', password: 'nando03' },
    { displayName: 'Juan Aranda', email: 'test04@gmail.com', password: 'juanaranda04' },
    { displayName: 'JuanFran', email: 'test05@gmail.com', password: 'juanfran05' },
    { displayName: 'Michel', email: 'test06@gmail.com', password: 'michel06' },
    { displayName: 'Juanma', email: 'test07@gmail.com', password: 'juanma07' },
    { displayName: 'Diego', email: 'test08@gmail.com', password: 'diego08' },
    { displayName: 'Dani Ruíz', email: 'test09@gmail.com', password: 'daniruiz09' },
    { displayName: 'Jamal', email: 'test10@gmail.com', password: 'jamal10' },
    { displayName: 'Alex Gil', email: 'test11@gmail.com', password: 'alexgil11' },
    { displayName: 'Iván Bautista', email: 'test12@gmail.com', password: 'ivanbautista12' },
    { displayName: 'Raúl Jiménez', email: 'test13@gmail.com', password: 'rauljimenez13' },
    { displayName: 'Juanjo Padilla', email: 'test14@gmail.com', password: 'juanjopadilla14' },
    { displayName: 'Jaume', email: 'test15@gmail.com', password: 'jaume15' }
];

interface SeedResult {
    success: boolean;
    message: string;
    details?: {
        created: number;
        updated: number;
        failed: string[];
    };
}

export async function seedPremiumUsers(): Promise<SeedResult> {
    try {
        const adminAuth = getAuth();
        const adminDb = getAdminDb();
        
        let createdCount = 0;
        let updatedCount = 0;
        const failedUsers: string[] = [];

        for (const userData of usersToCreate) {
            try {
                let userRecord;
                try {
                    // Try to get the user first to see if they exist
                    userRecord = await adminAuth.getUserByEmail(userData.email);
                    updatedCount++;
                } catch (error: any) {
                    if (error.code === 'auth/user-not-found') {
                        // If user does not exist, create them
                        userRecord = await adminAuth.createUser({
                            email: userData.email,
                            password: userData.password,
                            displayName: userData.displayName,
                        });
                        createdCount++;
                    } else {
                        // For other auth errors, re-throw to be caught by the outer catch
                        throw error;
                    }
                }

                // Once user exists or is created, set their Firestore document
                const userDocRef = adminDb.collection('usuarios').doc(userRecord.uid);
                
                // Set expiration to one year from now
                const expirationDate = new Date();
                expirationDate.setFullYear(expirationDate.getFullYear() + 1);

                await userDocRef.set({
                    uid: userRecord.uid,
                    email: userRecord.email,
                    role: 'user',
                    subscriptionStatus: 'active',
                    subscriptionType: 'Pro', // Premium subscription
                    subscriptionExpiresAt: Timestamp.fromDate(expirationDate),
                    createdAt: Timestamp.now(),
                }, { merge: true });

            } catch (error: any) {
                console.error(`Failed to process user ${userData.email}:`, error);
                failedUsers.push(`${userData.email} (${error.code || error.message})`);
            }
        }

        if (failedUsers.length > 0) {
            return {
                success: false,
                message: `Proceso completado con errores. ${createdCount} usuarios creados, ${updatedCount} actualizados.`,
                details: { created: createdCount, updated: updatedCount, failed: failedUsers }
            };
        }

        return {
            success: true,
            message: `¡Éxito! ${createdCount} usuarios creados y ${updatedCount} actualizados con suscripción Pro.`,
            details: { created: createdCount, updated: updatedCount, failed: [] }
        };

    } catch (error: any) {
        console.error("Error en la función seedPremiumUsers:", error);
        // This catch block handles errors with getting the Admin SDK instance itself.
        if (error.message.includes("instance no inicializada de Firebase Admin DB")) {
             return { success: false, message: "Error de configuración: El SDK de Firebase Admin no está configurado en el servidor. Asegúrate de que las variables de entorno del servidor estén definidas en tu entorno de hosting." };
        }
        return { success: false, message: "Un error inesperado ocurrió en el servidor." };
    }
}
