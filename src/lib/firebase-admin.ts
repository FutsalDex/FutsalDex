
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// This is a common pattern to cache the instances in a serverless environment like Next.js
// to prevent re-initialization on every server-side render in development.

// Augment the NodeJS Global type with our custom cache property
declare global {
  // eslint-disable-next-line no-var
  var __firebaseAdminInstances: { app: App | null; db: Firestore | null; } | undefined;
}

function getFirebaseAdmin() {
  // If the cache doesn't exist, create it.
  if (typeof global.__firebaseAdminInstances === 'undefined') {
    global.__firebaseAdminInstances = {
      app: null,
      db: null,
    };
  }

  // If the app is not initialized, initialize it.
  if (!global.__firebaseAdminInstances.app) {
    if (getApps().length === 0) {
      // No apps initialized, create a new one.
      // Pass the projectId explicitly to help the SDK find the correct credentials.
      // Next.js makes NEXT_PUBLIC_ variables available on the server.
      global.__firebaseAdminInstances.app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Use the already-initialized app.
      global.__firebaseAdminInstances.app = getApps()[0];
    }
  }
  
  // If the database instance is not cached, create and cache it.
  if (!global.__firebaseAdminInstances.db) {
    global.__firebaseAdminInstances.db = getFirestore(global.__firebaseAdminInstances.app);
  }

  return {
    app: global.__firebaseAdminInstances.app,
    db: global.__firebaseAdminInstances.db,
  };
}

const { db: adminDb } = getFirebaseAdmin();

export { adminDb };
