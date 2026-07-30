/**
 * #807 — Generates a PDF certificate for the `credentials` domain.
 *
 * Delegates all raw PDF generation to `PdfBuilderService` (common/services)
 * so this class contains only domain-specific line layout, not PDF mechanics.
 */
import { Injectable } from '@nestjs/common';
import { Credential } from './credential.entity';
import { PdfBuilderService } from '../common/services/pdf-builder.service';

@Injectable()
export class CertificatePdfService {
  constructor(private readonly pdfBuilder: PdfBuilderService) {}

  generateCertificatePdf(credential: Credential): Buffer {
    const recipient =
      credential.user?.username || credential.user?.email || credential.userId;
    const courseTitle = credential.course?.title || credential.courseId;
    const issuedAt = credential.issuedAt.toISOString().slice(0, 10);
    const verificationRef = credential.txHash || credential.id;

    return this.pdfBuilder.build([
      { size: 26, x: 140, y: 730, text: 'Certificate of Completion' },
      { size: 14, x: 72, y: 670, text: 'This certifies that' },
      { size: 22, x: 72, y: 635, text: recipient },
      { size: 14, x: 72, y: 595, text: 'has successfully completed the course' },
      { size: 20, x: 72, y: 560, text: courseTitle },
      { size: 12, x: 72, y: 500, text: `Issued: ${issuedAt}` },
      { size: 12, x: 72, y: 478, text: `Credential ID: ${credential.id}` },
      { size: 12, x: 72, y: 456, text: `Verification Ref: ${verificationRef}` },
      { size: 12, x: 72, y: 415, text: 'Scan target / verify payload:' },
      { size: 10, x: 72, y: 392, text: `brain-storm://credentials/${credential.id}/verify` },
    ]);
  }
}
