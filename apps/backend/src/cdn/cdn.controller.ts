import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CdnService } from './cdn.service';
import { ContentType } from './cdn-asset.entity';

@Controller('v1/cdn')
@UseGuards(JwtAuthGuard)
export class CdnController {
  constructor(private cdnService: CdnService) {}

  @Post('upload')
  async uploadAsset(@Body() data: any) {
    return this.cdnService.uploadAsset(
      data.lessonId,
      data.fileName,
      data.contentType as ContentType,
      data.fileSize,
    );
  }

  @Get(':assetId/signed-url')
  async getSignedUrl(
    @Param('assetId') assetId: string,
    @Body() data?: any,
  ) {
    const expirationMinutes = data?.expirationMinutes || 60;
    const signedUrl = this.cdnService.generateSignedUrl(assetId, expirationMinutes);
    return { signedUrl };
  }

  @Post(':assetId/transcode')
  async markTranscoded(
    @Param('assetId') assetId: string,
    @Body() data: any,
  ) {
    return this.cdnService.markAsTranscoded(
      assetId,
      data.bitrates,
      data.thumbnailUrl,
    );
  }

  @Post(':assetId/invalidate')
  async invalidateCache(@Param('assetId') assetId: string) {
    return this.cdnService.invalidateCache(assetId);
  }

  @Get(':assetId')
  async getAsset(@Param('assetId') assetId: string) {
    return this.cdnService.getAsset(assetId);
  }

  @Get('lesson/:lessonId')
  async getLessonAssets(@Param('lessonId') lessonId: string) {
    return this.cdnService.getLessonAssets(lessonId);
  }
}
