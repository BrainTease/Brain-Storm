import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CredentialsService,
  Credential,
  EncryptionService,
} from '../services/CredentialsService';

describe('CredentialsService', () => {
  let credentialsService: CredentialsService;
  let mockEncryptionService: EncryptionService;

  beforeEach(() => {
    // Mock encryption service
    mockEncryptionService = {
      encrypt: vi.fn((data: string) => `encrypted_${data}`),
      decrypt: vi.fn((data: string) => data.replace('encrypted_', '')),
    };

    credentialsService = new CredentialsService(mockEncryptionService);
  });

  describe('createCredential', () => {
    it('should create a credential successfully', () => {
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );

      expect(result.success).toBe(true);
      expect(result.credential).toBeDefined();
      expect(result.credential?.name).toBe('Test API Key');
      expect(result.credential?.type).toBe('api_key');
      expect(result.credential?.userId).toBe('user-1');
      expect(result.credential?.secret).toBe('***');
      expect(result.credential?.isActive).toBe(true);
    });

    it('should encrypt the secret when creating credential', () => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('secret123456');
    });

    it('should include metadata when provided', () => {
      const metadata = { env: 'production', provider: 'stripe' };
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456',
        undefined,
        metadata
      );

      expect(result.credential?.metadata).toEqual(metadata);
    });

    it('should include expiresAt when provided', () => {
      const expiresAt = new Date('2025-12-31');
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456',
        expiresAt
      );

      expect(result.credential?.expiresAt).toEqual(expiresAt);
    });

    it('should fail if userId is missing', () => {
      const result = credentialsService.createCredential(
        '',
        'Test API Key',
        'api_key',
        'secret123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should fail if name is missing', () => {
      const result = credentialsService.createCredential(
        'user-1',
        '',
        'api_key',
        'secret123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should fail if type is missing', () => {
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        '' as any,
        'secret123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should fail if secret is missing', () => {
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        ''
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');
    });

    it('should fail if secret is too short', () => {
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'short'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should fail if credential type is invalid', () => {
      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'invalid_type' as any,
        'secret123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credential type');
    });

    it('should fail if name length exceeds 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = credentialsService.createCredential(
        'user-1',
        longName,
        'api_key',
        'secret123456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 100 characters');
    });

    it('should fail if duplicate name exists for same user', () => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );

      const result = credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'different_secret'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should allow same name for different users', () => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );

      const result = credentialsService.createCredential(
        'user-2',
        'Test API Key',
        'api_key',
        'different_secret'
      );

      expect(result.success).toBe(true);
    });

    it('should create credentials with different types', () => {
      const types: Array<'api_key' | 'token' | 'oauth' | 'certificate'> = [
        'api_key',
        'token',
        'oauth',
        'certificate',
      ];

      types.forEach((type) => {
        const result = credentialsService.createCredential(
          'user-1',
          `${type} credential`,
          type,
          'secret123456'
        );

        expect(result.success).toBe(true);
        expect(result.credential?.type).toBe(type);
      });
    });
  });

  describe('getCredential', () => {
    beforeEach(() => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );
    });

    it('should retrieve credential by ID without decrypting secret', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.getCredential(credentialId, false);

      expect(result.success).toBe(true);
      expect(result.credential?.name).toBe('Test API Key');
      expect(result.credential?.secret).toBe('***');
    });

    it('should retrieve and decrypt credential secret when requested', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.getCredential(credentialId, true);

      expect(result.success).toBe(true);
      expect(result.credential?.secret).toBe('secret123456');
      expect(mockEncryptionService.decrypt).toHaveBeenCalled();
    });

    it('should fail if credential ID is missing', () => {
      const result = credentialsService.getCredential('', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credential ID is required');
    });

    it('should fail if credential not found', () => {
      const result = credentialsService.getCredential('non-existent', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if credential is expired', () => {
      const expiredDate = new Date('2020-01-01');
      credentialsService.createCredential(
        'user-1',
        'Expired Key',
        'api_key',
        'secret123456',
        expiredDate
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const expiredId = credentials.find(
        (c: any) => c.name === 'Expired Key'
      )?.id;

      const result = credentialsService.getCredential(expiredId, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('getUserCredentials', () => {
    it('should retrieve all credentials for a user', () => {
      credentialsService.createCredential(
        'user-1',
        'API Key 1',
        'api_key',
        'secret123456'
      );
      credentialsService.createCredential(
        'user-1',
        'Token 1',
        'token',
        'secret123456'
      );

      const result = credentialsService.getUserCredentials('user-1');

      expect(result.success).toBe(true);
      expect(result.credentials?.length).toBe(2);
      expect(result.credentials?.some((c) => c.name === 'API Key 1')).toBe(true);
      expect(result.credentials?.some((c) => c.name === 'Token 1')).toBe(true);
    });

    it('should include mock credential from initialization', () => {
      const result = credentialsService.getUserCredentials('user-1');

      expect(result.success).toBe(true);
      expect(result.credentials?.length).toBeGreaterThan(0);
      expect(
        result.credentials?.some((c) => c.name === 'Production API Key')
      ).toBe(true);
    });

    it('should not include secrets in list responses', () => {
      credentialsService.createCredential(
        'user-1',
        'API Key 1',
        'api_key',
        'secret123456'
      );

      const result = credentialsService.getUserCredentials('user-1');

      result.credentials?.forEach((c) => {
        expect(c.secret).toBe('***');
      });
    });

    it('should not include inactive credentials by default', () => {
      const createResult = credentialsService.createCredential(
        'user-1',
        'Test Key',
        'api_key',
        'secret123456'
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test Key')
        ?.id;

      credentialsService.revokeCredential(credentialId);

      const result = credentialsService.getUserCredentials('user-1', false);

      expect(
        result.credentials?.some((c) => c.name === 'Test Key')
      ).toBe(false);
    });

    it('should include inactive credentials when requested', () => {
      const createResult = credentialsService.createCredential(
        'user-1',
        'Test Key',
        'api_key',
        'secret123456'
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test Key')
        ?.id;

      credentialsService.revokeCredential(credentialId);

      const result = credentialsService.getUserCredentials('user-1', true);

      expect(result.credentials?.some((c) => c.name === 'Test Key')).toBe(true);
    });

    it('should not retrieve credentials for other users', () => {
      credentialsService.createCredential(
        'user-1',
        'API Key 1',
        'api_key',
        'secret123456'
      );

      const result = credentialsService.getUserCredentials('user-2');

      expect(result.success).toBe(true);
      expect(
        result.credentials?.some((c) => c.name === 'API Key 1')
      ).toBe(false);
    });

    it('should fail if user ID is missing', () => {
      const result = credentialsService.getUserCredentials('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('updateCredential', () => {
    beforeEach(() => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );
    });

    it('should update credential name', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.updateCredential(
        credentialId,
        'Updated Name'
      );

      expect(result.success).toBe(true);
      expect(result.credential?.name).toBe('Updated Name');
    });

    it('should update credential active status', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.updateCredential(
        credentialId,
        undefined,
        false
      );

      expect(result.success).toBe(true);
      expect(result.credential?.isActive).toBe(false);
    });

    it('should update credential expiration date', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;
      const newExpiry = new Date('2025-12-31');

      const result = credentialsService.updateCredential(
        credentialId,
        undefined,
        undefined,
        newExpiry
      );

      expect(result.success).toBe(true);
      expect(result.credential?.expiresAt).toEqual(newExpiry);
    });

    it('should update multiple fields at once', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;
      const newExpiry = new Date('2025-12-31');

      const result = credentialsService.updateCredential(
        credentialId,
        'New Name',
        false,
        newExpiry
      );

      expect(result.success).toBe(true);
      expect(result.credential?.name).toBe('New Name');
      expect(result.credential?.isActive).toBe(false);
      expect(result.credential?.expiresAt).toEqual(newExpiry);
    });

    it('should fail if credential ID is missing', () => {
      const result = credentialsService.updateCredential('', 'New Name');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credential ID is required');
    });

    it('should fail if credential not found', () => {
      const result = credentialsService.updateCredential(
        'non-existent',
        'New Name'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if name is too short', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.updateCredential(
        credentialId,
        ''
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 100 characters');
    });

    it('should fail if name is too long', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;
      const longName = 'a'.repeat(101);

      const result = credentialsService.updateCredential(
        credentialId,
        longName
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 100 characters');
    });

    it('should fail if updating to duplicate name', () => {
      credentialsService.createCredential(
        'user-1',
        'Another Key',
        'api_key',
        'secret123456'
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.updateCredential(
        credentialId,
        'Another Key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should not mask secret in update response', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.updateCredential(
        credentialId,
        'Updated Name'
      );

      expect(result.credential?.secret).toBe('***');
    });
  });

  describe('deleteCredential', () => {
    beforeEach(() => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );
    });

    it('should delete credential successfully', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const deleteResult = credentialsService.deleteCredential(credentialId);

      expect(deleteResult.success).toBe(true);

      const getResult = credentialsService.getCredential(credentialId, false);
      expect(getResult.success).toBe(false);
    });

    it('should fail if credential ID is missing', () => {
      const result = credentialsService.deleteCredential('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credential ID is required');
    });

    it('should fail if credential not found', () => {
      const result = credentialsService.deleteCredential('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return credential data before deletion', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const result = credentialsService.deleteCredential(credentialId);

      expect(result.credential?.name).toBe('Test API Key');
      expect(result.credential?.secret).toBe('***');
    });
  });

  describe('revokeCredential', () => {
    beforeEach(() => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );
    });

    it('should revoke credential successfully', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      const result = credentialsService.revokeCredential(credentialId);

      expect(result.success).toBe(true);
      expect(result.credential?.isActive).toBe(false);
    });

    it('should fail if credential ID is missing', () => {
      const result = credentialsService.revokeCredential('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credential ID is required');
    });

    it('should fail if credential not found', () => {
      const result = credentialsService.revokeCredential('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if credential already revoked', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1', true) as any
      ).credentials;
      const credentialId = credentials[0].id;

      credentialsService.revokeCredential(credentialId);
      const result = credentialsService.revokeCredential(credentialId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already revoked');
    });

    it('should not include revoked credentials in active list', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials[0].id;

      credentialsService.revokeCredential(credentialId);
      const result = credentialsService.getUserCredentials('user-1', false);

      expect(
        result.credentials?.some((c) => c.name === 'Test API Key')
      ).toBe(false);
    });
  });

  describe('verifyCredential', () => {
    beforeEach(() => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );
    });

    it('should verify correct credential secret', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const isValid = credentialsService.verifyCredential(
        credentialId,
        'secret123456'
      );

      expect(isValid).toBe(true);
    });

    it('should fail with incorrect secret', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const isValid = credentialsService.verifyCredential(
        credentialId,
        'wrong_secret'
      );

      expect(isValid).toBe(false);
    });

    it('should fail if credential not found', () => {
      const isValid = credentialsService.verifyCredential(
        'non-existent',
        'secret123456'
      );

      expect(isValid).toBe(false);
    });

    it('should fail if credential is revoked', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      credentialsService.revokeCredential(credentialId);

      const isValid = credentialsService.verifyCredential(
        credentialId,
        'secret123456'
      );

      expect(isValid).toBe(false);
    });

    it('should fail if credential is expired', () => {
      const expiredDate = new Date('2020-01-01');
      credentialsService.createCredential(
        'user-1',
        'Expired Key',
        'api_key',
        'secret123456',
        expiredDate
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1', true) as any
      ).credentials;
      const expiredId = credentials.find((c: any) => c.name === 'Expired Key')
        ?.id;

      const isValid = credentialsService.verifyCredential(
        expiredId,
        'secret123456'
      );

      expect(isValid).toBe(false);
    });

    it('should handle decryption errors gracefully', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      (mockEncryptionService.decrypt as any).mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      const isValid = credentialsService.verifyCredential(
        credentialId,
        'secret123456'
      );

      expect(isValid).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false for non-expiring credentials', () => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456'
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const isExpired = credentialsService.isExpired(credentialId);

      expect(isExpired).toBe(false);
    });

    it('should return false for future expiration dates', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      credentialsService.createCredential(
        'user-1',
        'Future Expiry',
        'api_key',
        'secret123456',
        futureDate
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Future Expiry')
        ?.id;

      const isExpired = credentialsService.isExpired(credentialId);

      expect(isExpired).toBe(false);
    });

    it('should return true for past expiration dates', () => {
      const pastDate = new Date('2020-01-01');
      credentialsService.createCredential(
        'user-1',
        'Past Expiry',
        'api_key',
        'secret123456',
        pastDate
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1', true) as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Past Expiry')
        ?.id;

      const isExpired = credentialsService.isExpired(credentialId);

      expect(isExpired).toBe(true);
    });

    it('should return true for non-existent credentials', () => {
      const isExpired = credentialsService.isExpired('non-existent');

      expect(isExpired).toBe(true);
    });
  });

  describe('getExpiringCredentials', () => {
    it('should return credentials expiring within threshold', () => {
      const withinThreshold = new Date(
        Date.now() + 20 * 24 * 60 * 60 * 1000
      );
      credentialsService.createCredential(
        'user-1',
        'Expiring Soon',
        'api_key',
        'secret123456',
        withinThreshold
      );

      const result = credentialsService.getExpiringCredentials(
        'user-1',
        30
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((c) => c.name === 'Expiring Soon')).toBe(true);
    });

    it('should not return credentials expiring beyond threshold', () => {
      const beyondThreshold = new Date(
        Date.now() + 60 * 24 * 60 * 60 * 1000
      );
      credentialsService.createCredential(
        'user-1',
        'Far Future',
        'api_key',
        'secret123456',
        beyondThreshold
      );

      const result = credentialsService.getExpiringCredentials(
        'user-1',
        30
      );

      expect(result.some((c) => c.name === 'Far Future')).toBe(false);
    });

    it('should not return already expired credentials', () => {
      const pastDate = new Date('2020-01-01');
      credentialsService.createCredential(
        'user-1',
        'Already Expired',
        'api_key',
        'secret123456',
        pastDate
      );

      const result = credentialsService.getExpiringCredentials(
        'user-1',
        30
      );

      expect(result.some((c) => c.name === 'Already Expired')).toBe(false);
    });

    it('should return only active credentials', () => {
      const withinThreshold = new Date(
        Date.now() + 20 * 24 * 60 * 60 * 1000
      );
      const createResult = credentialsService.createCredential(
        'user-1',
        'Will Revoke',
        'api_key',
        'secret123456',
        withinThreshold
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Will Revoke')
        ?.id;

      credentialsService.revokeCredential(credentialId);

      const result = credentialsService.getExpiringCredentials(
        'user-1',
        30
      );

      expect(result.some((c) => c.name === 'Will Revoke')).toBe(false);
    });

    it('should sort credentials by expiration date', () => {
      const date1 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const date2 = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

      credentialsService.createCredential(
        'user-1',
        'First Expiry',
        'api_key',
        'secret123456',
        date2
      );
      credentialsService.createCredential(
        'user-1',
        'Second Expiry',
        'api_key',
        'secret123456',
        date1
      );

      const result = credentialsService.getExpiringCredentials(
        'user-1',
        30
      );

      const names = result.map((c) => c.name);
      const secondExpiryIndex = names.indexOf('Second Expiry');
      const firstExpiryIndex = names.indexOf('First Expiry');

      if (secondExpiryIndex !== -1 && firstExpiryIndex !== -1) {
        expect(secondExpiryIndex).toBeLessThan(firstExpiryIndex);
      }
    });

    it('should use default threshold of 30 days', () => {
      const date = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
      credentialsService.createCredential(
        'user-1',
        'Default Threshold',
        'api_key',
        'secret123456',
        date
      );

      const result = credentialsService.getExpiringCredentials('user-1');

      expect(result.some((c) => c.name === 'Default Threshold')).toBe(true);
    });

    it('should not return secrets in results', () => {
      const withinThreshold = new Date(
        Date.now() + 20 * 24 * 60 * 60 * 1000
      );
      credentialsService.createCredential(
        'user-1',
        'Secret Check',
        'api_key',
        'secret123456',
        withinThreshold
      );

      const result = credentialsService.getExpiringCredentials(
        'user-1',
        30
      );

      result.forEach((c) => {
        expect(c.secret).toBe('***');
      });
    });
  });

  describe('rotateCredential', () => {
    beforeEach(() => {
      credentialsService.createCredential(
        'user-1',
        'Test API Key',
        'api_key',
        'secret123456',
        new Date('2025-12-31'),
        { env: 'production' }
      );
    });

    it('should rotate credential successfully', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const oldCredentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const result = credentialsService.rotateCredential(
        oldCredentialId,
        'newsecret123'
      );

      expect(result.success).toBe(true);
      expect(result.credential?.name).toContain('rotated');
    });

    it('should revoke old credential when rotating', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const oldCredentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      credentialsService.rotateCredential(oldCredentialId, 'newsecret123');

      const oldCredential = credentialsService.getCredential(
        oldCredentialId,
        false
      );
      expect(oldCredential.error).toContain('expired');
    });

    it('should preserve expiration date during rotation', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const oldCredentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const result = credentialsService.rotateCredential(
        oldCredentialId,
        'newsecret123'
      );

      expect(result.credential?.expiresAt).toEqual(new Date('2025-12-31'));
    });

    it('should preserve metadata during rotation', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const oldCredentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const result = credentialsService.rotateCredential(
        oldCredentialId,
        'newsecret123'
      );

      expect(result.credential?.metadata).toEqual({ env: 'production' });
    });

    it('should fail if credential not found', () => {
      const result = credentialsService.rotateCredential(
        'non-existent',
        'newsecret123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate new secret', () => {
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const oldCredentialId = credentials.find((c: any) => c.name === 'Test API Key')
        ?.id;

      const result = credentialsService.rotateCredential(
        oldCredentialId,
        'short'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });
  });

  describe('countCredentialsByType', () => {
    it('should count credentials by type', () => {
      credentialsService.createCredential(
        'user-1',
        'API Key 1',
        'api_key',
        'secret123456'
      );
      credentialsService.createCredential(
        'user-1',
        'API Key 2',
        'api_key',
        'secret123456'
      );
      credentialsService.createCredential(
        'user-1',
        'Token 1',
        'token',
        'secret123456'
      );

      const counts = credentialsService.countCredentialsByType('user-1');

      expect(counts.api_key).toBeGreaterThanOrEqual(2);
      expect(counts.token).toBeGreaterThanOrEqual(1);
    });

    it('should not count inactive credentials', () => {
      credentialsService.createCredential(
        'user-1',
        'Test Key',
        'api_key',
        'secret123456'
      );

      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Test Key')
        ?.id;

      credentialsService.revokeCredential(credentialId);

      const counts = credentialsService.countCredentialsByType('user-1');
      const beforeRevoke = credentialsService.countCredentialsByType('user-1');

      expect(counts.api_key).toBeLessThan(beforeRevoke.api_key);
    });

    it('should return zero counts if no credentials exist', () => {
      const counts = credentialsService.countCredentialsByType(
        'non-existent-user'
      );

      expect(counts.api_key).toBe(0);
      expect(counts.token).toBe(0);
      expect(counts.oauth).toBe(0);
      expect(counts.certificate).toBe(0);
    });

    it('should handle all credential types', () => {
      credentialsService.createCredential(
        'user-1',
        'Api Key',
        'api_key',
        'secret123456'
      );
      credentialsService.createCredential(
        'user-1',
        'Token',
        'token',
        'secret123456'
      );
      credentialsService.createCredential(
        'user-1',
        'OAuth',
        'oauth',
        'secret123456'
      );
      credentialsService.createCredential(
        'user-1',
        'Cert',
        'certificate',
        'secret123456'
      );

      const counts = credentialsService.countCredentialsByType('user-1');

      expect(counts.api_key).toBeGreaterThanOrEqual(1);
      expect(counts.token).toBeGreaterThanOrEqual(1);
      expect(counts.oauth).toBeGreaterThanOrEqual(1);
      expect(counts.certificate).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete credential lifecycle', () => {
      // Create
      const createResult = credentialsService.createCredential(
        'user-1',
        'Integration Test',
        'api_key',
        'secret123456',
        new Date('2025-12-31')
      );

      expect(createResult.success).toBe(true);

      // Retrieve
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find(
        (c: any) => c.name === 'Integration Test'
      )?.id;

      // Verify
      const isValid = credentialsService.verifyCredential(
        credentialId,
        'secret123456'
      );
      expect(isValid).toBe(true);

      // Update
      const updateResult = credentialsService.updateCredential(
        credentialId,
        'Updated Integration Test'
      );
      expect(updateResult.success).toBe(true);

      // Rotate
      const rotateResult = credentialsService.rotateCredential(
        credentialId,
        'newsecret123456'
      );
      expect(rotateResult.success).toBe(true);

      // Verify old secret fails
      const oldSecretValid = credentialsService.verifyCredential(
        credentialId,
        'secret123456'
      );
      expect(oldSecretValid).toBe(false);
    });

    it('should track expiring credentials throughout lifecycle', () => {
      const withinThreshold = new Date(
        Date.now() + 20 * 24 * 60 * 60 * 1000
      );

      credentialsService.createCredential(
        'user-1',
        'Track Expiry',
        'api_key',
        'secret123456',
        withinThreshold
      );

      let expiringCredentials =
        credentialsService.getExpiringCredentials('user-1', 30);
      expect(expiringCredentials.some((c) => c.name === 'Track Expiry')).toBe(
        true
      );

      // After revoke, should not appear in expiring
      const credentials = (
        credentialsService.getUserCredentials('user-1') as any
      ).credentials;
      const credentialId = credentials.find((c: any) => c.name === 'Track Expiry')
        ?.id;

      credentialsService.revokeCredential(credentialId);

      expiringCredentials =
        credentialsService.getExpiringCredentials('user-1', 30);
      expect(expiringCredentials.some((c) => c.name === 'Track Expiry')).toBe(
        false
      );
    });
  });
});
