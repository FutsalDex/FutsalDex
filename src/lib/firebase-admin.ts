import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables from .env file, which is useful for local development
config();


// IMPORTANT: This file should only be imported on the server-side.
// We are using initializeApp() with no credentials, which works in managed environments
// like Cloud Functions or App Hosting. It uses Application Default Credentials.
// For local development, you must set up ADC by running `gcloud auth application-default login`.

// Initialize the app only if it's not already initialized.
// This is the standard pattern for serverless environments to prevent re-initialization.
if (getApps().length === 0) {
  initializeApp();
}

const adminDb = getFirestore();

export { adminDb };
