import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file should only be imported on the server-side.
// We are using initializeApp() with no credentials, which works in managed environments
// like Cloud Functions or App Hosting. It uses Application Default Credentials.
// For local development, you must set up ADC by running `gcloud auth application-default login`.

const app = getApps().length > 0 ? getApp() : initializeApp();
const adminDb = getFirestore(app);

export { adminDb };
