// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, getApp, cert } from 'firebase-admin/app'; // Asegúrate de importar 'cert'
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import 'dotenv/config'; // Asegura que las variables de entorno se carguen

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    console.log("DEBUG: Returning cached Firebase Admin DB instance.");
    return adminDbInstance;
  }

  let app: App;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  console.log("DEBUG: Initializing Firebase Admin SDK for the first time...");
  console.log("DEBUG: Current apps initialized before check:", getApps().length);
  console.log("DEBUG: FIREBASE_PROJECT_ID:", projectId ? "Loaded" : "UNDEFINED");
  console.log("DEBUG: FIREBASE_PRIVATE_KEY:", privateKey ? "Loaded (length " + privateKey.length + ")" : "UNDEFINED");
  console.log("DEBUG: FIREBASE_CLIENT_EMAIL:", clientEmail ? "Loaded" : "UNDEFINED");

  if (!projectId || !privateKey || !clientEmail) {
    console.error("ERROR: Firebase Admin SDK environment variables are not set.");
    console.error("Please ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are defined in your .env file or environment.");
    throw new Error("Firebase Admin SDK credentials are missing. Cannot initialize.");
  }

  if (getApps().length === 0) {
    try {
      app = initializeApp({
        credential: cert({
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
        }),
      });
      console.log("DEBUG: Firebase Admin SDK initialized successfully with provided credentials.");
    } catch (error) {
      console.error("DEBUG: Failed to initialize Firebase Admin SDK with provided credentials:", error);
      throw error;
    }
  } else {
    app = getApp();
    console.log("DEBUG: Firebase Admin SDK already initialized, getting existing app instance.");
  }

  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}