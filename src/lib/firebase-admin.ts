import * as admin from 'firebase-admin';

// IMPORTANT: This file should only be imported on the server-side.
// We are using initializeApp() with no credentials, which works in managed environments
// like Cloud Functions or App Hosting. It uses Application Default Credentials.
// For local development, you must set up ADC by running `gcloud auth application-default login`.

// This pattern ensures that we initialize the app only once.
if (!admin.apps.length) {
  admin.initializeApp();
}

const adminDb = admin.firestore();

export { adminDb };
