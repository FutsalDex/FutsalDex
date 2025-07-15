
"use client";
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getFirebaseAuth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import type { z } from 'zod';
import type { loginSchema, registerSchema } from '@/lib/schemas';

const ADMIN_EMAIL = 'futsaldex@gmail.com'; // Email del superusuario

const mapAuthError = (error: AuthError): string => {
    switch (error.code) {
        case 'auth/invalid-api-key':
            return 'La clave de API (apiKey) de Firebase no es válida. Por favor, asegúrate de que las variables de entorno en tu archivo .env (específicamente NEXT_PUBLIC_FIREBASE_API_KEY) son correctas y que has reiniciado el servidor de desarrollo.';
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
            return 'Las credenciales son incorrectas. Por favor, revisa tu email y contraseña.';
        case 'auth/email-already-in-use':
            return 'Este correo electrónico ya está registrado. Por favor, inicia sesión o usa un email diferente.';
        default:
            return error.message || 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
    }
};

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  isRegisteredUser: boolean;
  isAdmin: boolean;
  isSubscribed: boolean;
  login: (values: z.infer<typeof loginSchema>) => Promise<FirebaseUser | null>;
  register: (values: z.infer<typeof registerSchema>) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        try {
            const docSnap = await getDoc(userDocRef);

            const isAdminByEmail = currentUser.email === ADMIN_EMAIL;
            const isAdminByRole = docSnap.exists() && docSnap.data().role === 'admin';
            const finalIsAdmin = isAdminByEmail || isAdminByRole;
            
            setIsAdmin(finalIsAdmin);

            // --- Subscription & Trial Logic ---
            let finalIsSubscribed = false;

            if (currentUser.email === 'dimateo73@gmail.com') {
                finalIsSubscribed = true;
            } else if (docSnap.exists()) {
                const userData = docSnap.data();
                // Case 1: User has a real, active subscription.
                if (userData.subscriptionStatus === 'active') {
                    finalIsSubscribed = true;
                } 
                // Case 2: User is not subscribed, but might be on trial.
                else if (userData.trialEndsAt instanceof Timestamp) {
                    // Check if the trial period is still valid.
                    if (new Date() < userData.trialEndsAt.toDate()) {
                        finalIsSubscribed = true; // Trial is active
                    }
                }
            }
            setIsSubscribed(finalIsSubscribed);
        } catch (dbError) {
            console.error("Error fetching user document from Firestore:", dbError);
            setIsAdmin(false);
            setIsSubscribed(false);
        }

      } else {
        // No user logged in, reset all flags
        setIsAdmin(false);
        setIsSubscribed(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    const auth = getFirebaseAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will handle setting admin/subscription state
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(mapAuthError(authError));
      return null;
    }
  };

  const register = async (values: z.infer<typeof registerSchema>) => {
    setError(null);
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      if (newUser) {
        const userRole = newUser.email === ADMIN_EMAIL ? 'admin' : 'user';
        const userDocRef = doc(db, "usuarios", newUser.uid);

        // Calculate trial end date: 48 hours from now
        const trialEnds = new Date();
        trialEnds.setHours(trialEnds.getHours() + 48);

        await setDoc(userDocRef, {
            uid: newUser.uid,
            email: newUser.email,
            createdAt: serverTimestamp(),
            role: userRole,
            subscriptionStatus: 'inactive', // New users are not subscribed by default
            trialEndsAt: Timestamp.fromDate(trialEnds),
        });
        
        // onAuthStateChanged will handle setting admin/subscription state
        return newUser;
      }
      return null;

    } catch (e) {
      const authError = e as AuthError;
      setError(mapAuthError(authError));
      return null;
    }
  };

  const signOut = async () => {
    setError(null);
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle resetting states to false
    } catch (e) {
      const authError = e as AuthError;
      setError(mapAuthError(authError));
    }
  };

  const clearError = () => {
    setError(null);
  };

  const isRegisteredUser = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isRegisteredUser, isAdmin, isSubscribed, login, register, signOut, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
