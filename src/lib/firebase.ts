import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

function isConfigValid(config: FirebaseOptions): boolean {
    return !!config.apiKey && !!config.projectId;
}

// --- ROBUST INITIALIZATION ---
let firebaseApp: FirebaseApp;
let firebaseAuth: Auth;
let firestoreDb: Firestore;

if (typeof window !== 'undefined' && isConfigValid(firebaseConfig)) {
    if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig);
    } else {
        firebaseApp = getApp();
    }
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = getFirestore(firebaseApp);
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    throw new Error("Firebase Authentication could not be initialized. Please check your configuration and ensure you are on the client-side.");
  }
  return firebaseAuth;
}

export function getFirebaseDb(): Firestore {
  if (!firestoreDb) {
     throw new Error("Firestore could not be initialized. Please check your configuration and ensure you are on the client-side.");
  }
  return firestoreDb;
}
