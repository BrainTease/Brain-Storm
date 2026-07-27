import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CdnAsset, ContentType } from './cdn-asset.entity';
import * as crypto from 'crypto';

@Injectable()
export class CdnService {
  private cdnProvider: string;
  private cdnDomain: string;
  private cdnAccessKey: string;
  private cdnSecretKey: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(CdnAsset) private assetRepo: Repository<CdnAsset>,
  ) {
    this.cdnProvider = this.configService.get('CDN_PROVIDER', 'cloudfront');
    this.cdnDomain = this.configService.get('CDN_DOMAIN');
    this.cdnAccessKey = this.configService.get('CDN_ACCESS_KEY');
    this.cdnSecretKey = this.configService.get('CDN_SECRET_KEY');
  }

  async uploadAsset(
    lessonId: string,
    fileName: string,
    contentType: ContentType,
    fileSize: number,
  ) {
    const cdnUrl = `${this.cdnDomain}/${lessonId}/${fileName}`;

    const asset = this.assetRepo.create({
      lessonId,
      fileName,
      contentType,
      fileSize,
      cdnUrl,
    });

    return this.assetRepo.save(asset);
  }

  generateSignedUrl(assetId: string, expirationMinutes: number = 60): string {
    const asset = this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    const expirationTime = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
    const stringToSign = `GET\n\n\n${expirationTime}\n${asset.cdnUrl}`;

    const signature = crypto
      .createHmac('sha1', this.cdnSecretKey)
      .update(stringToSign)
      .digest('base64');

    const encodedSignature = encodeURIComponent(signature);

    return `${asset.cdnUrl}?Expires=${expirationTime}&Signature=${encodedSignature}&Key-Pair-Id=${this.cdnAccessKey}`;
  }

  async markAsTranscoded(assetId: string, bitrates: string[], thumbnailUrl?: string) {
    return this.assetRepo.update(
      { id: assetId },
      {
        isTranscoded: true,
        availableBitrates: bitrates,
        thumbnailUrl,
      },
    );
  }

  async invalidateCache(assetId: string) {
    const asset = await this.assetRepo.findOne({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    // Invalidate CDN cache (implementation depends on CDN provider)
    // For CloudFront: create invalidation request
    // For Cloudflare: purge cache
    console.log(`Invalidating cache for ${asset.cdnUrl}`);

    return { success: true, assetId };
  }

  async getAsset(assetId: string) {
    return this.assetRepo.findOne({ where: { id: assetId } });
  }

  async getLessonAssets(lessonId: string) {
    return this.assetRepo.find({ where: { lessonId } });
  }
}
