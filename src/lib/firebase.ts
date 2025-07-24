import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

// --- LAZY INITIALIZATION ---
let app: FirebaseApp | null = null;
let auth: Auth | null = null;


function initializeFirebase() {
  if (!app) {
    if (getApps().length === 0) {
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
  return auth!;
}

export function getFirebaseDb(): Firestore {
  initializeFirebase();
  // Always get a new instance of Firestore from the initialized app.
  return getFirestore(app!);
}
