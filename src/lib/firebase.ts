import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Directly use App Hosting's replacement mechanism.
// These placeholders will be replaced with your actual Firebase project keys during deployment.
const firebaseConfig: FirebaseOptions = {
  apiKey: '__FIREBASE_API_KEY__',
  authDomain: '__FIREBASE_AUTH_DOMAIN__',
  projectId: '__FIREBASE_PROJECT_ID__',
  storageBucket: '__FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__FIREBASE_APP_ID__',
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
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === '__FIREBASE_API_KEY__') {
          console.error("Firebase config is missing API Key. This is expected during local dev if not replaced.");
          // Create a dummy app to avoid crashing the build process, but functionality will be limited.
          return { auth: {} as Auth, db: {} as Firestore };
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
