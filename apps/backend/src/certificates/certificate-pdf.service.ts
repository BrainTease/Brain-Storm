import { Injectable } from '@nestjs/common';
import { Certificate } from './certificate.entity';

@Injectable()
export class CertificatePdfService {
  generate(certificate: Certificate): Buffer {
    const recipient =
      (certificate.user as any)?.username ||
      (certificate.user as any)?.email ||
      certificate.userId;
    const courseTitle = (certificate.course as any)?.title || certificate.courseId;
    const issuedAt = certificate.issuedAt.toISOString().slice(0, 10);

    const lines = [
      { size: 26, x: 140, y: 730, text: 'Certificate of Completion' },
      { size: 14, x: 72, y: 670, text: 'This certifies that' },
      { size: 22, x: 72, y: 635, text: recipient },
      { size: 14, x: 72, y: 595, text: 'has successfully completed the course' },
      { size: 20, x: 72, y: 560, text: courseTitle },
      { size: 12, x: 72, y: 500, text: `Issued: ${issuedAt}` },
      { size: 12, x: 72, y: 478, text: `Certificate ID: ${certificate.id}` },
      { size: 12, x: 72, y: 456, text: `Hash: ${certificate.certificateHash}` },
      {
        size: 10,
        x: 72,
        y: 415,
        text: `brain-storm://certificates/${certificate.id}/verify`,
      },
    ];

    const stream = lines
      .map(
        ({ size, x, y, text }) =>
          `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${this.escape(text)}) Tj ET`,
      )
      .join('\n');

    return this.buildPdf(stream);
  }

  private buildPdf(content: string): Buffer {
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];

    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${obj}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }

  private escape(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
