import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PublicCredentialVerificationController } from './public-credential-verification.controller';
import { Credential } from './credential.entity';
import { StellarService } from '../stellar/stellar.service';

const mockCredential = {
  id: 'cred-uuid',
  txHash: 'tx-hash-123',
  courseId: 'course-uuid',
  userId: 'user-uuid',
  stellarPublicKey: 'GABC...',
  issuedAt: new Date('2024-01-01'),
  course: { id: 'course-uuid', title: 'Blockchain 101' },
  user: { id: 'user-uuid', email: 'alice@example.com' },
};

const mockCredentialRepo = {
  findOne: jest.fn().mockResolvedValue(mockCredential),
};

const mockStellarService = {
  verifyTransaction: jest.fn().mockResolvedValue({
    verified: true,
    hash: 'tx-hash-123',
    ledger: 12345,
    createdAt: '2024-01-01T00:00:00Z',
  }),
};

const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockResponse = () => {
  const res: any = {};
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('PublicCredentialVerificationController', () => {
  let controller: PublicCredentialVerificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCredentialVerificationController],
      providers: [
        { provide: getRepositoryToken(Credential), useValue: mockCredentialRepo },
        { provide: StellarService, useValue: mockStellarService },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    controller = module.get<PublicCredentialVerificationController>(
      PublicCredentialVerificationController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('verifyById', () => {
    it('returns verification result for valid credential', async () => {
      const result = await controller.verifyById('cred-uuid');
      expect(result).toHaveProperty('credentialId', 'cred-uuid');
      expect(result).toHaveProperty('status', 'valid');
      expect(result).toHaveProperty('issuer', 'Brain-Storm');
      expect(result).toHaveProperty('txHash', 'tx-hash-123');
      expect(result.onChain).toHaveProperty('verified', true);
    });

    it('throws NotFoundException for unknown credential', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce(null);
      await expect(controller.verifyById('unknown')).rejects.toThrow(NotFoundException);
    });

    it('returns unverified status when stellar tx not found', async () => {
      mockStellarService.verifyTransaction.mockResolvedValueOnce({ verified: false, hash: 'tx-hash-123' });
      const result = await controller.verifyById('cred-uuid');
      expect(result.status).toBe('unverified');
    });

    it('uses cache on second call', async () => {
      const cachedResult = { credentialId: 'cred-uuid', status: 'valid', cached: true };
      mockCache.get.mockResolvedValueOnce(cachedResult);
      const result = await controller.verifyById('cred-uuid');
      expect(result).toEqual(cachedResult);
      expect(mockCredentialRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('verifyByHash', () => {
    it('returns verification result for valid tx hash', async () => {
      const result = await controller.verifyByHash('tx-hash-123');
      expect(result).toHaveProperty('txHash', 'tx-hash-123');
      expect(result).toHaveProperty('status');
    });
  });

  describe('getWidget', () => {
    it('returns JS snippet with valid badge color for valid credential', async () => {
      const res = mockResponse();
      await controller.getWidget('cred-uuid', res);
      const js: string = res.send.mock.calls[0][0];
      expect(js).toContain('Brain-Storm Verified Credential');
      expect(js).toContain('22c55e'); // green for valid
      expect(js).toContain('cred-uuid');
    });

    it('returns red badge for not-found credential', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce(null);
      const res = mockResponse();
      await controller.getWidget('bad-id', res);
      const js: string = res.send.mock.calls[0][0];
      expect(js).toContain('ef4444'); // red for invalid
    });
  });

  describe('getBadge', () => {
    it('returns HTML with green badge for valid credential', async () => {
      const res = mockResponse();
      await controller.getBadge('cred-uuid', res);
      const html: string = res.send.mock.calls[0][0];
      expect(html).toContain('22c55e');
      expect(html).toContain('Brain-Storm Verified');
    });

    it('returns HTML with red badge for invalid credential', async () => {
      mockCredentialRepo.findOne.mockResolvedValueOnce(null);
      const res = mockResponse();
      await controller.getBadge('bad-id', res);
      const html: string = res.send.mock.calls[0][0];
      expect(html).toContain('ef4444');
    });
  });
});
