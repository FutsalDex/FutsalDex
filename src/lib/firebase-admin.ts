import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables from .env file, which is useful for local development
config();


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
  // Let the SDK automatically discover the credentials from the environment.
  // This works for ADC locally and for the service account in a managed environment.
  adminApp = initializeApp({}, ADMIN_APP_NAME);
}

const adminDb = getFirestore(adminApp);

export { adminDb };
