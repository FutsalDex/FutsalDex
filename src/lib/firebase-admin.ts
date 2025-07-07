
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import 'dotenv/config'; // Ensure environment variables are loaded

let app: App;

// Check if the app is already initialized to prevent errors
if (getApps().length === 0) {
  // By not passing any credentials, the SDK will try to discover them automatically.
  // This is the recommended approach for server environments like Firebase Functions or App Hosting.
  app = initializeApp();
} else {
  // If it's already initialized, get the existing app.
  app = getApps()[0];
}

const adminDb: Firestore = getFirestore(app);

export { adminDb };
