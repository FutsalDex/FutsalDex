
"use client";
import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import type { z } from 'zod';
import type { loginSchema, registerSchema } from '@/lib/schemas';

const ADMIN_EMAIL = 'adminfutsaldex@futsaldex.com'; // Email del superusuario

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  isRegisteredUser: boolean;
  isAdmin: boolean; // Nueva propiedad para superusuario
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (values: z.infer<typeof loginSchema>) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user && userCredential.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      setIsAdmin(false);
      return null;
    }
  };

  const register = async (values: z.infer<typeof registerSchema>) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      if (userCredential.user && userCredential.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      return userCredential.user;
    } catch (e) {
      const authError = e as AuthError;
      setError(authError.message);
      setIsAdmin(false);
      return null;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setIsAdmin(false); 
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
    <AuthContext.Provider value={{ user, loading, isRegisteredUser, isAdmin, login, register, signOut, error, clearError }}>
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

