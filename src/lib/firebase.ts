import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// --- LAZY INITIALIZATION ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// This function ensures Firebase is initialized only once.
function getFirebaseInstances() {
  if (!app) {
    const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    if (!firebaseConfig.apiKey) {
      console.error("Firebase config is missing or invalid. Make sure NEXT_PUBLIC_FIREBASE_* variables are set in your .env file for local development.");
      // Return mock objects to prevent crashing, but functionality will be limited.
      return { auth: {} as Auth, db: {} as Firestore };
    }

    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

// Export functions that provide the initialized instances
export function getFirebaseAuth() {
  return getFirebaseInstances().auth as Auth;
}

export function getFirebaseDb() {
  return getFirebaseInstances().db as Firestore;
}
