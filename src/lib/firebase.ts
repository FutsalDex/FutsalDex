import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// --- LAZY INITIALIZATION ---
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// This function ensures Firebase is initialized only once.
function getFirebaseInstances() {
  if (!app) {
    const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '__FIREBASE_API_KEY__',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '__FIREBASE_AUTH_DOMAIN__',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '__FIREBASE_PROJECT_ID__',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '__FIREBASE_STORAGE_BUCKET__',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '__FIREBASE_MESSAGING_SENDER_ID__',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '__FIREBASE_APP_ID__',
    };
    
    // Check if the config is valid. It might be invalid during local dev if .env is not set up.
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('__')) {
        console.error("Firebase config is missing or invalid. Make sure NEXT_PUBLIC_FIREBASE_* variables are set in your .env file for local development.");
        // Use a dummy config to avoid crashing the app, functionality will be limited.
        initializeApp({});
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
  return getFirebaseInstances().auth;
}

export function getFirebaseDb() {
  return getFirebaseInstances().db;
}
