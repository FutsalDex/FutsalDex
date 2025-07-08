
import { initializeApp, getApps, App, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

// This checks if the app is already initialized to prevent re-initialization errors.
// When running in a Google Cloud environment like App Hosting, initializeApp()
// without arguments automatically uses the project's service account credentials.
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApp();
}

export const adminDb = getFirestore(app);
