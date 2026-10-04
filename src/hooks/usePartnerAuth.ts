import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';

// Shared partner auth-state listener — used once in App.tsx so the footer
// entry point and the partner modals all agree on login state without each
// registering their own onAuthStateChanged listener.
export function usePartnerAuth(): User | null | undefined {
  // undefined = still resolving initial auth state, null = signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return user;
}
