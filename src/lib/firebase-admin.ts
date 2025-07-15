
// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  // Las variables de entorno __FIREBASE_...__ son reemplazadas automáticamente por App Hosting durante el despliegue.
  const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || '__FIREBASE_PROJECT_ID__',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '__FIREBASE_CLIENT_EMAIL__',
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '__FIREBASE_PRIVATE_KEY__').replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || serviceAccount.projectId.startsWith('__')) {
      console.warn(
          'Las credenciales del SDK de Firebase Admin no están configuradas para el entorno de servidor. ' +
          'Esto es normal durante el desarrollo local si no se han configurado los secretos, pero es un error en producción.'
      );
      // Devuelve un objeto mock para evitar que la aplicación crashee en entornos donde no se necesita (como el build del cliente).
      return {} as Firestore; 
  }

  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Error de inicialización del SDK de Firebase Admin:", error.message);
      throw new Error(`No se pudo inicializar el SDK de Firebase Admin. Error original: ${error.message}`);
    }
  }

  adminDbInstance = getFirestore(getApp());
  return adminDbInstance;
}
