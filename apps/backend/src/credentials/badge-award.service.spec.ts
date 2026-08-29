/**
 * Unit tests for BadgeAwardService — issue #818.
 *
 * Verifies:
 *  - Credential issuance is delegated to CredentialsService.
 *  - Referral reward is minted only on the user's FIRST completed course.
 *  - Stellar / referral errors are non-fatal (do not prevent the credential
 *    from being issued).
 *  - A CredentialsService error IS propagated to the caller.
 *
 * @jest-environment node
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { BadgeAwardService } from './badge-award.service';
import { CredentialsService } from './credentials.service';
import { StellarService } from '../stellar/stellar.service';
import { UsersService } from '../users/users.service';
import { PROGRESS_REPOSITORY_TOKEN } from '../repositories/repositories.module';

describe('BadgeAwardService (#818)', () => {
  let service: BadgeAwardService;

  const mockCredentialsService = { issue: jest.fn() };
  const mockStellarService = { mintReward: jest.fn() };
  const mockUsersService = { findById: jest.fn() };
  const mockProgressRepository = { countCompletedByUser: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BadgeAwardService,
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: StellarService, useValue: mockStellarService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PROGRESS_REPOSITORY_TOKEN, useValue: mockProgressRepository },
      ],
    }).compile();

    service = module.get<BadgeAwardService>(BadgeAwardService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── awardOnCompletion ──────────────────────────────────────────────────────

  describe('awardOnCompletion', () => {
    const userId = 'user-1';
    const courseId = 'course-abc';
    const stellarKey = 'GDUMMY...STELLAR';

    it('issues credential via CredentialsService', async () => {
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockResolvedValue(2); // not first

      await service.awardOnCompletion(userId, courseId, stellarKey);

      expect(mockCredentialsService.issue).toHaveBeenCalledWith(userId, courseId, stellarKey);
    });

    it('propagates CredentialsService errors to the caller', async () => {
      mockCredentialsService.issue.mockRejectedValue(new Error('Stellar timeout'));

      await expect(service.awardOnCompletion(userId, courseId, stellarKey)).rejects.toThrow(
        'Stellar timeout'
      );
    });

    it('mints referral reward on first course completion with a valid referrer', async () => {
      const referrerId = 'referrer-1';
      const referrerKey = 'GREFERRER...';

      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockResolvedValue(1); // first completion
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: referrerId })
        .mockResolvedValueOnce({ id: referrerId, stellarPublicKey: referrerKey });
      mockStellarService.mintReward.mockResolvedValue(undefined);

      await service.awardOnCompletion(userId, courseId, stellarKey);

      expect(mockStellarService.mintReward).toHaveBeenCalledWith(referrerKey, 50);
    });

    it('does NOT mint referral reward on subsequent course completions', async () => {
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockResolvedValue(3); // not first

      await service.awardOnCompletion(userId, courseId, stellarKey);

      expect(mockStellarService.mintReward).not.toHaveBeenCalled();
    });

    it('does NOT mint referral reward when user has no referrer', async () => {
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockResolvedValue(1);
      mockUsersService.findById.mockResolvedValueOnce({ id: userId, referredBy: null });

      await service.awardOnCompletion(userId, courseId, stellarKey);

      expect(mockStellarService.mintReward).not.toHaveBeenCalled();
    });

    it('does NOT mint referral reward when referrer has no Stellar key', async () => {
      const referrerId = 'referrer-2';

      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockResolvedValue(1);
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: referrerId })
        .mockResolvedValueOnce({ id: referrerId, stellarPublicKey: null });

      await service.awardOnCompletion(userId, courseId, stellarKey);

      expect(mockStellarService.mintReward).not.toHaveBeenCalled();
    });

    it('is non-fatal when Stellar mint fails — credential is still considered issued', async () => {
      const referrerId = 'referrer-3';
      const referrerKey = 'GREFERRER3...';

      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockResolvedValue(1);
      mockUsersService.findById
        .mockResolvedValueOnce({ id: userId, referredBy: referrerId })
        .mockResolvedValueOnce({ id: referrerId, stellarPublicKey: referrerKey });
      mockStellarService.mintReward.mockRejectedValue(new Error('Network error'));

      // Must not throw
      await expect(
        service.awardOnCompletion(userId, courseId, stellarKey)
      ).resolves.toBeUndefined();

      // Credential was still issued
      expect(mockCredentialsService.issue).toHaveBeenCalledWith(userId, courseId, stellarKey);
    });

    it('is non-fatal when progress repository throws during referral check', async () => {
      mockCredentialsService.issue.mockResolvedValue(undefined);
      mockProgressRepository.countCompletedByUser.mockRejectedValue(new Error('DB error'));

      // Must not throw
      await expect(
        service.awardOnCompletion(userId, courseId, stellarKey)
      ).resolves.toBeUndefined();

      // Credential was still issued
      expect(mockCredentialsService.issue).toHaveBeenCalled();
    });
  });
});
