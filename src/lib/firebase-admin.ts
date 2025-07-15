
// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDbInstance: Firestore | null = null;

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
      console.warn(
          'Las credenciales del SDK de Firebase Admin no están configuradas para el entorno de servidor. ' +
          'Las funciones de administrador (como guardado de datos) no funcionarán en el entorno local. ' +
          'Esto es normal si no se han configurado secretos para desarrollo local. En producción, esto es un error.'
      );
      // Devolvemos un objeto que lanzará un error claro si se intenta usar
      return new Proxy({}, {
          get(target, prop) {
              throw new Error(`Se intentó acceder a '${String(prop)}' en una instancia no inicializada de Firebase Admin DB. Asegúrate de que las credenciales del servidor estén configuradas en tu entorno local si necesitas usar funciones de administrador.`);
          }
      }) as Firestore;
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
