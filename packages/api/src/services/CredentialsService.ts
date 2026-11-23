/**
 * CredentialsService - Handles credential operations
 * - Store and retrieve API credentials
 * - Encrypt/decrypt sensitive data
 * - Manage credential lifecycle
 * - Validate credential format
 */

export interface Credential {
  id: string;
  userId: string;
  name: string;
  type: 'api_key' | 'token' | 'oauth' | 'certificate';
  secret: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface CredentialResult {
  success: boolean;
  credential?: Credential;
  credentials?: Credential[];
  error?: string;
}

export interface EncryptionService {
  encrypt: (data: string) => string;
  decrypt: (data: string) => string;
}

export class CredentialsService {
  private credentials: Map<string, Credential>;
  private encryptionService: EncryptionService;

  constructor(encryptionService: EncryptionService) {
    this.credentials = new Map();
    this.encryptionService = encryptionService;
    this.initializeMockCredentials();
  }

  /**
   * Initialize mock credentials for testing
   */
  private initializeMockCredentials(): void {
    this.credentials.set('cred-1', {
      id: 'cred-1',
      userId: 'user-1',
      name: 'Production API Key',
      type: 'api_key',
      secret: this.encryptionService.encrypt('sk_live_123456789'),
      createdAt: new Date('2024-01-01'),
      isActive: true,
    });
  }

  /**
   * Create a new credential
   */
  createCredential(
    userId: string,
    name: string,
    type: 'api_key' | 'token' | 'oauth' | 'certificate',
    secret: string,
    expiresAt?: Date,
    metadata?: Record<string, any>
  ): CredentialResult {
    // Validate inputs
    if (!userId || !name || !type || !secret) {
      return {
        success: false,
        error: 'User ID, name, type, and secret are required',
      };
    }

    // Validate secret format
    if (typeof secret !== 'string' || secret.length < 8) {
      return {
        success: false,
        error: 'Secret must be at least 8 characters',
      };
    }

    // Validate type
    const validTypes = ['api_key', 'token', 'oauth', 'certificate'];
    if (!validTypes.includes(type)) {
      return {
        success: false,
        error: 'Invalid credential type',
      };
    }

    // Validate name
    if (name.length < 1 || name.length > 100) {
      return {
        success: false,
        error: 'Name must be between 1 and 100 characters',
      };
    }

    // Check for duplicate names per user
    for (const credential of this.credentials.values()) {
      if (credential.userId === userId && credential.name === name) {
        return {
          success: false,
          error: 'Credential with this name already exists for this user',
        };
      }
    }

    // Create credential
    const credentialId = `cred-${Date.now()}`;
    const credential: Credential = {
      id: credentialId,
      userId,
      name,
      type,
      secret: this.encryptionService.encrypt(secret),
      createdAt: new Date(),
      expiresAt,
      isActive: true,
      metadata,
    };

    this.credentials.set(credentialId, credential);

    return {
      success: true,
      credential: { ...credential, secret: '***' }, // Don't return decrypted secret
    };
  }

  /**
   * Get credential by ID
   */
  getCredential(credentialId: string, decryptSecret: boolean = false): CredentialResult {
    if (!credentialId) {
      return {
        success: false,
        error: 'Credential ID is required',
      };
    }

    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return {
        success: false,
        error: 'Credential not found',
      };
    }

    // Check if credential is expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Credential has expired',
      };
    }

    // Create a copy to return
    const result = { ...credential };
    if (!decryptSecret) {
      result.secret = '***';
    } else {
      result.secret = this.encryptionService.decrypt(credential.secret);
    }

    return {
      success: true,
      credential: result,
    };
  }

  /**
   * Get all credentials for a user
   */
  getUserCredentials(userId: string, includeInactive: boolean = false): CredentialResult {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    const userCredentials: Credential[] = [];

    for (const credential of this.credentials.values()) {
      if (credential.userId === userId) {
        if (includeInactive || credential.isActive) {
          // Don't include decrypted secrets in list responses
          const copy = { ...credential, secret: '***' };
          userCredentials.push(copy);
        }
      }
    }

    return {
      success: true,
      credentials: userCredentials,
    };
  }

  /**
   * Update credential
   */
  updateCredential(
    credentialId: string,
    name?: string,
    isActive?: boolean,
    expiresAt?: Date
  ): CredentialResult {
    if (!credentialId) {
      return {
        success: false,
        error: 'Credential ID is required',
      };
    }

    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return {
        success: false,
        error: 'Credential not found',
      };
    }

    // Update fields if provided
    if (name !== undefined) {
      if (name.length < 1 || name.length > 100) {
        return {
          success: false,
          error: 'Name must be between 1 and 100 characters',
        };
      }

      // Check for duplicate names
      for (const other of this.credentials.values()) {
        if (
          other.userId === credential.userId &&
          other.name === name &&
          other.id !== credentialId
        ) {
          return {
            success: false,
            error: 'Credential with this name already exists for this user',
          };
        }
      }

      credential.name = name;
    }

    if (isActive !== undefined) {
      credential.isActive = isActive;
    }

    if (expiresAt !== undefined) {
      credential.expiresAt = expiresAt;
    }

    this.credentials.set(credentialId, credential);

    return {
      success: true,
      credential: { ...credential, secret: '***' },
    };
  }

  /**
   * Delete credential
   */
  deleteCredential(credentialId: string): CredentialResult {
    if (!credentialId) {
      return {
        success: false,
        error: 'Credential ID is required',
      };
    }

    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return {
        success: false,
        error: 'Credential not found',
      };
    }

    this.credentials.delete(credentialId);

    return {
      success: true,
      credential: { ...credential, secret: '***' },
    };
  }

  /**
   * Revoke credential
   */
  revokeCredential(credentialId: string): CredentialResult {
    if (!credentialId) {
      return {
        success: false,
        error: 'Credential ID is required',
      };
    }

    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return {
        success: false,
        error: 'Credential not found',
      };
    }

    if (!credential.isActive) {
      return {
        success: false,
        error: 'Credential is already revoked',
      };
    }

    credential.isActive = false;
    this.credentials.set(credentialId, credential);

    return {
      success: true,
      credential: { ...credential, secret: '***' },
    };
  }

  /**
   * Verify credential secret
   */
  verifyCredential(credentialId: string, secret: string): boolean {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return false;
    }

    if (!credential.isActive) {
      return false;
    }

    if (credential.expiresAt && credential.expiresAt < new Date()) {
      return false;
    }

    try {
      const decryptedSecret = this.encryptionService.decrypt(credential.secret);
      return decryptedSecret === secret;
    } catch {
      return false;
    }
  }

  /**
   * Check if credential is expired
   */
  isExpired(credentialId: string): boolean {
    const credential = this.credentials.get(credentialId);

    if (!credential) {
      return true;
    }

    if (!credential.expiresAt) {
      return false;
    }

    return credential.expiresAt < new Date();
  }

  /**
   * Get expiring credentials (within days)
   */
  getExpiringCredentials(userId: string, daysThreshold: number = 30): Credential[] {
    const expiringCredentials: Credential[] = [];
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    for (const credential of this.credentials.values()) {
      if (
        credential.userId === userId &&
        credential.isActive &&
        credential.expiresAt &&
        credential.expiresAt <= thresholdDate &&
        credential.expiresAt > now
      ) {
        expiringCredentials.push({ ...credential, secret: '***' });
      }
    }

    return expiringCredentials.sort((a, b) => {
      if (!a.expiresAt || !b.expiresAt) return 0;
      return a.expiresAt.getTime() - b.expiresAt.getTime();
    });
  }

  /**
   * Rotate credential (revoke old and create new)
   */
  rotateCredential(credentialId: string, newSecret: string): CredentialResult {
    // Get old credential
    const oldCredential = this.credentials.get(credentialId);

    if (!oldCredential) {
      return {
        success: false,
        error: 'Credential not found',
      };
    }

    // Create new credential
    const createResult = this.createCredential(
      oldCredential.userId,
      `${oldCredential.name} (rotated)`,
      oldCredential.type,
      newSecret,
      oldCredential.expiresAt,
      oldCredential.metadata
    );

    if (!createResult.success) {
      return createResult;
    }

    // Revoke old credential
    this.revokeCredential(credentialId);

    return createResult;
  }

  /**
   * Count credentials by type
   */
  countCredentialsByType(userId: string): Record<string, number> {
    const counts: Record<string, number> = {
      api_key: 0,
      token: 0,
      oauth: 0,
      certificate: 0,
    };

    for (const credential of this.credentials.values()) {
      if (credential.userId === userId && credential.isActive) {
        counts[credential.type]++;
      }
    }

    return counts;
  }
}
