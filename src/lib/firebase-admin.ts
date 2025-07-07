import { config } from 'dotenv';
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: This file should only be imported on the server-side.
// We are using initializeApp() with no credentials, which works in managed environments
// like Cloud Functions or App Hosting. It uses Application Default Credentials.

// Load environment variables from .env file
config({ path: '.env' });

let app: App;

if (getApps().length === 0) {
  // If no app is initialized, create a new one.
  // Firebase Admin SDK will automatically find the credentials in the environment.
  app = initializeApp();
} else {
  // If an app is already initialized, use the existing one.
  app = getApp();
}

const adminDb = getFirestore(app);

export { adminDb };
