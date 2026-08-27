import { useAuthStore } from '@/store/auth.store';

/**
 * The single entry point for auth state.
 *
 * Backed by the persisted `useAuthStore`; components should never read the
 * store directly so that the shape stays easy to change and to mock in tests.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);

  return {
    user,
    token,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    /** `true` while the persisted session is still being read back. */
    isLoading: !hasHydrated,
    login,
    logout,
    setUser,
  };
}
