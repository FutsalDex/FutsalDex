
"use client";
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { z } from 'zod';
import type { loginSchema, registerSchema } from '@/lib/schemas';

const ADMIN_EMAIL = 'futsaldex@gmail.com'; // Email del superusuario

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, "usuarios", currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        // An admin is determined by having the ADMIN_EMAIL or by having the 'admin' role in the database.
        // This makes the check more robust.
        const isAdminByEmail = currentUser.email === ADMIN_EMAIL;
        const isAdminByRole = docSnap.exists() && docSnap.data().role === 'admin';
        const finalIsAdmin = isAdminByEmail || isAdminByRole;
        
        setIsAdmin(finalIsAdmin);

        // Subscription status is based purely on the database field.
        // The admin gets access to protected routes via the `isAdmin` flag, not by being "subscribed".
        if (docSnap.exists()) {
          setIsSubscribed(docSnap.data().subscriptionStatus === 'active');
        } else {
          setIsSubscribed(false);
        }
      } else {
        // No user logged in
        setIsAdmin(false);
        setIsSubscribed(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // onAuthStateChanged will handle setting admin/subscription state
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      return null;
    }
  };

  const register = async (values: z.infer<typeof registerSchema>) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      if (newUser) {
        const userRole = newUser.email === ADMIN_EMAIL ? 'admin' : 'user';
        const userDocRef = doc(db, "usuarios", newUser.uid);
        await setDoc(userDocRef, {
            uid: newUser.uid,
            email: newUser.email,
            createdAt: serverTimestamp(),
            role: userRole,
            subscriptionStatus: 'inactive', // New users are not subscribed by default
        });
        // onAuthStateChanged will handle setting admin/subscription state
        return newUser;
      }
      return null;

    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      return null;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle resetting states to false
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
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
