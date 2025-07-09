// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, getApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import 'dotenv/config';

let adminDbInstance: Firestore | null = null;

function parseServiceAccount(): ServiceAccount {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson || serviceAccountJson.includes('<PASTE_YOUR_FULL_SERVICE_ACCOUNT_JSON_HERE>')) {
        throw new Error(
            'La variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON no está configurada. ' +
            'Por favor, ve a la Consola de Firebase > Configuración del proyecto > Cuentas de servicio, genera una nueva clave privada, ' +
            'y pega el contenido COMPLETO del archivo JSON en la variable FIREBASE_SERVICE_ACCOUNT_JSON de tu archivo .env.'
        );
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            throw new Error("El JSON de la cuenta de servicio no es válido. Faltan campos requeridos (project_id, private_key, client_email).");
        }
        
        // **LA SOLUCIÓN CLAVE**: Las variables de entorno convierten los saltos de línea (\n)
        // en texto literal (\\n). Firebase necesita saltos de línea reales para analizar la clave.
        // Reemplazamos explícitamente '\\n' por '\n' para corregir el formato.
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

        return serviceAccount as ServiceAccount;
    } catch (e: any) {
        console.error("Error al analizar FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
        throw new Error(
            'No se pudo analizar la variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON. ' +
            'Asegúrate de que es un JSON válido y de que has copiado el contenido completo del archivo descargado.'
        );
    }
}


export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  const serviceAccount = parseServiceAccount();

  let app: App;
  if (getApps().length === 0) {
    try {
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Error de inicialización del SDK de Firebase Admin:", error.message);
      throw new Error(`No se pudo inicializar el SDK de Firebase Admin. Error original: ${error.message}`);
    }
  } else {
    app = getApp();
  }

  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}
