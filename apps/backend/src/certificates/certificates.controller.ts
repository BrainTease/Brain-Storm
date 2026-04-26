import { Controller, Post, Get, Param, UseGuards, Body } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/certificates')
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Post(':userId/:courseId')
  @UseGuards(JwtAuthGuard)
  async issueCertificate(@Param('userId') userId: string, @Param('courseId') courseId: string) {
    return this.certificatesService.issueCertificate(userId, courseId);
  }

  @Get(':id')
  async getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserCertificates(@Param('userId') userId: string) {
    return this.certificatesService.getUserCertificates(userId);
  }

  @Post('verify')
  async verifyCertificate(@Body() body: { certificateHash: string }) {
    return this.certificatesService.verifyCertificate(body.certificateHash);
  }
}
