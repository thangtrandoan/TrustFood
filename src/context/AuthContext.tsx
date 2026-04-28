import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import auth from '@react-native-firebase/auth';
import {
  getCurrentUserProfile,
  signInWithEmail,
  signInWithGoogle,
  signOutFirebase,
} from '../services/firebase';
import type { AppUserProfile } from '../services/firebase';

type AuthStatus = 'loading' | 'guest' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AppUserProfile | null;
  login: (input: { identifier: string; password: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AppUserProfile | null>(null);

  const forceGuest = useCallback(() => {
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        forceGuest();
        return;
      }

      try {
        const me = await getCurrentUserProfile();
        if (!me) {
          await signOutFirebase().catch(() => undefined);
          forceGuest();
          return;
        }
        setUser(me);
        setStatus('authenticated');
      } catch {
        forceGuest();
      }
    });

    return unsubscribe;
  }, [forceGuest]);

  const login = useCallback(async (input: { identifier: string; password: string }) => {
    await signInWithEmail(input.identifier.trim(), input.password);
    const me = await getCurrentUserProfile();
    if (!me) {
      await signOutFirebase().catch(() => undefined);
      throw new Error('Tai khoan chua hoan tat ho so');
    }
    setUser(me);
    setStatus('authenticated');
  }, []);

  const loginWithGoogle = useCallback(async () => {
    await signInWithGoogle();
    const me = await getCurrentUserProfile();
    if (!me) {
      await signOutFirebase().catch(() => undefined);
      throw new Error('Tai khoan chua hoan tat ho so');
    }
    setUser(me);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await signOutFirebase();
    setUser(null);
    setStatus('guest');
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      loginWithGoogle,
      logout,
    }),
    [status, user, login, loginWithGoogle, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
