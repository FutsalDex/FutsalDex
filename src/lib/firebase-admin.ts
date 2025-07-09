// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  if (getApps().length === 0) {
    // Construct the service account object from individual environment variables.
    // This is more robust than parsing a large JSON string from an env var.
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key must have newlines correctly formatted.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Verify that all required environment variables are present.
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error(
            'Las credenciales del SDK de Firebase Admin no están configuradas correctamente en las variables de entorno. ' +
            'Por favor, revisa las variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en tu archivo .env.'
        );
    }
    
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Error de inicialización del SDK de Firebase Admin:", error.message);
      // Re-throw a more user-friendly error.
      throw new Error(`No se pudo inicializar el SDK de Firebase Admin. Error original: ${error.message}`);
    }
  }

  adminDbInstance = getFirestore(getApp());
  return adminDbInstance;
}
