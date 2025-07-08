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

// Validate that all required Firebase config values are present.
// This provides a more developer-friendly error than the generic Firebase error.
for (const [key, value] of Object.entries(firebaseConfig)) {
    if (!value) {
        // This error will be thrown during server-side rendering or at runtime on the client,
        // making it clear that environment variables are missing.
        throw new Error(
            `Firebase configuration error: Missing value for "${key}". ` +
            `Please make sure all NEXT_PUBLIC_FIREBASE_* variables are set in your .env file ` +
            `and that the development server has been restarted.`
        );
    }
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
