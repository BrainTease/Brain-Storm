import {
  Controller,
  Delete,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportService } from './export.service';

@ApiTags('privacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/privacy')
export class PrivacyController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * GET /v1/privacy/export
   * Returns a ZIP archive of all off-chain personal data for the current user.
   * Rate-limited to 3 requests per 24 hours per user.
   */
  @Get('export')
  @Throttle({ default: { limit: 3, ttl: 86_400_000 } })
  @ApiOperation({ summary: 'Export all off-chain personal data (GDPR Art. 20)' })
  @ApiResponse({ status: 200, description: 'ZIP archive stream' })
  async exportData(@Req() req: Request & { user: { id: string } }, @Res() res: Response) {
    const buffer = await this.exportService.exportUserData(
      req.user.id,
      req.ip,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="my-data-${Date.now()}.zip"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /**
   * DELETE /v1/privacy/account
   * Erases all off-chain PII. Provides a caveat about immutable on-chain data.
   * Rate-limited to 1 request per 24 hours.
   */
  @Delete('account')
  @Throttle({ default: { limit: 1, ttl: 86_400_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete account and erase off-chain PII (GDPR Art. 17)' })
  @ApiResponse({ status: 200, description: 'Account deleted; on-chain caveat returned' })
  deleteAccount(@Req() req: Request & { user: { id: string } }) {
    return this.exportService.deleteAccount(req.user.id, req.ip);
  }
}
