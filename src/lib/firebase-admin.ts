
// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDbInstance: Firestore | null = null;
let hasLoggedWarning = false; // Flag to log warning only once

function isServiceAccountConfigured(sa: ServiceAccount): boolean {
    return !!sa.projectId && !sa.projectId.startsWith('__') &&
           !!sa.clientEmail && !sa.clientEmail.startsWith('__') &&
           !!sa.privateKey && !sa.privateKey.startsWith('__');
}

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || '__FIREBASE_PROJECT_ID__',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '__FIREBASE_CLIENT_EMAIL__',
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '__FIREBASE_PRIVATE_KEY__').replace(/\\n/g, '\n'),
  };
  
  if (!isServiceAccountConfigured(serviceAccount)) {
      if (!hasLoggedWarning) {
        console.warn(
            'ADVERTENCIA: Las credenciales del SDK de Firebase Admin no están configuradas. ' +
            'Las funciones que requieren acceso de administrador fallarán. ' +
            'Esto es esperado en desarrollo local si no se han definido los secretos del servidor.'
        );
        hasLoggedWarning = true;
      }
      // Throw a specific error that can be caught by server actions
      throw new Error("ADMIN_SDK_NOT_CONFIGURED: Las credenciales del SDK de Firebase Admin no están disponibles en este entorno.");
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
