import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file should only be imported on the server-side.
// We are using initializeApp() with no credentials, which works in managed environments
// like Cloud Functions or App Hosting. It uses Application Default Credentials.
// For local development, you must set up ADC by running `gcloud auth application-default login`.

const ADMIN_APP_NAME = 'firebase-admin-app-futsaldex';
let adminApp: App;

// Check if the admin app is already initialized to avoid re-initialization
const existingAdminApp = getApps().find(app => app.name === ADMIN_APP_NAME);

if (existingAdminApp) {
  adminApp = existingAdminApp;
} else {
  // Explicitly use Application Default Credentials.
  // This helps the Admin SDK to authenticate correctly in both managed and local environments (with ADC setup).
  adminApp = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  }, ADMIN_APP_NAME);
}

const adminDb = getFirestore(adminApp);

export { adminDb };
