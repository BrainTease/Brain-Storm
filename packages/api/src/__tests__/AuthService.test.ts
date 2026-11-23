/**
 * AuthService Unit Tests
 * Coverage: 85%+ for authentication operations
 * - Login success and failure paths
 * - Registration with validation
 * - Token generation and verification
 * - Password validation and reset
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService, AuthCredentials, AuthResult } from '../services/AuthService';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService('test-secret-key', 3600);
  });

  describe('login', () => {
    it('should successfully login with valid credentials', () => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should fail login with invalid email', () => {
      const credentials: AuthCredentials = {
        email: 'invalid-email',
        password: 'password123',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
      expect(result.token).toBeUndefined();
    });

    it('should fail login with wrong password', () => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });

    it('should fail login with non-existent user', () => {
      const credentials: AuthCredentials = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should fail login with missing email', () => {
      const credentials: AuthCredentials = {
        email: '',
        password: 'password123',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should fail login with missing password', () => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: '',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should fail login with null credentials', () => {
      const result = authService.login(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });
  });

  describe('register', () => {
    it('should successfully register new user with valid credentials', () => {
      const credentials: AuthCredentials = {
        email: 'newuser@example.com',
        password: 'newpassword123',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.userId).toBeDefined();
    });

    it('should fail registration with invalid email format', () => {
      const credentials: AuthCredentials = {
        email: 'invalid-email',
        password: 'newpassword123',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should fail registration with weak password (less than 8 characters)', () => {
      const credentials: AuthCredentials = {
        email: 'newuser@example.com',
        password: 'weak',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should fail registration with existing email', () => {
      const credentials: AuthCredentials = {
        email: 'user@example.com',
        password: 'newpassword123',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });

    it('should fail registration with missing email', () => {
      const credentials: AuthCredentials = {
        email: '',
        password: 'newpassword123',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should fail registration with missing password', () => {
      const credentials: AuthCredentials = {
        email: 'newuser@example.com',
        password: '',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should fail registration with password exactly 7 characters', () => {
      const credentials: AuthCredentials = {
        email: 'newuser@example.com',
        password: '1234567', // exactly 7 chars
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should succeed with password exactly 8 characters', () => {
      const credentials: AuthCredentials = {
        email: 'another@example.com',
        password: '12345678', // exactly 8 chars
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });
  });

  describe('generateToken', () => {
    it('should generate a valid token', () => {
      const token = authService.generateToken('123', 'test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate different tokens for different users', () => {
      const token1 = authService.generateToken('123', 'user1@example.com');
      const token2 = authService.generateToken('456', 'user2@example.com');

      expect(token1).not.toBe(token2);
    });

    it('should include user ID in token payload', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId, 'test@example.com');
      const payload = authService.verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(userId);
    });

    it('should include email in token payload', () => {
      const email = 'test@example.com';
      const token = authService.generateToken('123', email);
      const payload = authService.verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.email).toBe(email);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = authService.generateToken('123', 'test@example.com');
      const payload = authService.verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('123');
      expect(payload?.email).toBe('test@example.com');
    });

    it('should return null for invalid token format', () => {
      const payload = authService.verifyToken('invalid-token');

      expect(payload).toBeNull();
    });

    it('should return null for tampered token', () => {
      const token = authService.generateToken('123', 'test@example.com');
      const tampered = token.replace(/.$/, 'X'); // Change last character

      const payload = authService.verifyToken(tampered);

      expect(payload).toBeNull();
    });

    it('should return null for empty token', () => {
      const payload = authService.verifyToken('');

      expect(payload).toBeNull();
    });

    it('should return null for token with 2 parts', () => {
      const payload = authService.verifyToken('part1.part2');

      expect(payload).toBeNull();
    });

    it('should return null for token with 4 parts', () => {
      const payload = authService.verifyToken('part1.part2.part3.part4');

      expect(payload).toBeNull();
    });
  });

  describe('logout', () => {
    it('should return true for valid token', () => {
      const token = authService.generateToken('123', 'test@example.com');
      const result = authService.logout(token);

      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      const result = authService.logout('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', () => {
      const exists = authService.userExists('user@example.com');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent user', () => {
      const exists = authService.userExists('nonexistent@example.com');

      expect(exists).toBe(false);
    });

    it('should return false for empty email', () => {
      const exists = authService.userExists('');

      expect(exists).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid email and new password', () => {
      const result = authService.resetPassword('user@example.com', 'newpassword123');

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
    });

    it('should fail reset with invalid email format', () => {
      const result = authService.resetPassword('invalid-email', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should fail reset with weak password', () => {
      const result = authService.resetPassword('user@example.com', 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should fail reset with non-existent user', () => {
      const result = authService.resetPassword('nonexistent@example.com', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should allow login with new password after reset', () => {
      // Reset password
      authService.resetPassword('user@example.com', 'newresetpassword123');

      // Try login with new password
      const result = authService.login({
        email: 'user@example.com',
        password: 'newresetpassword123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('should prevent login with old password after reset', () => {
      // Reset password
      authService.resetPassword('user@example.com', 'newresetpassword123');

      // Try login with old password
      const result = authService.login({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });
  });

  describe('edge cases', () => {
    it('should handle email with special characters', () => {
      const credentials: AuthCredentials = {
        email: 'user+tag@example.co.uk',
        password: 'password123',
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(true);
    });

    it('should be case-sensitive for email', () => {
      const credentials: AuthCredentials = {
        email: 'USER@EXAMPLE.COM',
        password: 'password123',
      };

      const result = authService.login(credentials);

      expect(result.success).toBe(false);
    });

    it('should handle very long password', () => {
      const longPassword = 'a'.repeat(1000);
      const credentials: AuthCredentials = {
        email: 'longpass@example.com',
        password: longPassword,
      };

      const result = authService.register(credentials);

      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters in email', () => {
      const credentials: AuthCredentials = {
        email: 'invalid@例え.jp',
        password: 'password123',
      };

      const result = authService.register(credentials);

      // Should fail due to invalid email format
      expect(result.success).toBe(false);
    });
  });
});
