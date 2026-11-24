/**
 * AuthService - Handles authentication operations
 * - User login validation
 * - JWT token generation and verification
 * - Password validation
 * - Session management
 */

import crypto from 'crypto';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  userId?: string;
  error?: string;
}

export class AuthService {
  private secretKey: string;
  private tokenExpiration: number; // in seconds
  private mockUsers: Map<string, { email: string; passwordHash: string }>;

  constructor(secretKey: string = 'secret-key', tokenExpiration: number = 3600) {
    this.secretKey = secretKey;
    this.tokenExpiration = tokenExpiration;
    this.mockUsers = new Map();
    this.initializeMockUsers();
  }

  /**
   * Initialize mock users for testing
   */
  private initializeMockUsers(): void {
    this.mockUsers.set('1', {
      email: 'user@example.com',
      passwordHash: this.hashPassword('password123'),
    });
    this.mockUsers.set('2', {
      email: 'admin@example.com',
      passwordHash: this.hashPassword('admin123'),
    });
  }

  /**
   * Hash password using SHA-256
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isStrongPassword(password: string): boolean {
    // Password must be at least 8 characters
    return password.length >= 8;
  }

  /**
   * Login user with credentials
   */
  login(credentials: AuthCredentials): AuthResult {
    // Validate input
    if (!credentials || !credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    // Validate email format
    if (!this.isValidEmail(credentials.email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Find user by email
    let userId: string | null = null;
    let user: { email: string; passwordHash: string } | null = null;

    for (const [id, userData] of this.mockUsers.entries()) {
      if (userData.email === credentials.email) {
        userId = id;
        user = userData;
        break;
      }
    }

    if (!user || !userId) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Verify password
    const passwordHash = this.hashPassword(credentials.password);
    if (passwordHash !== user.passwordHash) {
      return {
        success: false,
        error: 'Invalid password',
      };
    }

    // Generate token
    const token = this.generateToken(userId, credentials.email);

    return {
      success: true,
      token,
      userId,
    };
  }

  /**
   * Register a new user
   */
  register(credentials: AuthCredentials): AuthResult {
    // Validate input
    if (!credentials || !credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Email and password are required',
      };
    }

    // Validate email format
    if (!this.isValidEmail(credentials.email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Validate password strength
    if (!this.isStrongPassword(credentials.password)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      };
    }

    // Check if user already exists
    for (const user of this.mockUsers.values()) {
      if (user.email === credentials.email) {
        return {
          success: false,
          error: 'User already exists',
        };
      }
    }

    // Create new user
    const userId = String(this.mockUsers.size + 1);
    this.mockUsers.set(userId, {
      email: credentials.email,
      passwordHash: this.hashPassword(credentials.password),
    });

    // Generate token
    const token = this.generateToken(userId, credentials.email);

    return {
      success: true,
      token,
      userId,
    };
  }

  /**
   * Generate JWT-like token
   */
  generateToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.tokenExpiration,
    };

    // Simple token generation (not real JWT, just for demo)
    const headerBase64 = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64');

    return `${headerBase64}.${payloadBase64}.${signature}`;
  }

  /**
   * Verify token
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [headerBase64, payloadBase64, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(`${headerBase64}.${payloadBase64}`)
        .digest('base64');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload: TokenPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64').toString()
      );

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return null; // Token expired
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Logout user (invalidate token)
   */
  logout(token: string): boolean {
    const payload = this.verifyToken(token);
    return payload !== null;
  }

  /**
   * Check if user exists
   */
  userExists(email: string): boolean {
    for (const user of this.mockUsers.values()) {
      if (user.email === email) {
        return true;
      }
    }
    return false;
  }

  /**
   * Reset password
   */
  resetPassword(email: string, newPassword: string): AuthResult {
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    if (!this.isStrongPassword(newPassword)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters',
      };
    }

    // Find and update user
    for (const [userId, user] of this.mockUsers.entries()) {
      if (user.email === email) {
        user.passwordHash = this.hashPassword(newPassword);
        return {
          success: true,
          userId,
        };
      }
    }

    return {
      success: false,
      error: 'User not found',
    };
  }
}
