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
};

// --- LAZY INITIALIZATION ---

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function getFirebaseInstances() {
  if (!app) {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      // This is the crucial check. If the config is not valid, we shouldn't initialize.
      if (!firebaseConfig.apiKey) {
          throw new Error("Firebase: Missing API Key. Check your NEXT_PUBLIC_FIREBASE_API_KEY environment variable.");
      }
      app = initializeApp(firebaseConfig);
    }
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
}

// Export a function that ensures initialization before returning instances
function getFirebaseAuth() {
  return getFirebaseInstances().auth;
}

function getFirebaseDb() {
  return getFirebaseInstances().db;
}

export { getFirebaseAuth, getFirebaseDb };
