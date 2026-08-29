/**
 * #807 — Shared PDF builder.
 *
 * Both `credentials/certificate-pdf.service.ts` and
 * `certificates/certificate-pdf.service.ts` previously contained identical
 * raw-PDF generation logic.  This class centralises that logic so neither
 * module needs to maintain its own copy.
 */
import { Injectable } from '@nestjs/common';

export interface PdfLine {
  size: number;
  x: number;
  y: number;
  text: string;
}

@Injectable()
export class PdfBuilderService {
  /**
   * Build a minimal PDF/1.4 document from an ordered list of text lines.
   * Each line specifies font size, x/y position (in points from bottom-left),
   * and the text to render using Helvetica.
   */
  build(lines: PdfLine[]): Buffer {
    const stream = lines
      .map(
        ({ size, x, y, text }) =>
          `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${this.escape(text)}) Tj ET`
      )
      .join('\n');

    return this.buildPdf(stream);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

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

  /** Escape special PDF string characters. */
  escape(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
