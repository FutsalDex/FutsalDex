
import { initializeApp, getApps, App, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// A singleton instance to ensure we don't re-initialize unnecessarily.
let adminDbInstance: Firestore | null = null;

/**
 * Provides a lazily-initialized singleton instance of the Firebase Admin Firestore.
 * This helps prevent initialization conflicts in server environments by ensuring
 * the SDK is only initialized when first needed.
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
