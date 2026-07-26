import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isTokenExpired } from '@/lib/jwt';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string;
  stellarPublicKey?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /**
   * `false` until the persisted session has been read back from storage.
   * Guards let consumers avoid redirecting a signed-in user on first paint.
   */
  hasHydrated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth',
      // only persist token + user, not actions or the hydration flag
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => (state) => {
        // Drop a session whose token has already expired rather than letting
        // the app render as signed in until the first 401 comes back.
        if (state?.token && isTokenExpired(state.token)) {
          state.logout();
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
