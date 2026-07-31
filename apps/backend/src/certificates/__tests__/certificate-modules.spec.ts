/**
 * Unit tests for #808 — Modularize certificate-issuance workflow
 *
 * Covers:
 *  - CertificateValidationService: enrollment/completion guards
 *  - CertificateMintingService: Stellar minting success + failure branches
 *  - CertificatesService: orchestration via the two new sub-services
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificateValidationService } from '../certificate-validation.service';
import { CertificateMintingService } from '../certificate-minting.service';
import { CertificatesService } from '../certificates.service';
import type { Certificate } from '../certificate.entity';
import type { Enrollment } from '../../enrollments/enrollment.entity';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const COURSE_ID = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
const CERT_ID = 'cert-001';
const STELLAR_KEY = 'GABC...XYZ';

function makeEnrollment(overrides: Partial<Enrollment> = {}): Partial<Enrollment> {
  return {
    id: 'enroll-1',
    userId: USER_ID,
    courseId: COURSE_ID,
    completedAt: new Date('2025-01-01T00:00:00Z'),
    user: { stellarPublicKey: STELLAR_KEY } as any,
    ...overrides,
  };
}

function makeCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: CERT_ID,
    userId: USER_ID,
    courseId: COURSE_ID,
    certificateHash: 'hash-abc',
    status: 'pending',
    stellarTransactionId: null,
    issuedAt: new Date(),
    user: null,
    course: null,
    ipfsHash: null,
    ...overrides,
  } as Certificate;
}

// ─── CertificateValidationService ────────────────────────────────────────────

describe('CertificateValidationService', () => {
  let service: CertificateValidationService;
  const mockEnrollmentsRepo = { findOne: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CertificateValidationService(mockEnrollmentsRepo as any);
  });

  it('returns the enrollment when the user has completed the course', async () => {
    const enrollment = makeEnrollment();
    mockEnrollmentsRepo.findOne.mockResolvedValue(enrollment);

    const result = await service.validate(USER_ID, COURSE_ID);

    expect(result.enrollment).toEqual(enrollment);
    expect(mockEnrollmentsRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, courseId: COURSE_ID } }),
    );
  });

  it('throws BadRequestException when enrollment is not found', async () => {
    mockEnrollmentsRepo.findOne.mockResolvedValue(null);

    await expect(service.validate(USER_ID, COURSE_ID)).rejects.toThrow(BadRequestException);
    await expect(service.validate(USER_ID, COURSE_ID)).rejects.toThrow(
      'Enrollment not found for this user and course',
    );
  });

  it('throws BadRequestException when the course has not been completed', async () => {
    const enrollment = makeEnrollment({ completedAt: null });
    mockEnrollmentsRepo.findOne.mockResolvedValue(enrollment);

    await expect(service.validate(USER_ID, COURSE_ID)).rejects.toThrow(BadRequestException);
    await expect(service.validate(USER_ID, COURSE_ID)).rejects.toThrow(
      'Course has not been completed yet',
    );
  });

  it('loads user and course relations', async () => {
    const enrollment = makeEnrollment();
    mockEnrollmentsRepo.findOne.mockResolvedValue(enrollment);

    await service.validate(USER_ID, COURSE_ID);

    expect(mockEnrollmentsRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ relations: ['user', 'course'] }),
    );
  });
});

// ─── CertificateMintingService ────────────────────────────────────────────────

describe('CertificateMintingService', () => {
  let service: CertificateMintingService;
  const mockCertRepo = { save: jest.fn() };
  const mockStellarService = { issueCredential: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CertificateMintingService(
      mockCertRepo as any,
      mockStellarService as any,
    );
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  it('mints the certificate on Stellar and returns it with minted status', async () => {
    const cert = makeCertificate();
    const mintedCert = { ...cert, status: 'minted', stellarTransactionId: 'tx-123' } as Certificate;
    mockStellarService.issueCredential.mockResolvedValue('tx-123');
    mockCertRepo.save.mockResolvedValue(mintedCert);

    const result = await service.mint(cert, STELLAR_KEY);

    expect(mockStellarService.issueCredential).toHaveBeenCalledWith(STELLAR_KEY, COURSE_ID);
    expect(result.status).toBe('minted');
    expect(result.stellarTransactionId).toBe('tx-123');
  });

  it('returns the certificate unchanged when no Stellar public key is provided', async () => {
    const cert = makeCertificate();

    const result = await service.mint(cert, undefined);

    expect(mockStellarService.issueCredential).not.toHaveBeenCalled();
    expect(result).toEqual(cert);
  });

  it('returns the certificate in pending status when Stellar throws', async () => {
    const cert = makeCertificate();
    mockStellarService.issueCredential.mockRejectedValue(new Error('Network error'));

    const result = await service.mint(cert, STELLAR_KEY);

    // Minting failed — stays pending, no re-throw
    expect(result.status).toBe('pending');
    expect(mockCertRepo.save).not.toHaveBeenCalled();
  });
});

// ─── CertificatesService (orchestrator) ──────────────────────────────────────

describe('CertificatesService', () => {
  let service: CertificatesService;
  const mockCertRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const mockStellarService = { issueCredential: jest.fn() };
  const mockValidationService = { validate: jest.fn() };
  const mockMintingService = { mint: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CertificatesService(
      mockCertRepo as any,
      mockStellarService as any,
      mockValidationService as any,
      mockMintingService as any,
    );
  });

  describe('issueCertificate', () => {
    it('calls validate, saves certificate, then mints', async () => {
      const enrollment = makeEnrollment();
      const cert = makeCertificate();

      mockValidationService.validate.mockResolvedValue({ enrollment });
      mockCertRepo.findOne.mockResolvedValue(null); // no duplicate
      mockCertRepo.create.mockReturnValue(cert);
      mockCertRepo.save.mockResolvedValue(cert);
      mockMintingService.mint.mockResolvedValue({ ...cert, status: 'minted' });

      const result = await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });

      expect(mockValidationService.validate).toHaveBeenCalledWith(USER_ID, COURSE_ID);
      expect(mockCertRepo.save).toHaveBeenCalled();
      expect(mockMintingService.mint).toHaveBeenCalled();
      expect(result.status).toBe('minted');
    });

    it('throws BadRequestException if certificate already exists', async () => {
      const enrollment = makeEnrollment();
      mockValidationService.validate.mockResolvedValue({ enrollment });
      mockCertRepo.findOne.mockResolvedValue(makeCertificate()); // duplicate

      await expect(
        service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID }),
      ).rejects.toThrow('Certificate already issued for this course');
    });

    it('propagates BadRequestException from validation service', async () => {
      mockValidationService.validate.mockRejectedValue(
        new BadRequestException('Course has not been completed yet'),
      );

      await expect(
        service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID }),
      ).rejects.toThrow('Course has not been completed yet');
    });
  });

  describe('getCertificate', () => {
    it('returns the certificate when found', async () => {
      const cert = makeCertificate();
      mockCertRepo.findOne.mockResolvedValue(cert);

      const result = await service.getCertificate(CERT_ID);
      expect(result).toEqual(cert);
    });

    it('throws NotFoundException when certificate not found', async () => {
      mockCertRepo.findOne.mockResolvedValue(null);

      await expect(service.getCertificate('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserCertificates', () => {
    it('returns an array of certificates for the user', async () => {
      const certs = [makeCertificate(), makeCertificate({ id: 'cert-002' })];
      mockCertRepo.find.mockResolvedValue(certs);

      const result = await service.getUserCertificates(USER_ID);
      expect(result).toHaveLength(2);
    });
  });

  describe('verifyCertificate', () => {
    it('returns valid: true for a minted certificate', async () => {
      mockCertRepo.findOne.mockResolvedValue(makeCertificate({ status: 'minted' }));

      const result = await service.verifyCertificate('hash-abc');
      expect(result.valid).toBe(true);
      expect(result.certificate).toBeDefined();
    });

    it('returns valid: false when the hash is not found', async () => {
      mockCertRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyCertificate('unknown-hash');
      expect(result.valid).toBe(false);
      expect(result.certificate).toBeUndefined();
    });

    it('returns valid: false for a pending certificate', async () => {
      mockCertRepo.findOne.mockResolvedValue(makeCertificate({ status: 'pending' }));

      const result = await service.verifyCertificate('hash-abc');
      expect(result.valid).toBe(false);
    });
  });
});
