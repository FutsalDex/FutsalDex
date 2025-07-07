import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
// This checks if the app is already initialized to prevent re-initialization errors.
// When running in a Google Cloud environment like App Hosting, initializeApp()
// without arguments automatically uses the project's service account credentials.
if (!getApps().length) {
  initializeApp();
}

export const adminDb = getFirestore();
