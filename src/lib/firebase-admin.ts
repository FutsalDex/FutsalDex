
// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.warn(
          'Las credenciales del SDK de Firebase Admin no están completamente configuradas. ' +
          'Esto puede ser normal durante el build del cliente, pero es un error si ocurre en el servidor en tiempo de ejecución. ' +
          'Asegúrate de que las variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY están definidas en el entorno de App Hosting.'
      );
      // Return a mock object to prevent build from crashing
      return {} as Firestore; 
  }

  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Error de inicialización del SDK de Firebase Admin:", error.message);
      throw new Error(`No se pudo inicializar el SDK de Firebase Admin. Verifica que las credenciales son correctas. Error original: ${error.message}`);
    }
  }

  adminDbInstance = getFirestore(getApp());
  return adminDbInstance;
}
