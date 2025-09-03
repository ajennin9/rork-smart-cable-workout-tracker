import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/constants/firebase';
import { User } from '@/types/workout';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Load user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUser(userData);
        } else {
          // Create user document if it doesn't exist
          const newUser: User = {
            userId: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful for:', userCredential.user.email);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('ERROR Sign in error:', error);
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update Firebase Auth profile
      await firebaseUpdateProfile(firebaseUser, { displayName });
      
      // Create user document in Firestore
      const newUser: User = {
        userId: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName,
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('ERROR Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('ERROR Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    
    try {
      const updatedUser = { ...user, ...updates };
      
      // Update Firestore document
      await updateDoc(doc(db, 'users', user.userId), updates);
      
      // Update Firebase Auth profile if displayName changed
      if (updates.displayName && auth.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { displayName: updates.displayName });
      }
      
      setUser(updatedUser);
    } catch (error: any) {
      console.error('ERROR Update profile error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }, [user]);

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }), [user, isLoading, signIn, signUp, signOut, updateProfile]);
});