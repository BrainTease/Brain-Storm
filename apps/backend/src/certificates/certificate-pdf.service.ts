/**
 * #807 — Generates a PDF certificate for the `certificates` domain.
 *
 * Delegates all raw PDF generation to `PdfBuilderService` (common/services)
 * so this class contains only domain-specific line layout, not PDF mechanics.
 */
import { Injectable } from '@nestjs/common';
import { Certificate } from './certificate.entity';
import { PdfBuilderService } from '../common/services/pdf-builder.service';

@Injectable()
export class CertificatePdfService {
  constructor(private readonly pdfBuilder: PdfBuilderService) {}

  generate(certificate: Certificate): Buffer {
    const recipient =
      (certificate.user as any)?.username ||
      (certificate.user as any)?.email ||
      certificate.userId;
    const courseTitle = (certificate.course as any)?.title || certificate.courseId;
    const issuedAt = certificate.issuedAt.toISOString().slice(0, 10);

    return this.pdfBuilder.build([
      { size: 26, x: 140, y: 730, text: 'Certificate of Completion' },
      { size: 14, x: 72, y: 670, text: 'This certifies that' },
      { size: 22, x: 72, y: 635, text: recipient },
      { size: 14, x: 72, y: 595, text: 'has successfully completed the course' },
      { size: 20, x: 72, y: 560, text: courseTitle },
      { size: 12, x: 72, y: 500, text: `Issued: ${issuedAt}` },
      { size: 12, x: 72, y: 478, text: `Certificate ID: ${certificate.id}` },
      { size: 12, x: 72, y: 456, text: `Hash: ${certificate.certificateHash}` },
      { size: 10, x: 72, y: 415, text: `brain-storm://certificates/${certificate.id}/verify` },
    ]);
  }
}
