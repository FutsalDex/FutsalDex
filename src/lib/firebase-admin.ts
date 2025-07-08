// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, getApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import 'dotenv/config';

let adminDbInstance: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKeyRaw || !clientEmail) {
    console.error("Firebase Admin SDK environment variables are not fully set.");
    throw new Error("Firebase Admin SDK credentials are missing. Ensure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are defined.");
  }
  
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  let app: App;
  if (getApps().length === 0) {
    try {
      app = initializeApp({
        credential: cert({
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
        }),
      });
    } catch (error: any) {
      console.error("Failed to parse private key or initialize Firebase Admin SDK:", error.message);
      throw new Error(`Failed to parse private key. Check your FIREBASE_PRIVATE_KEY environment variable. Original error: ${error.message}`);
    }
  } else {
    app = getApp();
  }

  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}
