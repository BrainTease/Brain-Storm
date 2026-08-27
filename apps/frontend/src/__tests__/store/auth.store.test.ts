import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/auth.store';

const user = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  role: 'student',
};

function makeToken(expSeconds: number): string {
  return `header.${btoa(JSON.stringify({ sub: user.id, exp: expSeconds }))}.signature`;
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, hasHydrated: true });
});

describe('auth store', () => {
  it('persists only the token and user', () => {
    useAuthStore.getState().login('tok-123', user);

    const persisted = JSON.parse(localStorage.getItem('auth') ?? '{}');
    expect(persisted.state).toEqual({ token: 'tok-123', user });
    expect(persisted.state).not.toHaveProperty('hasHydrated');
  });

  it('clears user and token on logout', () => {
    useAuthStore.getState().login('tok-123', user);
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  describe('rehydration', () => {
    it('restores a session whose token is still valid', async () => {
      const token = makeToken(Math.floor(Date.now() / 1000) + 3600);
      localStorage.setItem('auth', JSON.stringify({ state: { token, user }, version: 0 }));

      await useAuthStore.persist.rehydrate();

      expect(useAuthStore.getState().token).toBe(token);
      expect(useAuthStore.getState().user).toEqual(user);
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    it('drops a session whose token has already expired', async () => {
      const token = makeToken(Math.floor(Date.now() / 1000) - 60);
      localStorage.setItem('auth', JSON.stringify({ state: { token, user }, version: 0 }));

      await useAuthStore.persist.rehydrate();

      expect(useAuthStore.getState().token).toBeNull();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });

    it('marks hydration complete when there is nothing stored', async () => {
      useAuthStore.setState({ hasHydrated: false });

      await useAuthStore.persist.rehydrate();

      expect(useAuthStore.getState().hasHydrated).toBe(true);
    });
  });
});
