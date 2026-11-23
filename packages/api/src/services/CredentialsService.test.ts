/**
 * CredentialsService Unit Tests
 * Tests for credential management with encryption/decryption
 * Covers: creation, retrieval, validation, encryption, lifecycle
 * Target: 85%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CredentialsService, Credential, EncryptionService } from './CredentialsService'

describe('CredentialsService', () => {
  let mockEncryptionService: EncryptionService
  let service: CredentialsService

  beforeEach(() => {
    // Mock encryption service with simple encrypt/decrypt
    mockEncryptionService = {
      encrypt: vi.fn((data: string) => `encrypted_${data}`),
      decrypt: vi.fn((data: string) => data.replace('encrypted_', '')),
    }
    service = new CredentialsService(mockEncryptionService)
    vi.clearAllMocks()
  })

  describe('createCredential', () => {
    it('should create a new credential with valid inputs', () => {
      const result = service.createCredential(
        'user-1',
        'My API Key',
        'api_key',
        'sk_test_123456789'
      )

      expect(result.success).toBe(true)
      expect(result.credential).toBeDefined()
      expect(result.credential!.userId).toBe('user-1')
      expect(result.credential!.name).toBe('My API Key')
      expect(result.credential!.type).toBe('api_key')
      expect(result.credential!.isActive).toBe(true)
      expect(result.credential!.secret).toBe('***')
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('sk_test_123456789')
    })

    it('should create credential with all optional parameters', () => {
      const expiresAt = new Date('2025-12-31')
      const metadata = { environment: 'production', region: 'us-east-1' }

      const result = service.createCredential(
        'user-1',
        'Token',
        'token',
        'token_12345678',
        expiresAt,
        metadata
      )

      expect(result.success).toBe(true)
      expect(result.credential!.expiresAt).toEqual(expiresAt)
      expect(result.credential!.metadata).toEqual(metadata)
    })

    it('should create credentials with different types', () => {
      const types: Array<'api_key' | 'token' | 'oauth' | 'certificate'> = [
        'api_key',
        'token',
        'oauth',
        'certificate',
      ]

      for (const type of types) {
        const result = service.createCredential('user-1', `Cred-${type}`, type, 'secret_12345678')
        expect(result.success).toBe(true)
        expect(result.credential!.type).toBe(type)
      }
    })

    it('should fail when user ID is missing', () => {
      const result = service.createCredential('', 'My Key', 'api_key', 'sk_test_123456789')
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID')
    })

    it('should fail when name is missing', () => {
      const result = service.createCredential('user-1', '', 'api_key', 'sk_test_123456789')
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID, name, type, and secret are required')
    })

    it('should fail when type is missing', () => {
      const result = service.createCredential('user-1', 'Key', null as any, 'sk_test_123456789')
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID, name, type, and secret are required')
    })

    it('should fail when secret is missing', () => {
      const result = service.createCredential('user-1', 'Key', 'api_key', '')
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID, name, type, and secret are required')
    })

    it('should fail when secret is too short', () => {
      const result = service.createCredential('user-1', 'Key', 'api_key', 'short')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Secret must be at least 8 characters')
    })

    it('should fail when secret is not a string', () => {
      const result = service.createCredential('user-1', 'Key', 'api_key', 123 as any)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Secret must be at least 8 characters')
    })

    it('should fail when type is invalid', () => {
      const result = service.createCredential('user-1', 'Key', 'invalid' as any, 'sk_test_123456789')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid credential type')
    })

    it('should fail when name is too short', () => {
      const result = service.createCredential('user-1', '', 'api_key', 'sk_test_123456789')
      expect(result.success).toBe(false)
    })

    it('should fail when name is too long', () => {
      const longName = 'a'.repeat(101)
      const result = service.createCredential('user-1', longName, 'api_key', 'sk_test_123456789')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Name must be between 1 and 100 characters')
    })

    it('should fail when creating duplicate credentials for same user', () => {
      // Create first credential
      const result1 = service.createCredential('user-1', 'My Key', 'api_key', 'sk_test_111111111')
      expect(result1.success).toBe(true)

      // Try to create duplicate with same name
      const result2 = service.createCredential('user-1', 'My Key', 'api_key', 'sk_test_222222222')
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('Credential with this name already exists')
    })

    it('should allow same credential name for different users', () => {
      const result1 = service.createCredential('user-1', 'Key', 'api_key', 'sk_test_111111111')
      expect(result1.success).toBe(true)

      const result2 = service.createCredential('user-2', 'Key', 'api_key', 'sk_test_222222222')
      expect(result2.success).toBe(true)
    })

    it('should not return decrypted secret in create response', () => {
      const result = service.createCredential('user-1', 'Key', 'api_key', 'sk_test_123456789')
      expect(result.credential!.secret).toBe('***')
    })

    it('should encrypt secret using encryption service', () => {
      service.createCredential('user-1', 'Key', 'api_key', 'sk_test_123456789')
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('sk_test_123456789')
    })

    it('should generate unique credential IDs', () => {
      const result1 = service.createCredential('user-1', 'Key1', 'api_key', 'sk_test_111111111')
      const result2 = service.createCredential('user-1', 'Key2', 'api_key', 'sk_test_222222222')

      expect(result1.credential!.id).not.toBe(result2.credential!.id)
    })

    it('should set createdAt to current time', () => {
      const beforeTime = new Date()
      const result = service.createCredential('user-1', 'Key', 'api_key', 'sk_test_123456789')
      const afterTime = new Date()

      expect(result.credential!.createdAt).toBeInstanceOf(Date)
      expect(result.credential!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(result.credential!.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })

  describe('getCredential', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'My Key', 'api_key', 'sk_test_123456789')
    })

    it('should retrieve credential by ID without decrypting', () => {
      // Get first credential ID from creation
      const created = service.createCredential('user-1', 'Get Key', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.getCredential(credId, false)
      expect(result.success).toBe(true)
      expect(result.credential!.secret).toBe('***')
      expect(mockEncryptionService.decrypt).not.toHaveBeenCalled()
    })

    it('should retrieve credential with decrypted secret when requested', () => {
      const created = service.createCredential('user-1', 'Decrypt Key', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.getCredential(credId, true)
      expect(result.success).toBe(true)
      expect(result.credential!.secret).toBe('sk_test_123456789')
      expect(mockEncryptionService.decrypt).toHaveBeenCalled()
    })

    it('should fail when credential ID is missing', () => {
      const result = service.getCredential('')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential ID is required')
    })

    it('should fail when credential does not exist', () => {
      const result = service.getCredential('nonexistent-id')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential not found')
    })

    it('should fail when credential is expired', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const created = service.createCredential(
        'user-1',
        'Expired Key',
        'api_key',
        'sk_test_123456789',
        pastDate
      )
      const credId = created.credential!.id

      const result = service.getCredential(credId, false)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential has expired')
    })

    it('should not fail when credential has future expiry date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const created = service.createCredential(
        'user-1',
        'Future Key',
        'api_key',
        'sk_test_123456789',
        futureDate
      )
      const credId = created.credential!.id

      const result = service.getCredential(credId, false)
      expect(result.success).toBe(true)
    })

    it('should not fail when credential has no expiry date', () => {
      const created = service.createCredential('user-1', 'No Expire', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.getCredential(credId, false)
      expect(result.success).toBe(true)
    })
  })

  describe('getUserCredentials', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'Key 1', 'api_key', 'sk_test_111111111')
      service.createCredential('user-1', 'Key 2', 'token', 'token_22222222')
      service.createCredential('user-2', 'Key 3', 'api_key', 'sk_test_333333333')
    })

    it('should retrieve all credentials for a user', () => {
      const result = service.getUserCredentials('user-1')
      expect(result.success).toBe(true)
      expect(result.credentials!.length).toBe(2)
      expect(result.credentials!.every((c) => c.userId === 'user-1')).toBe(true)
    })

    it('should not return decrypted secrets in list', () => {
      const result = service.getUserCredentials('user-1')
      expect(result.credentials!.every((c) => c.secret === '***')).toBe(true)
    })

    it('should fail when user ID is missing', () => {
      const result = service.getUserCredentials('')
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID is required')
    })

    it('should return empty list for user with no credentials', () => {
      const result = service.getUserCredentials('user-99')
      expect(result.success).toBe(true)
      expect(result.credentials!.length).toBe(0)
    })

    it('should return empty list when user has no active credentials', () => {
      // Deactivate all credentials for user-1
      service.deactivateCredential('user-1', 'Key 1')
      service.deactivateCredential('user-1', 'Key 2')

      const result = service.getUserCredentials('user-1', false)
      expect(result.success).toBe(true)
      expect(result.credentials!.length).toBe(0)
    })

    it('should include inactive credentials when requested', () => {
      service.deactivateCredential('user-1', 'Key 1')

      const result = service.getUserCredentials('user-1', true)
      expect(result.success).toBe(true)
      expect(result.credentials!.length).toBe(2)
    })

    it('should not include other users credentials', () => {
      const result = service.getUserCredentials('user-1')
      expect(result.credentials!.every((c) => c.userId === 'user-1')).toBe(true)
      expect(result.credentials!.length).toBe(2)
    })

    it('should handle multiple users independently', () => {
      const user1Result = service.getUserCredentials('user-1')
      const user2Result = service.getUserCredentials('user-2')

      expect(user1Result.credentials!.length).toBe(2)
      expect(user2Result.credentials!.length).toBe(1)
    })
  })

  describe('revokeCredential', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'My Key', 'api_key', 'sk_test_123456789')
    })

    it('should revoke an active credential', () => {
      const created = service.createCredential('user-1', 'Revoke Key', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.revokeCredential(credId)
      expect(result.success).toBe(true)
      expect(result.credential!.isActive).toBe(false)
    })

    it('should fail when credential ID is missing', () => {
      const result = service.revokeCredential('')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential ID is required')
    })

    it('should fail when credential does not exist', () => {
      const result = service.revokeCredential('nonexistent-id')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential not found')
    })

    it('should fail when credential is already revoked', () => {
      const created = service.createCredential('user-1', 'Already Revoked', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      service.revokeCredential(credId)
      const result = service.revokeCredential(credId)
      expect(result.success).toBe(false)
      expect(result.error).toContain('already revoked')
    })

    it('should not list revoked credentials by default', () => {
      const created = service.createCredential('user-1', 'Revoke Test', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      service.revokeCredential(credId)
      const result = service.getUserCredentials('user-1', false)
      expect(result.credentials!.length).toBe(0)
    })

    it('should list revoked credentials when includeInactive is true', () => {
      const created = service.createCredential('user-1', 'Revoke Test', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      service.revokeCredential(credId)
      const result = service.getUserCredentials('user-1', true)
      expect(result.credentials!.length).toBe(1)
      expect(result.credentials![0].isActive).toBe(false)
    })
  })

  describe('deleteCredential', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'Key 1', 'api_key', 'sk_test_111111111')
      service.createCredential('user-1', 'Key 2', 'token', 'token_22222222')
    })

    it('should delete a credential', () => {
      const result = service.deleteCredential('user-1', 'Key 1')
      expect(result.success).toBe(true)
    })

    it('should not list deleted credentials', () => {
      service.deleteCredential('user-1', 'Key 1')
      const result = service.getUserCredentials('user-1', true)
      expect(result.credentials!.length).toBe(1)
      expect(result.credentials![0].name).toBe('Key 2')
    })

    it('should fail when deleting nonexistent credential', () => {
      const result = service.deleteCredential('user-1', 'Nonexistent')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential not found')
    })

    it('should fail when user ID is missing', () => {
      const result = service.deleteCredential('', 'Key 1')
      expect(result.success).toBe(false)
    })
  })

  describe('verifyCredential', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'Key', 'api_key', 'sk_test_123456789')
    })

    it('should verify correct secret', () => {
      const created = service.createCredential('user-1', 'Verify Key', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.verifyCredential(credId, 'sk_test_123456789')
      expect(result).toBe(true)
    })

    it('should not verify incorrect secret', () => {
      const created = service.createCredential('user-1', 'Verify Key', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.verifyCredential(credId, 'wrong_secret')
      expect(result).toBe(false)
    })

    it('should not verify nonexistent credential', () => {
      const result = service.verifyCredential('nonexistent-id', 'sk_test_123456789')
      expect(result).toBe(false)
    })

    it('should not verify revoked credential', () => {
      const created = service.createCredential('user-1', 'Revoked Verify', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      service.revokeCredential(credId)
      const result = service.verifyCredential(credId, 'sk_test_123456789')
      expect(result).toBe(false)
    })

    it('should not verify expired credential', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const created = service.createCredential(
        'user-1',
        'Expired Verify',
        'api_key',
        'sk_test_123456789',
        pastDate
      )
      const credId = created.credential!.id

      const result = service.verifyCredential(credId, 'sk_test_123456789')
      expect(result).toBe(false)
    })

    it('should handle encryption service errors gracefully', () => {
      mockEncryptionService.decrypt = vi.fn(() => {
        throw new Error('Decryption failed')
      })

      const created = service.createCredential('user-1', 'Error Key', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.verifyCredential(credId, 'sk_test_123456789')
      expect(result).toBe(false)
    })
  })

  describe('isExpired', () => {
    it('should return true for nonexistent credential', () => {
      const result = service.isExpired('nonexistent-id')
      expect(result).toBe(true)
    })

    it('should return false for credential with no expiry', () => {
      const created = service.createCredential('user-1', 'No Expire', 'api_key', 'sk_test_123456789')
      const credId = created.credential!.id

      const result = service.isExpired(credId)
      expect(result).toBe(false)
    })

    it('should return false for credential with future expiry', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const created = service.createCredential(
        'user-1',
        'Future Expire',
        'api_key',
        'sk_test_123456789',
        futureDate
      )
      const credId = created.credential!.id

      const result = service.isExpired(credId)
      expect(result).toBe(false)
    })

    it('should return true for credential with past expiry', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const created = service.createCredential(
        'user-1',
        'Past Expire',
        'api_key',
        'sk_test_123456789',
        pastDate
      )
      const credId = created.credential!.id

      const result = service.isExpired(credId)
      expect(result).toBe(true)
    })
  })

  describe('getExpiringCredentials', () => {
    beforeEach(() => {
      const now = new Date()

      // Credential expiring in 10 days
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
      service.createCredential(
        'user-1',
        'Expiring Soon',
        'api_key',
        'sk_test_111111111',
        tenDaysFromNow
      )

      // Credential expiring in 50 days
      const fiftyDaysFromNow = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000)
      service.createCredential(
        'user-1',
        'Expiring Later',
        'api_key',
        'sk_test_222222222',
        fiftyDaysFromNow
      )

      // Revoked credential
      const expiring = service.createCredential(
        'user-1',
        'Already Revoked',
        'api_key',
        'sk_test_333333333',
        tenDaysFromNow
      )
      service.revokeCredential(expiring.credential!.id)

      // No expiry credential
      service.createCredential('user-1', 'No Expiry', 'token', 'token_44444444')

      // Other user's credential
      const otherTenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)
      service.createCredential(
        'user-2',
        'Other User Key',
        'api_key',
        'sk_test_555555555',
        otherTenDaysFromNow
      )
    })

    it('should return credentials expiring within 30 days threshold', () => {
      const result = service.getExpiringCredentials('user-1', 30)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Expiring Soon')
    })

    it('should return credentials expiring within custom threshold', () => {
      const result = service.getExpiringCredentials('user-1', 60)
      expect(result.length).toBe(2)
    })

    it('should sort by expiry date', () => {
      const result = service.getExpiringCredentials('user-1', 60)
      expect(result[0].name).toBe('Expiring Soon')
      expect(result[1].name).toBe('Expiring Later')
    })

    it('should not include revoked credentials', () => {
      const result = service.getExpiringCredentials('user-1', 30)
      expect(result.every((c) => c.isActive)).toBe(true)
    })

    it('should not include credentials with no expiry', () => {
      const result = service.getExpiringCredentials('user-1', 1000)
      expect(result.every((c) => c.expiresAt !== undefined)).toBe(true)
    })

    it('should not include other users credentials', () => {
      const result = service.getExpiringCredentials('user-1', 30)
      expect(result.every((c) => c.userId === 'user-1')).toBe(true)
    })

    it('should return empty list for user with no expiring credentials', () => {
      const result = service.getExpiringCredentials('user-99', 30)
      expect(result.length).toBe(0)
    })

    it('should not include already expired credentials', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      service.createCredential(
        'user-1',
        'Already Expired',
        'api_key',
        'sk_test_666666666',
        pastDate
      )

      const result = service.getExpiringCredentials('user-1', 1000)
      expect(result.every((c) => c.expiresAt! > new Date())).toBe(true)
    })
  })

  describe('rotateCredential', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'Key to Rotate', 'api_key', 'sk_test_123456789')
    })

    it('should create new credential and revoke old one', () => {
      const oldCred = service.createCredential('user-1', 'Rotate Me', 'api_key', 'sk_test_123456789')
      const oldCredId = oldCred.credential!.id

      const result = service.rotateCredential(oldCredId, 'sk_test_new_secret')

      expect(result.success).toBe(true)
      expect(result.credential!.name).toContain('rotated')
      expect(result.credential!.id).not.toBe(oldCredId)

      // Old credential should be revoked
      const oldResult = service.getCredential(oldCredId)
      expect(oldResult.credential!.isActive).toBe(false)
    })

    it('should preserve user and type in rotated credential', () => {
      const oldCred = service.createCredential('user-1', 'Token Key', 'token', 'token_12345678')
      const oldCredId = oldCred.credential!.id

      const result = service.rotateCredential(oldCredId, 'token_new_secret')

      expect(result.credential!.userId).toBe('user-1')
      expect(result.credential!.type).toBe('token')
    })

    it('should fail when credential does not exist', () => {
      const result = service.rotateCredential('nonexistent-id', 'sk_test_new_secret')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Credential not found')
    })

    it('should validate new secret', () => {
      const oldCred = service.createCredential('user-1', 'Invalid Rotate', 'api_key', 'sk_test_123456789')
      const oldCredId = oldCred.credential!.id

      const result = service.rotateCredential(oldCredId, 'short')
      expect(result.success).toBe(false)
    })
  })

  describe('countCredentialsByType', () => {
    beforeEach(() => {
      service.createCredential('user-1', 'API Key 1', 'api_key', 'sk_test_111111111')
      service.createCredential('user-1', 'API Key 2', 'api_key', 'sk_test_222222222')
      service.createCredential('user-1', 'Token 1', 'token', 'token_11111111')
      service.createCredential('user-1', 'OAuth', 'oauth', 'oauth_1111111111')
      service.createCredential('user-1', 'Cert', 'certificate', 'cert_111111111111')

      // Revoked credential should not be counted
      const revoked = service.createCredential('user-1', 'Revoked API', 'api_key', 'sk_test_333333333')
      service.revokeCredential(revoked.credential!.id)

      // Other user's credentials
      service.createCredential('user-2', 'User 2 API', 'api_key', 'sk_test_444444444')
    })

    it('should count credentials by type', () => {
      const result = service.countCredentialsByType('user-1')

      expect(result.api_key).toBe(2)
      expect(result.token).toBe(1)
      expect(result.oauth).toBe(1)
      expect(result.certificate).toBe(1)
    })

    it('should not count revoked credentials', () => {
      const result = service.countCredentialsByType('user-1')
      expect(result.api_key).toBe(2)
    })

    it('should not count other users credentials', () => {
      const user1Result = service.countCredentialsByType('user-1')
      const user2Result = service.countCredentialsByType('user-2')

      expect(user1Result.api_key).toBe(2)
      expect(user2Result.api_key).toBe(1)
    })

    it('should return zero counts for user with no credentials', () => {
      const result = service.countCredentialsByType('user-99')

      expect(result.api_key).toBe(0)
      expect(result.token).toBe(0)
      expect(result.oauth).toBe(0)
      expect(result.certificate).toBe(0)
    })
  })

  describe('Edge cases and coverage', () => {
    it('should handle empty metadata object', () => {
      const result = service.createCredential(
        'user-1',
        'Key',
        'api_key',
        'sk_test_123456789',
        undefined,
        {}
      )
      expect(result.success).toBe(true)
      expect(result.credential!.metadata).toEqual({})
    })

    it('should handle credentials with same name across different users', () => {
      const result1 = service.createCredential('user-1', 'SharedName', 'api_key', 'sk_test_111111111')
      const result2 = service.createCredential('user-2', 'SharedName', 'token', 'token_22222222')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    it('should return error message in failed result', () => {
      const result = service.createCredential('', '', '', '')
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
      expect(result.credential).toBeUndefined()
    })

    it('should maintain credential immutability in returned objects', () => {
      const result1 = service.createCredential('user-1', 'Key', 'api_key', 'sk_test_123456789')
      const credId = result1.credential!.id

      // Get the credential twice
      const result2 = service.getCredential(credId)
      const result3 = service.getCredential(credId)

      // Both should return the same values
      expect(result2.credential!.id).toBe(result3.credential!.id)
      expect(result2.credential!.userId).toBe(result3.credential!.userId)
    })
  })
})
