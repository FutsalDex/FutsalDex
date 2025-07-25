
"use client";
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { z } from 'zod';
import type { loginSchema, registerSchema } from '@/lib/schemas';
import { Loader2 } from 'lucide-react';

const ADMIN_EMAIL = 'futsaldex@gmail.com';

const mapAuthError = (error: AuthError): string => {
    switch (error.code) {
        case 'auth/invalid-api-key':
            return 'La clave de API (apiKey) de Firebase no es válida. Por favor, asegúrate de que las variables de entorno son correctas.';
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
            return 'Las credenciales son incorrectas. Por favor, revisa tu email y/o contraseña.';
        case 'auth/email-already-in-use':
            return 'Este correo electrónico ya está registrado. Por favor, inicia sesión o usa un email diferente.';
        case 'auth/requires-recent-login':
            return 'Esta operación es sensible y requiere una autenticación reciente. Por favor, vuelve a iniciar sesión.';
        default:
            return error.message || 'Ha ocurrido un error inesperado.';
    }
};

type SubscriptionType = 'Pro' | 'Básica' | 'Prueba' | 'inactive' | null;

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  isRegisteredUser: boolean;
  isAdmin: boolean;
  isSubscribed: boolean;
  subscriptionType: SubscriptionType;
  subscriptionEnd: Date | null;
  login: (values: z.infer<typeof loginSchema>) => Promise<FirebaseUser | null>;
  register: (values: z.infer<typeof registerSchema>) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<boolean>;
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
  const [subscriptionType, setSubscriptionType] = useState<SubscriptionType>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<Date | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        setIsAdmin(currentUser.email === ADMIN_EMAIL);
        const db = getFirebaseDb();
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const status = userData.subscriptionStatus === 'active';
                
                let subEnd: Date | null = null;
                if (userData.subscriptionEnd instanceof Timestamp) {
                    subEnd = userData.subscriptionEnd.toDate();
                }

                let trialEnd: Date | null = null;
                if (userData.trialEndsAt instanceof Timestamp) {
                    trialEnd = userData.trialEndsAt.toDate();
                }

                const isTrialActive = trialEnd ? trialEnd > new Date() : false;

                setIsSubscribed(status || isTrialActive);
                
                if (isTrialActive) {
                    setSubscriptionType('Prueba');
                    setSubscriptionEnd(trialEnd);
                } else if (status) {
                    setSubscriptionType(userData.subscriptionType || 'Básica');
                    setSubscriptionEnd(subEnd);
                } else {
                    setSubscriptionType(null);
                    setSubscriptionEnd(null);
                }
            }
        } catch (dbError) {
            console.error("Error fetching user subscription data:", dbError);
            setIsSubscribed(false);
            setSubscriptionType(null);
            setSubscriptionEnd(null);
        }
      } else {
        setIsAdmin(false);
        setIsSubscribed(false);
        setSubscriptionType(null);
        setSubscriptionEnd(null);
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
        const userDocRef = doc(db, "usuarios", newUser.uid);
        const trialEnds = new Date();
        trialEnds.setHours(trialEnds.getHours() + 48);

        await setDoc(userDocRef, {
            uid: newUser.uid,
            email: newUser.email,
            createdAt: serverTimestamp(),
            role: newUser.email === ADMIN_EMAIL ? 'admin' : 'user',
            subscriptionStatus: 'inactive',
            trialEndsAt: Timestamp.fromDate(trialEnds),
        });
        
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
    } catch (e) {
      const authError = e as AuthError;
      setError(mapAuthError(authError));
    }
  };
  
  const changePassword = async (currentPass: string, newPass: string) => {
    setError(null);
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      setError("No hay un usuario autenticado para realizar esta acción.");
      return false;
    }

    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);

    try {
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);
      return true;
    } catch (e) {
      const authError = e as AuthError;
      setError(mapAuthError(authError));
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  if (loading) {
    return (
        <div className="flex h-screen flex-col items-center justify-center">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Cargando FutsalDex...</p>
        </div>
    );
  }

  const isRegisteredUser = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isRegisteredUser, isAdmin, isSubscribed, subscriptionType, subscriptionEnd, login, register, signOut, changePassword, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
