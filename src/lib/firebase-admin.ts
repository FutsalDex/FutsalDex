import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This checks if the app is already initialized to prevent re-initialization errors.
// When running in a Google Cloud environment like App Hosting, initializeApp()
// without arguments automatically uses the project's service account credentials.
if (!admin.apps.length) {
  admin.initializeApp();
}

export const adminDb = admin.firestore();
