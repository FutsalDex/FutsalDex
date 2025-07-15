import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// --- LAZY INITIALIZATION ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Your web app's Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyA0t0B9CtSbTqi8tfqIftQLbnsj56QWnlw",
  authDomain: "futsaldex-aa3d5.firebaseapp.com",
  projectId: "futsaldex-aa3d5",
  storageBucket: "futsaldex-aa3d5.appspot.com",
  messagingSenderId: "1087849617663",
  appId: "1:1087849617663:web:014fa546af1700535d94ca",
  measurementId: "G-7ZL97TKSSK"
};


// This function ensures Firebase is initialized only once.
function getFirebaseInstances() {
  if (!app) {
    // This is the crucial check. If the config is not valid, we shouldn't initialize.
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === '__FIREBASE_API_KEY__') {
        console.error("Firebase config is missing API Key. This is expected during local dev if not replaced.");
        // Create a dummy app to avoid crashing the build process, but functionality will be limited.
        return { auth: {} as Auth, db: {} as Firestore };
    }
      
    if (getApps().length === 0) {
      // Initialize Firebase with the hardcoded config
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
