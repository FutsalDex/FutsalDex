import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
// This check prevents re-initializing the app on every hot-reload
if (getApps().length === 0) {
    if (!firebaseConfig.apiKey) {
        // This is a guard against running client-side code on the server during build
        // without the necessary env vars. In a browser environment, these should always be present.
        console.error("Firebase config is missing API Key. This is expected during server-side builds without client env vars.");
        // Create a dummy app to avoid crashing the build process.
        app = initializeApp({});
    } else {
        app = initializeApp(firebaseConfig);
    }
} else {
    app = getApp();
}


const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
