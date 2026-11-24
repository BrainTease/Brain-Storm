import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockAuthRepository = {
    createRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllRefreshTokensForUser: jest.fn(),
    createPasswordResetToken: jest.fn(),
    findPasswordResetToken: jest.fn(),
    deletePasswordResetToken: jest.fn(),
    createApiKey: jest.fn(),
    findApiKeyByHash: jest.fn(),
    findApiKeysForUser: jest.fn(),
    revokeApiKey: jest.fn(),
    saveStellarChallenge: jest.fn(),
    findStellarChallenge: jest.fn(),
    deleteStellarChallenge: jest.fn(),
    updateUserMfaSecret: jest.fn(),
    setUserMfaEnabled: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('should successfully register a new user (happy path)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ email });
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(email, password);

      expect(result).toEqual({ message: 'Registration successful. Please verify your email.' });
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ email });

      await expect(service.register(email, password)).rejects.toThrow(BadRequestException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashedPassword';
    const user = {
      id: 'uuid',
      email,
      passwordHash: hashedPassword,
      isVerified: true,
      isBanned: false,
      mfaEnabled: false,
    };

    it('should successfully login and return tokens (happy path)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      mockJwtService.sign.mockReturnValue('access_token');
      mockAuthRepository.createRefreshToken.mockResolvedValue({});

      const result = await service.login(email, password);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthRepository.createRefreshToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...user, isBanned: true });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...user, isVerified: false });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      await expect(service.login(email, password)).rejects.toThrow(ForbiddenException);
    });

    it('should return an MFA challenge instead of tokens when MFA is enabled', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...user, mfaEnabled: true });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      mockJwtService.sign.mockReturnValue('mfa_token');

      const result = await service.login(email, password);

      expect(result).toEqual({ mfaRequired: true, mfa_token: 'mfa_token' });
      expect(mockAuthRepository.createRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const userId = 'uuid';

    it('should rotate the refresh token and return new tokens', async () => {
      const stored = { token: 'old_refresh', userId, revoked: false };
      mockAuthRepository.findRefreshToken.mockResolvedValue(stored);
      mockJwtService.verify.mockReturnValue({ sub: userId });
      mockJwtService.sign.mockReturnValue('new_token');
      mockAuthRepository.revokeRefreshToken.mockResolvedValue(undefined);
      mockAuthRepository.createRefreshToken.mockResolvedValue({});

      const result = await service.refresh('old_refresh');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('old_refresh');
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if refresh token is unknown', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('unknown')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token is revoked', async () => {
      mockAuthRepository.findRefreshToken.mockResolvedValue({
        token: 'old_refresh',
        userId,
        revoked: true,
      });

      await expect(service.refresh('old_refresh')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke the given refresh token', async () => {
      mockAuthRepository.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout('refresh_token');

      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('refresh_token');
    });

    it('should revoke all refresh tokens for the user when no token is given', async () => {
      mockAuthRepository.revokeAllRefreshTokensForUser.mockResolvedValue(undefined);

      await service.logout(undefined, 'uuid');

      expect(mockAuthRepository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('uuid');
    });
  });

  describe('verifyEmail', () => {
    it('should mark the user as verified', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'uuid', email: 'test@example.com' });
      mockUsersService.update.mockResolvedValue(undefined);

      const result = await service.verifyEmail('token');

      expect(mockUsersService.update).toHaveBeenCalledWith('uuid', { isVerified: true });
      expect(result).toEqual({ message: 'Email verified successfully.' });
    });

    it('should throw BadRequestException for an invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.verifyEmail('bad')).rejects.toThrow(BadRequestException);
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should create a reset token and send an email', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'uuid', email: 'test@example.com' });
      mockAuthRepository.createPasswordResetToken.mockResolvedValue({ token: 'reset' });
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(mockAuthRepository.createPasswordResetToken).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password reset email sent.' });
    });

    it('should not reveal whether the email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('missing@example.com');

      expect(mockAuthRepository.createPasswordResetToken).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Password reset email sent.' });
    });
  });

  describe('resetPassword', () => {
    it('should update the password and delete the reset token', async () => {
      mockAuthRepository.findPasswordResetToken.mockResolvedValue({
        token: 'reset',
        userId: 'uuid',
        used: false,
      });
      mockUsersService.update.mockResolvedValue(undefined);
      mockAuthRepository.deletePasswordResetToken.mockResolvedValue(undefined);

      const result = await service.resetPassword('reset', 'newPassword123');

      expect(mockUsersService.update).toHaveBeenCalled();
      expect(mockAuthRepository.deletePasswordResetToken).toHaveBeenCalledWith('reset');
      expect(result).toEqual({ message: 'Password reset successful.' });
    });

    it('should throw BadRequestException for an invalid reset token', async () => {
      mockAuthRepository.findPasswordResetToken.mockResolvedValue(null);

      await expect(service.resetPassword('bad', 'newPassword123')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });

  describe('MFA', () => {
    it('should generate an MFA secret and store it', async () => {
      mockAuthRepository.updateUserMfaSecret.mockResolvedValue(undefined);

      const result = await service.generateMfaSecret('uuid');

      expect(result).toHaveProperty('secret');
      expect(mockAuthRepository.updateUserMfaSecret).toHaveBeenCalledWith(
        'uuid',
        expect.any(String),
      );
    });

    it('should enable MFA when the provided code is valid', async () => {
      mockUsersService.findById.mockResolvedValue({ id: 'uuid', mfaSecret: 'SECRET' });
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(true);
      mockAuthRepository.setUserMfaEnabled.mockResolvedValue(undefined);

      const result = await service.enableMfa('uuid', '123456');

      expect(mockAuthRepository.setUserMfaEnabled).toHaveBeenCalledWith('uuid', true);
      expect(result).toEqual({ message: 'MFA enabled successfully.' });
    });

    it('should throw UnauthorizedException when the MFA code is invalid', async () => {
      mockUsersService.findById.mockResolvedValue({ id: 'uuid', mfaSecret: 'SECRET' });
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(false);

      await expect(service.enableMfa('uuid', '000000')).rejects.toThrow(UnauthorizedException);
      expect(mockAuthRepository.setUserMfaEnabled).not.toHaveBeenCalled();
    });

    it('should disable MFA for the user', async () => {
      mockAuthRepository.setUserMfaEnabled.mockResolvedValue(undefined);

      const result = await service.disableMfa('uuid');

      expect(mockAuthRepository.setUserMfaEnabled).toHaveBeenCalledWith('uuid', false);
      expect(result).toEqual({ message: 'MFA disabled successfully.' });
    });

    it('should complete an MFA login challenge and return tokens', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'uuid', mfa: true });
      mockUsersService.findById.mockResolvedValue({
        id: 'uuid',
        mfaSecret: 'SECRET',
        mfaEnabled: true,
        isBanned: false,
      });
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(true);
      mockJwtService.sign.mockReturnValue('access_token');
      mockAuthRepository.createRefreshToken.mockResolvedValue({});

      const result = await service.verifyMfaLogin('mfa_token', '123456');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should reject an MFA login challenge with an invalid code', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'uuid', mfa: true });
      mockUsersService.findById.mockResolvedValue({
        id: 'uuid',
        mfaSecret: 'SECRET',
        mfaEnabled: true,
      });
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(false);

      await expect(service.verifyMfaLogin('mfa_token', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthRepository.createRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('API keys', () => {
    it('should generate an API key and persist its hash', async () => {
      mockAuthRepository.createApiKey.mockResolvedValue({ id: 'key-id' });

      const result = await service.generateApiKey('uuid', 'my key');

      expect(result).toHaveProperty('apiKey');
      expect(mockAuthRepository.createApiKey).toHaveBeenCalledWith(
        'uuid',
        'my key',
        expect.any(String),
      );
    });

    it('should list API keys for a user', async () => {
      const keys = [{ id: 'key-id', name: 'my key' }];
      mockAuthRepository.findApiKeysForUser.mockResolvedValue(keys);

      const result = await service.listApiKeys('uuid');

      expect(result).toEqual(keys);
      expect(mockAuthRepository.findApiKeysForUser).toHaveBeenCalledWith('uuid');
    });

    it('should revoke an API key', async () => {
      mockAuthRepository.revokeApiKey.mockResolvedValue(undefined);

      const result = await service.revokeApiKey('uuid', 'key-id');

      expect(mockAuthRepository.revokeApiKey).toHaveBeenCalledWith('uuid', 'key-id');
      expect(result).toEqual({ message: 'API key revoked.' });
    });

    it('should validate an API key via the repository', async () => {
      mockAuthRepository.findApiKeyByHash.mockResolvedValue({ userId: 'uuid', revoked: false });

      const result = await service.validateApiKey('raw-key');

      expect(result).toEqual({ userId: 'uuid' });
      expect(mockAuthRepository.findApiKeyByHash).toHaveBeenCalled();
    });

    it('should reject an unknown API key', async () => {
      mockAuthRepository.findApiKeyByHash.mockResolvedValue(null);

      await expect(service.validateApiKey('raw-key')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Stellar challenge', () => {
    it('should create and persist a challenge', async () => {
      mockAuthRepository.saveStellarChallenge.mockResolvedValue(undefined);

      const result = await service.createStellarChallenge('GADDRESS');

      expect(result).toHaveProperty('challenge');
      expect(mockAuthRepository.saveStellarChallenge).toHaveBeenCalledWith(
        'GADDRESS',
        expect.any(String),
      );
    });

    it('should verify a valid signed challenge', async () => {
      mockAuthRepository.findStellarChallenge.mockResolvedValue({
        address: 'GADDRESS',
        challenge: 'challenge',
        expiresAt: new Date(Date.now() + 60_000),
      });
      jest.spyOn(service as any, 'verifyStellarSignature').mockReturnValue(true);
      mockUsersService.findByEmail.mockResolvedValue({ id: 'uuid', stellarAddress: 'GADDRESS' });
      mockJwtService.sign.mockReturnValue('access_token');
      mockAuthRepository.createRefreshToken.mockResolvedValue({});
      mockAuthRepository.deleteStellarChallenge.mockResolvedValue(undefined);

      const result = await service.verifyStellarChallenge('GADDRESS', 'signature');

      expect(result).toHaveProperty('access_token');
      expect(mockAuthRepository.deleteStellarChallenge).toHaveBeenCalledWith('GADDRESS');
    });

    it('should reject an expired challenge', async () => {
      mockAuthRepository.findStellarChallenge.mockResolvedValue({
        address: 'GADDRESS',
        challenge: 'challenge',
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.verifyStellarChallenge('GADDRESS', 'signature')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject an invalid signature', async () => {
      mockAuthRepository.findStellarChallenge.mockResolvedValue({
        address: 'GADDRESS',
        challenge: 'challenge',
        expiresAt: new Date(Date.now() + 60_000),
      });
      jest.spyOn(service as any, 'verifyStellarSignature').mockReturnValue(false);

      await expect(service.verifyStellarChallenge('GADDRESS', 'signature')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
