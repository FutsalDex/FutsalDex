// src/lib/firebase-admin.ts
import { initializeApp, getApps, App, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// A "cached" instance of the Firestore DB.
// This is a server-side module, so this variable will be preserved
// across function invocations in the same container.
let adminDbInstance: Firestore | null = null;

/**
 * Returns a cached, lazily-initialized instance of the Admin Firestore DB.
 * This prevents multiple initializations and credential conflicts.
 * @returns {Firestore} The Firestore instance.
 */
export function getAdminDb(): Firestore {
  if (adminDbInstance) {
    return adminDbInstance;
  }

  let app: App;
  if (getApps().length === 0) {
    // If no apps are initialized, initialize a new one.
    app = initializeApp();
  } else {
    // Otherwise, get the default app.
    app = getApp();
  }

  adminDbInstance = getFirestore(app);
  return adminDbInstance;
}
