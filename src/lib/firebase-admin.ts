// src/lib/firebase-admin.ts
import { initializeApp, getApps, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import 'dotenv/config';

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson || serviceAccountJson.includes('<PASTE_YOUR_FULL_SERVICE_ACCOUNT_JSON_HERE>')) {
      throw new Error(
        'La variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON no está configurada o es inválida. ' +
        'Por favor, copia el contenido completo del archivo JSON de tu cuenta de servicio en esta variable dentro del archivo .env.'
      );
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

      if (!serviceAccount.private_key) {
        throw new Error("El JSON de la cuenta de servicio no contiene una 'private_key'. Revisa el contenido en tu archivo .env.");
      }
      
      // **LA SOLUCIÓN CLAVE**: Las variables de entorno convierten los saltos de línea (\n)
      // en texto literal (\\n). Firebase necesita saltos de línea reales para analizar la clave.
      // Reemplazamos explícitamente '\\n' por '\n' para corregir el formato.
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert(serviceAccount),
      });

    } catch (error: any) {
      console.error("Error de inicialización del SDK de Firebase Admin:", error.message);
      // Lanza el error para que sea visible durante el desarrollo.
      throw new Error(`No se pudo inicializar el SDK de Firebase Admin. Error original: ${error.message}`);
    }
  }

  // Obtiene la instancia de Firestore de la app inicializada (ya sea nueva o existente)
  adminDbInstance = getFirestore(getApp());
  return adminDbInstance;
}
