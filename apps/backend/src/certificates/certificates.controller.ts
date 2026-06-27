import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Header,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CertificatesService } from './certificates.service';
import { CertificatePdfService } from './certificate-pdf.service';
import { IssueCertificateDto } from './dto/issue-certificate.dto';

@ApiTags('certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/certificates')
export class CertificatesController {
  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly pdfService: CertificatePdfService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Issue a certificate upon course completion' })
  @ApiResponse({ status: 201, description: 'Certificate issued successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or already issued' })
  issueCertificate(@Body() dto: IssueCertificateDto) {
    return this.certificatesService.issueCertificate(dto);
  }

  // Static routes must come before parameterized routes
  @Post('verify')
  @ApiOperation({ summary: 'Verify a certificate by its hash (POST)' })
  @ApiBody({ schema: { example: { certificateHash: 'abc123...' } } })
  @ApiResponse({ status: 200, description: 'Verification result' })
  verifyCertificateByHash(@Body() body: { certificateHash: string }) {
    return this.certificatesService.verifyCertificate(body.certificateHash);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all certificates for a user' })
  @ApiResponse({ status: 200, description: 'List of certificates' })
  getUserCertificates(@Param('userId') userId: string) {
    return this.certificatesService.getUserCertificates(userId);
  }

  @Get('verify/:hash')
  @ApiOperation({ summary: 'Verify a certificate by its hash (GET)' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  verifyCertificate(@Param('hash') hash: string) {
    return this.certificatesService.verifyCertificate(hash);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Download certificate as PDF' })
  @ApiResponse({ status: 200, description: 'PDF certificate' })
  async downloadPdf(@Param('id') id: string) {
    const cert = await this.certificatesService.getCertificate(id);
    const pdf = this.pdfService.generate(cert);
    return new StreamableFile(pdf, {
      disposition: `attachment; filename="certificate-${id}.pdf"`,
      type: 'application/pdf',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a certificate by ID' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }
}
