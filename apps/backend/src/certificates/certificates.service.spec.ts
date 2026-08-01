import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificateValidationService } from './certificate-validation.service';
import { CertificateMintingService } from './certificate-minting.service';

// ─────────────────────────────────────────────────────────────────────────────
// Mock factories
// ─────────────────────────────────────────────────────────────────────────────

const mockCertRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

const mockEnrollmentRepo = () => ({
  findOne: jest.fn(),
});

const mockStellarService = () => ({
  issueCredential: jest.fn(),
});

/**
 * Build a CertificatesService wired with the new modular sub-services.
 * CertificateValidationService and CertificateMintingService are created
 * with their own repos/services so all three layers can be exercised.
 */
function buildService() {
  const certRepo = mockCertRepo();
  const enrollmentRepo = mockEnrollmentRepo();
  const stellarService = mockStellarService();

  // Real sub-service instances backed by mocks so the full flow runs
  const validationService = new CertificateValidationService(enrollmentRepo as any);
  const mintingService = new CertificateMintingService(certRepo as any, stellarService as any);
  jest.spyOn((mintingService as any).logger, 'log').mockImplementation(() => undefined);
  jest.spyOn((mintingService as any).logger, 'warn').mockImplementation(() => undefined);
  jest.spyOn((mintingService as any).logger, 'error').mockImplementation(() => undefined);

  const service = new CertificatesService(
    certRepo as any,
    enrollmentRepo as any,
    stellarService as any
    stellarService as any,
    validationService,
    mintingService,
  );
  return { service, certRepo, enrollmentRepo, stellarService };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

const VALID_UUID_1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = 'b1ffcd00-0d1c-5fg9-cc7e-7cc0ce491b22';

describe('CertificatesService', () => {
  describe('issueCertificate', () => {
    it('throws BadRequestException when enrollment does not exist', async () => {
      const { service, enrollmentRepo } = buildService();
      enrollmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.issueCertificate({ userId: VALID_UUID_1, courseId: VALID_UUID_2 })
      ).rejects.toThrow(new BadRequestException('Enrollment not found for this user and course'));
    });

    it('throws BadRequestException when course not yet completed', async () => {
      const { service, enrollmentRepo } = buildService();
      enrollmentRepo.findOne.mockResolvedValue({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        completedAt: null,
        user: null,
      });

      await expect(
        service.issueCertificate({ userId: VALID_UUID_1, courseId: VALID_UUID_2 })
      ).rejects.toThrow(new BadRequestException('Course has not been completed yet'));
    });

    it('throws BadRequestException when certificate already issued', async () => {
      const { service, enrollmentRepo, certRepo } = buildService();
      enrollmentRepo.findOne.mockResolvedValue({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        completedAt: new Date(),
        user: { stellarPublicKey: null },
      });
      certRepo.findOne.mockResolvedValue({ id: 'existing-cert' });

      await expect(
        service.issueCertificate({ userId: VALID_UUID_1, courseId: VALID_UUID_2 })
      ).rejects.toThrow(new BadRequestException('Certificate already issued for this course'));
    });

    it('creates and saves a certificate when enrollment is complete and no duplicate exists', async () => {
      const { service, enrollmentRepo, certRepo } = buildService();
      enrollmentRepo.findOne.mockResolvedValue({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        completedAt: new Date(),
        user: { stellarPublicKey: null },
      });
      certRepo.findOne.mockResolvedValue(null);

      const newCert = {
        id: 'cert-uuid',
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        certificateHash: 'hash123',
        status: 'pending',
      };
      certRepo.create.mockReturnValue(newCert);
      certRepo.save.mockResolvedValue(newCert);

      const result = await service.issueCertificate({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
      });

      expect(certRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: VALID_UUID_1, courseId: VALID_UUID_2, status: 'pending' })
      );
      expect(certRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newCert);
    });

    it('updates certificate to minted when Stellar minting succeeds', async () => {
      const { service, enrollmentRepo, certRepo, stellarService } = buildService();
      enrollmentRepo.findOne.mockResolvedValue({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        completedAt: new Date(),
        user: { stellarPublicKey: 'GABC123' },
      });
      certRepo.findOne.mockResolvedValue(null);

      const savedCert = { id: 'cert-uuid', courseId: VALID_UUID_2, userId: VALID_UUID_1, status: 'pending', stellarTransactionId: undefined } as any;
      certRepo.create.mockReturnValue(savedCert);
      certRepo.save.mockResolvedValue(savedCert);
      stellarService.issueCredential.mockResolvedValue('TX_HASH_ABC');

      await service.issueCertificate({ userId: VALID_UUID_1, courseId: VALID_UUID_2 });

      expect(stellarService.issueCredential).toHaveBeenCalledWith('GABC123', VALID_UUID_2);
      expect(certRepo.save).toHaveBeenCalledTimes(2);
      expect(savedCert.status).toBe('minted');
      expect(savedCert.stellarTransactionId).toBe('TX_HASH_ABC');
    });

    it('continues without throwing when Stellar minting fails', async () => {
      const { service, enrollmentRepo, certRepo, stellarService } = buildService();
      enrollmentRepo.findOne.mockResolvedValue({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        completedAt: new Date(),
        user: { stellarPublicKey: 'GABC123' },
      });
      certRepo.findOne.mockResolvedValue(null);

      const savedCert = { id: 'cert-uuid', status: 'pending' } as any;
      certRepo.create.mockReturnValue(savedCert);
      certRepo.save.mockResolvedValue(savedCert);
      stellarService.issueCredential.mockRejectedValue(new Error('Horizon timeout'));

      // Should resolve (not throw) even though Stellar failed
      await expect(
        service.issueCertificate({ userId: VALID_UUID_1, courseId: VALID_UUID_2 })
      ).resolves.toBeDefined();
    });

    it('skips Stellar minting when user has no stellarPublicKey', async () => {
      const { service, enrollmentRepo, certRepo, stellarService } = buildService();
      enrollmentRepo.findOne.mockResolvedValue({
        userId: VALID_UUID_1,
        courseId: VALID_UUID_2,
        completedAt: new Date(),
        user: { stellarPublicKey: undefined },
      });
      certRepo.findOne.mockResolvedValue(null);

      const savedCert = { id: 'cert-uuid', status: 'pending' } as any;
      certRepo.create.mockReturnValue(savedCert);
      certRepo.save.mockResolvedValue(savedCert);

      await service.issueCertificate({ userId: VALID_UUID_1, courseId: VALID_UUID_2 });

      expect(stellarService.issueCredential).not.toHaveBeenCalled();
    });
  });

  describe('getCertificate', () => {
    it('returns the certificate when found', async () => {
      const { service, certRepo } = buildService();
      const cert = { id: 'cert-uuid' };
      certRepo.findOne.mockResolvedValue(cert);

      await expect(service.getCertificate('cert-uuid')).resolves.toEqual(cert);
    });

    it('throws NotFoundException when certificate does not exist', async () => {
      const { service, certRepo } = buildService();
      certRepo.findOne.mockResolvedValue(null);

      await expect(service.getCertificate('missing')).rejects.toThrow(
        new NotFoundException('Certificate not found')
      );
    });
  });

  describe('verifyCertificate', () => {
    it('returns { valid: false } when hash is not found', async () => {
      const { service, certRepo } = buildService();
      certRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyCertificate('badhash')).resolves.toEqual({ valid: false });
    });

    it('returns { valid: true, certificate } for a minted certificate', async () => {
      const { service, certRepo } = buildService();
      const cert = { id: 'c1', certificateHash: 'h1', status: 'minted' };
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate('h1');
      expect(result.valid).toBe(true);
      expect(result.certificate).toEqual(cert);
    });

    it('returns { valid: true, certificate } for a verified certificate', async () => {
      const { service, certRepo } = buildService();
      const cert = { id: 'c1', certificateHash: 'h1', status: 'verified' };
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate('h1');
      expect(result.valid).toBe(true);
    });

    it('returns { valid: false, certificate } for a pending certificate', async () => {
      const { service, certRepo } = buildService();
      const cert = { id: 'c1', certificateHash: 'h1', status: 'pending' };
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate('h1');
      expect(result.valid).toBe(false);
      expect(result.certificate).toEqual(cert);
    });

    it('returns { valid: false, certificate } for a revoked certificate', async () => {
      const { service, certRepo } = buildService();
      const cert = { id: 'c1', certificateHash: 'h1', status: 'revoked' };
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate('h1');
      expect(result.valid).toBe(false);
    });
  });

  describe('getUserCertificates', () => {
    it('returns all certificates for a user', async () => {
      const { service, certRepo } = buildService();
      const certs = [{ id: 'c1' }, { id: 'c2' }];
      certRepo.find.mockResolvedValue(certs);

      await expect(service.getUserCertificates(VALID_UUID_1)).resolves.toEqual(certs);
      expect(certRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: VALID_UUID_1 } })
      );
    });

    it('returns empty array when user has no certificates', async () => {
      const { service, certRepo } = buildService();
      certRepo.find.mockResolvedValue([]);

      await expect(service.getUserCertificates(VALID_UUID_1)).resolves.toEqual([]);
    });
  });
});
