import { Controller, Delete, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GdprRetentionService } from './gdpr-retention.service';

@ApiTags('gdpr')
@Controller('gdpr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GdprController {
  constructor(private readonly gdpr: GdprRetentionService) {}

  /** Request data export (GDPR Article 20) */
  @Get('export')
  export(@Req() req: any) {
    return this.gdpr.exportUserData(req.user.id);
  }

  /** Request account deletion (GDPR Article 17) */
  @Delete('delete')
  async delete(@Req() req: any) {
    await this.gdpr.softDeleteUser(req.user.id);
    return { message: 'Account scheduled for deletion. You have 30 days to recover it.' };
  }

  /** Admin: recover a soft-deleted account */
  @Post('recover/:id')
  recover(@Param('id') id: string) {
    return this.gdpr.recoverUser(id);
  }

  /** Admin: manually trigger purge job */
  @Post('purge')
  purge() {
    return this.gdpr.purgeExpiredUsers().then((count) => ({ purged: count }));
  }
}
