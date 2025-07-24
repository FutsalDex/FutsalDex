import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration is now loaded from environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// --- LAZY INITIALIZATION ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;


function initializeFirebase() {
  if (!app) {
    if (getApps().length === 0) {
      if (!firebaseConfig.apiKey) {
        console.error("Firebase API Key is missing. Check your .env file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set.");
        return;
      }
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
  }
}

// Export functions that provide the initialized instances
export function getFirebaseAuth(): Auth {
  initializeFirebase();
  if (!auth) {
    throw new Error("Firebase Authentication could not be initialized. Please check your configuration.");
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  initializeFirebase();
  if (!app) {
      throw new Error("Firebase App could not be initialized. Please check your configuration.");
  }
  // Always get a new instance of Firestore from the initialized app.
  return getFirestore(app);
}
