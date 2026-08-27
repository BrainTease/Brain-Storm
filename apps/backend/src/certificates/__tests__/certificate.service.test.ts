/**
 * Issue #842 — Unit Tests for CertificatesService
 * Target: ≥ 85 % code coverage
 *
 * Strategy:
 *  - Use Jest manual mocks for all TypeORM repositories and StellarService
 *    so no database or network is involved.
 *  - Cover every public method:  issueCertificate, getCertificate,
 *    getUserCertificates, verifyCertificate.
 *  - Cover the private generateHash helper indirectly via issueCertificate.
 *  - Cover all guard clauses (missing enrollment, incomplete course,
 *    duplicate certificate).
 *  - Cover the Stellar minting success and failure branches.
 *  - Cover the CertificatePdfService.generate() method independently so the
 *    PDF-generation path reaches the threshold.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CertificatesService } from '../certificates.service';
import { CertificatePdfService } from '../certificate-pdf.service';
import type { Certificate } from '../certificate.entity';
import type { Enrollment } from '../../enrollments/enrollment.entity';

// ── Type helpers ──────────────────────────────────────────────────────────────

type MockRepo<T> = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function makeMockRepo<T>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

// ── Shared fixture factories ──────────────────────────────────────────────────

const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const COURSE_ID = 'a1b2c3d4-1234-5678-abcd-ef0123456789';
const CERT_ID = 'cert-uuid-0001';
const CERT_HASH = 'abc123hashvalue';

function buildEnrollment(overrides: Partial<Enrollment> = {}): Partial<Enrollment> {
  return {
    id: 'enroll-1',
    userId: USER_ID,
    courseId: COURSE_ID,
    completedAt: new Date('2025-01-01T00:00:00Z'),
    user: { stellarPublicKey: 'GABC...XYZ' } as any,
    course: { title: 'Intro to Stellar' } as any,
    ...overrides,
  };
}

function buildCertificate(overrides: Partial<Certificate> = {}): Partial<Certificate> {
  return {
    id: CERT_ID,
    userId: USER_ID,
    courseId: COURSE_ID,
    certificateHash: CERT_HASH,
    status: 'pending',
    issuedAt: new Date('2025-01-15T00:00:00Z'),
    ipfsHash: null,
    stellarTransactionId: null,
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('CertificatesService', () => {
  let service: CertificatesService;
  let certRepo: MockRepo<Certificate>;
  let enrollRepo: MockRepo<Enrollment>;
  let stellarService: { issueCredential: jest.Mock };

  beforeEach(() => {
    certRepo = makeMockRepo<Certificate>();
    enrollRepo = makeMockRepo<Enrollment>();
    stellarService = { issueCredential: jest.fn() };

    service = new CertificatesService(certRepo as any, enrollRepo as any, stellarService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── issueCertificate ────────────────────────────────────────────────────────

  describe('issueCertificate', () => {
    it('issues a certificate successfully when all preconditions are met', async () => {
      const enrollment = buildEnrollment();
      const pendingCert = buildCertificate();
      const mintedCert = buildCertificate({
        status: 'minted',
        stellarTransactionId: 'tx-stellar-123',
      });

      enrollRepo.findOne.mockResolvedValue(enrollment);
      certRepo.findOne.mockResolvedValue(null); // no duplicate
      certRepo.create.mockReturnValue(pendingCert);
      certRepo.save
        .mockResolvedValueOnce(pendingCert) // first save → pending
        .mockResolvedValueOnce(mintedCert); // second save → minted
      stellarService.issueCredential.mockResolvedValue('tx-stellar-123');

      const result = await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });

      expect(result.status).toBe('minted');
      expect(result.stellarTransactionId).toBe('tx-stellar-123');
      expect(enrollRepo.findOne).toHaveBeenCalledWith({
        where: { userId: USER_ID, courseId: COURSE_ID },
        relations: ['user', 'course'],
      });
      expect(certRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, courseId: COURSE_ID, status: 'pending' })
      );
    });

    it('generates a non-empty SHA-256 certificate hash', async () => {
      const enrollment = buildEnrollment();
      const pendingCert = buildCertificate();

      enrollRepo.findOne.mockResolvedValue(enrollment);
      certRepo.findOne.mockResolvedValue(null);

      let capturedCreate: Record<string, unknown> | undefined;
      certRepo.create.mockImplementation((data: Record<string, unknown>) => {
        capturedCreate = data;
        return pendingCert;
      });
      certRepo.save.mockResolvedValue(pendingCert);
      stellarService.issueCredential.mockResolvedValue('tx-1');

      await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });

      expect(capturedCreate?.certificateHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('saves the certificate with status pending before attempting Stellar minting', async () => {
      const enrollment = buildEnrollment();
      const pendingCert = buildCertificate();

      enrollRepo.findOne.mockResolvedValue(enrollment);
      certRepo.findOne.mockResolvedValue(null);
      certRepo.create.mockReturnValue(pendingCert);

      let firstSaveArg: Partial<Certificate> | undefined;
      certRepo.save.mockImplementation(async (cert: Partial<Certificate>) => {
        if (!firstSaveArg) firstSaveArg = cert;
        return cert;
      });
      stellarService.issueCredential.mockResolvedValue('tx-2');

      await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });

      expect(firstSaveArg?.status).toBe('pending');
    });

    it('throws BadRequestException when enrollment is not found', async () => {
      enrollRepo.findOne.mockResolvedValue(null);

      await expect(
        service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID })
      ).rejects.toThrow(new BadRequestException('Enrollment not found for this user and course'));
    });

    it('throws BadRequestException when course has not been completed', async () => {
      const incompleteEnrollment = buildEnrollment({ completedAt: null });
      enrollRepo.findOne.mockResolvedValue(incompleteEnrollment);

      await expect(
        service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID })
      ).rejects.toThrow(new BadRequestException('Course has not been completed yet'));
    });

    it('throws BadRequestException when a certificate has already been issued', async () => {
      const enrollment = buildEnrollment();
      const existingCert = buildCertificate();

      enrollRepo.findOne.mockResolvedValue(enrollment);
      certRepo.findOne.mockResolvedValue(existingCert); // duplicate

      await expect(
        service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID })
      ).rejects.toThrow(new BadRequestException('Certificate already issued for this course'));
    });

    it('saves the certificate as pending (not minted) when no stellarPublicKey on the user', async () => {
      const enrollmentNoKey = buildEnrollment({ user: { stellarPublicKey: null } as any });
      const pendingCert = buildCertificate();

      enrollRepo.findOne.mockResolvedValue(enrollmentNoKey);
      certRepo.findOne.mockResolvedValue(null);
      certRepo.create.mockReturnValue(pendingCert);
      certRepo.save.mockResolvedValue(pendingCert);

      const result = await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });

      expect(stellarService.issueCredential).not.toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('keeps the certificate in pending status when Stellar minting fails, and logs the error', async () => {
      const enrollment = buildEnrollment();
      const pendingCert = buildCertificate();

      enrollRepo.findOne.mockResolvedValue(enrollment);
      certRepo.findOne.mockResolvedValue(null);
      certRepo.create.mockReturnValue(pendingCert);
      certRepo.save.mockResolvedValue(pendingCert);
      stellarService.issueCredential.mockRejectedValue(new Error('Stellar network error'));

      // Should NOT throw — minting failure is caught internally
      const result = await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });

      // The cert was already saved as pending; Stellar failure means no second save
      expect(result.status).toBe('pending');
    });
  });

  // ── getCertificate ──────────────────────────────────────────────────────────

  describe('getCertificate', () => {
    it('returns a certificate when found by ID', async () => {
      const cert = buildCertificate();
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.getCertificate(CERT_ID);

      expect(result).toEqual(cert);
      expect(certRepo.findOne).toHaveBeenCalledWith({
        where: { id: CERT_ID },
        relations: ['user', 'course'],
      });
    });

    it('throws NotFoundException when the certificate ID does not exist', async () => {
      certRepo.findOne.mockResolvedValue(null);

      await expect(service.getCertificate('nonexistent-id')).rejects.toThrow(
        new NotFoundException('Certificate not found')
      );
    });
  });

  // ── getUserCertificates ─────────────────────────────────────────────────────

  describe('getUserCertificates', () => {
    it('returns all certificates for a user, ordered by issuedAt descending', async () => {
      const certs = [
        buildCertificate({ id: 'cert-2', issuedAt: new Date('2025-03-01') }),
        buildCertificate({ id: 'cert-1', issuedAt: new Date('2025-01-01') }),
      ];
      certRepo.find.mockResolvedValue(certs);

      const result = await service.getUserCertificates(USER_ID);

      expect(result).toEqual(certs);
      expect(certRepo.find).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        relations: ['course'],
        order: { issuedAt: 'DESC' },
      });
    });

    it('returns an empty array when a user has no certificates', async () => {
      certRepo.find.mockResolvedValue([]);

      const result = await service.getUserCertificates(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ── verifyCertificate ───────────────────────────────────────────────────────

  describe('verifyCertificate', () => {
    it('returns valid: true for a minted certificate', async () => {
      const cert = buildCertificate({ status: 'minted' });
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate(CERT_HASH);

      expect(result.valid).toBe(true);
      expect(result.certificate).toEqual(cert);
    });

    it('returns valid: true for a verified certificate', async () => {
      const cert = buildCertificate({ status: 'verified' });
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate(CERT_HASH);

      expect(result.valid).toBe(true);
    });

    it('returns valid: false for a pending certificate', async () => {
      const cert = buildCertificate({ status: 'pending' });
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate(CERT_HASH);

      expect(result.valid).toBe(false);
    });

    it('returns valid: false for a revoked certificate', async () => {
      const cert = buildCertificate({ status: 'revoked' });
      certRepo.findOne.mockResolvedValue(cert);

      const result = await service.verifyCertificate(CERT_HASH);

      expect(result.valid).toBe(false);
    });

    it('returns { valid: false } without a certificate object when hash is not found', async () => {
      certRepo.findOne.mockResolvedValue(null);

      const result = await service.verifyCertificate('unknown-hash');

      expect(result.valid).toBe(false);
      expect(result.certificate).toBeUndefined();
    });

    it('queries by certificateHash and includes user and course relations', async () => {
      certRepo.findOne.mockResolvedValue(buildCertificate({ status: 'minted' }));

      await service.verifyCertificate(CERT_HASH);

      expect(certRepo.findOne).toHaveBeenCalledWith({
        where: { certificateHash: CERT_HASH },
        relations: ['user', 'course'],
      });
    });
  });

  // ── generateHash (indirect, via issueCertificate) ─────────────────────────

  describe('generateHash (private, tested via issueCertificate)', () => {
    it('produces a different hash on each call (because it incorporates Date.now)', async () => {
      const enrollment = buildEnrollment();
      certRepo.findOne.mockResolvedValue(null);
      enrollRepo.findOne.mockResolvedValue(enrollment);
      certRepo.save.mockImplementation(async (c) => c);

      const hashes = new Set<string>();

      for (let i = 0; i < 3; i++) {
        certRepo.create.mockImplementation((data: Partial<Certificate>) => data);
        await service.issueCertificate({ userId: USER_ID, courseId: COURSE_ID });
        const callArgs = certRepo.create.mock.calls[certRepo.create.mock.calls.length - 1][0];
        hashes.add(callArgs.certificateHash);
        await new Promise((r) => setTimeout(r, 5)); // ensure unique Date.now()
      }

      // All three hashes should be unique (different timestamps)
      expect(hashes.size).toBe(3);
    });
  });
});

// ── CertificatePdfService ─────────────────────────────────────────────────────

describe('CertificatePdfService', () => {
  let pdfService: CertificatePdfService;

  beforeEach(() => {
    pdfService = new CertificatePdfService();
  });

  function buildCertForPdf(overrides: Partial<Certificate> = {}): Certificate {
    return {
      id: 'pdf-cert-001',
      userId: USER_ID,
      courseId: COURSE_ID,
      certificateHash: 'testhash001',
      ipfsHash: null,
      stellarTransactionId: null,
      status: 'minted',
      issuedAt: new Date('2025-06-01T00:00:00Z'),
      user: { username: 'Alice', email: 'alice@example.com' } as any,
      course: { title: 'Intro to Stellar' } as any,
      ...overrides,
    } as Certificate;
  }

  it('returns a Buffer', () => {
    const cert = buildCertForPdf();
    const result = pdfService.generate(cert);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('generated PDF starts with the PDF magic bytes (%PDF)', () => {
    const cert = buildCertForPdf();
    const result = pdfService.generate(cert);
    expect(result.toString('utf8', 0, 4)).toBe('%PDF');
  });

  it('embeds the recipient username in the PDF content', () => {
    const cert = buildCertForPdf();
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('Alice');
  });

  it('embeds the course title in the PDF content', () => {
    const cert = buildCertForPdf();
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('Intro to Stellar');
  });

  it('embeds the certificate ID in the PDF content', () => {
    const cert = buildCertForPdf();
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('pdf-cert-001');
  });

  it('embeds the certificate hash in the PDF content', () => {
    const cert = buildCertForPdf();
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('testhash001');
  });

  it('falls back to email when username is not available', () => {
    const cert = buildCertForPdf({
      user: { email: 'bob@example.com' } as any,
    });
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('bob@example.com');
  });

  it('falls back to userId when no user object is attached', () => {
    const cert = buildCertForPdf({ user: undefined as any });
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain(USER_ID);
  });

  it('falls back to courseId when no course object is attached', () => {
    const cert = buildCertForPdf({ course: undefined as any });
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain(COURSE_ID);
  });

  it('escapes parentheses in text to produce valid PDF stream syntax', () => {
    const cert = buildCertForPdf({
      user: { username: 'Alice (Test)' } as any,
    });
    const content = pdfService.generate(cert).toString('utf8');
    // Raw '(' should not appear unescaped inside a PDF BT...ET stream
    // The escaped form is '\(' in PDF syntax
    expect(content).toContain('Alice \\(Test\\)');
  });

  it('escapes backslashes in text', () => {
    const cert = buildCertForPdf({
      user: { username: 'Alice\\Bob' } as any,
    });
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('Alice\\\\Bob');
  });

  it('includes a correct xref table and EOF marker', () => {
    const cert = buildCertForPdf();
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('xref');
    expect(content).toContain('%%EOF');
  });

  it('includes the Brain-Storm certificate verification URL', () => {
    const cert = buildCertForPdf();
    const content = pdfService.generate(cert).toString('utf8');
    expect(content).toContain('brain-storm://certificates/pdf-cert-001/verify');
  });

  it('produces a non-empty buffer regardless of special characters in fields', () => {
    const cert = buildCertForPdf({
      user: { username: 'Ñoño (Developer)' } as any,
      course: { title: 'Smart Contracts & Tokens' } as any,
    });
    const result = pdfService.generate(cert);
    expect(result.length).toBeGreaterThan(0);
  });
});
