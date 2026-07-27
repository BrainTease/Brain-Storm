/**
 * Storage service — Issue #649
 *
 * Hardens uploads with:
 * - MIME type + extension validation
 * - Filename sanitisation (strips path traversal, non-ASCII)
 * - Max size enforcement
 * - S3-compatible object storage (AWS SDK v3)
 * - Pre-signed GET URLs (configurable TTL)
 * - Responsive image derivatives via Sharp
 * - Media metadata tracking in DB
 * - Soft-delete and hard-delete support
 */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import * as crypto from 'crypto';
import { Media, MediaStatus } from './media.entity';

// ── Validation constants ──────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'application/pdf',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm',
  '.pdf', '.txt',
]);

// ── Image derivative sizes ────────────────────────────────────────────────────

const IMAGE_DERIVATIVES = [
  { suffix: 'thumb', width: 150, height: 150 },
  { suffix: 'small', width: 400, height: 400 },
  { suffix: 'medium', width: 800, height: 800 },
];

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly signedUrlTtlSec: number;

  constructor(
    @InjectRepository(Media) private mediaRepo: Repository<Media>,
    private config: ConfigService,
  ) {
    this.region = config.get('AWS_REGION', 'us-east-1');
    this.bucket = config.get('S3_BUCKET', 'brainstorm-media');
    this.signedUrlTtlSec = config.get<number>('S3_SIGNED_URL_TTL_SEC', 3600);

    this.s3 = new S3Client({
      region: this.region,
      endpoint: config.get('S3_ENDPOINT'), // optional: for MinIO/localstack
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────

  /** Validate MIME type, extension, and file size. Throws BadRequestException on failure. */
  validateFile(file: Express.Multer.File): void {
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException(`File too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024} MB.`);
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`MIME type not allowed: ${file.mimetype}`);
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`File extension not allowed: ${ext}`);
    }
  }

  /** Sanitise a filename: strip path separators, non-ASCII, limit length. */
  sanitiseFilename(original: string): string {
    const ext = path.extname(original).toLowerCase();
    const base = path.basename(original, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 80);
    return `${base}${ext}`;
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  /**
   * Validate, sanitise, upload to S3, generate derivatives (images), and persist metadata.
   *
   * @returns The saved `Media` record.
   */
  async upload(
    file: Express.Multer.File,
    ownerId: string,
    meta?: Record<string, unknown>,
  ): Promise<Media> {
    this.validateFile(file);

    const safeName = this.sanitiseFilename(file.originalname);
    const ext = path.extname(safeName).toLowerCase();
    const uid = crypto.randomUUID();
    const storageKey = `uploads/${ownerId}/${uid}/${safeName}`;

    // Upload original to S3
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `attachment; filename="${safeName}"`,
      ServerSideEncryption: 'AES256',
      Metadata: { ownerId, originalName: file.originalname },
    }));

    // Generate and upload image derivatives
    const derivatives: Record<string, string> = {};
    const isImage = file.mimetype.startsWith('image/');
    if (isImage) {
      for (const deriv of IMAGE_DERIVATIVES) {
        try {
          const { default: sharp } = await import('sharp');
          const resized = await sharp(file.buffer)
            .resize(deriv.width, deriv.height, { fit: 'inside', withoutEnlargement: true })
            .toFormat('webp', { quality: 80 })
            .toBuffer();

          const derivKey = `uploads/${ownerId}/${uid}/${deriv.suffix}.webp`;
          await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: derivKey,
            Body: resized,
            ContentType: 'image/webp',
            ServerSideEncryption: 'AES256',
          }));
          derivatives[deriv.suffix] = derivKey;
        } catch {
          // Derivative failure is non-fatal — log and continue
        }
      }
    }

    // Persist media record
    const media = this.mediaRepo.create({
      ownerId,
      originalName: safeName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      bucket: this.bucket,
      status: MediaStatus.READY,
      derivatives: Object.keys(derivatives).length ? derivatives : undefined,
      metadata: meta,
    });

    return this.mediaRepo.save(media);
  }

  // ── Signed URL ────────────────────────────────────────────────────────────

  /**
   * Generate a pre-signed GET URL for secure, time-limited access.
   *
   * @param mediaId  - Media record ID.
   * @param ttlSec   - Override TTL in seconds (default: from config).
   */
  async getSignedUrl(mediaId: string, ttlSec?: number): Promise<string> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media || media.status === MediaStatus.DELETED) {
      throw new NotFoundException('Media not found');
    }

    const cmd = new GetObjectCommand({ Bucket: media.bucket, Key: media.storageKey });
    return getSignedUrl(this.s3, cmd, { expiresIn: ttlSec ?? this.signedUrlTtlSec });
  }

  /**
   * Generate a pre-signed URL for a specific derivative.
   */
  async getDerivativeSignedUrl(mediaId: string, suffix: string, ttlSec?: number): Promise<string> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media || !media.derivatives?.[suffix]) throw new NotFoundException('Derivative not found');

    const cmd = new GetObjectCommand({ Bucket: media.bucket, Key: media.derivatives[suffix] });
    return getSignedUrl(this.s3, cmd, { expiresIn: ttlSec ?? this.signedUrlTtlSec });
  }

  // ── Deletion ──────────────────────────────────────────────────────────────

  /**
   * Soft-delete: mark record as deleted (S3 object retained for audit).
   */
  async softDelete(mediaId: string, ownerId: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId, ownerId } });
    if (!media) throw new NotFoundException('Media not found');
    media.status = MediaStatus.DELETED;
    media.deletedAt = new Date();
    await this.mediaRepo.save(media);
  }

  /**
   * Hard-delete: remove from S3 and delete DB record.
   * Use for GDPR erasure or explicit admin purge.
   */
  async hardDelete(mediaId: string, ownerId: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId, ownerId } });
    if (!media) throw new NotFoundException('Media not found');

    // Delete original
    await this.s3.send(new DeleteObjectCommand({ Bucket: media.bucket, Key: media.storageKey }));

    // Delete derivatives
    if (media.derivatives) {
      for (const key of Object.values(media.derivatives)) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: media.bucket, Key: key })).catch(() => {});
      }
    }

    await this.mediaRepo.remove(media);
  }

  // ── Metadata ──────────────────────────────────────────────────────────────

  async findByOwner(ownerId: string): Promise<Media[]> {
    return this.mediaRepo.find({
      where: { ownerId, status: MediaStatus.READY },
      order: { uploadedAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Media | null> {
    return this.mediaRepo.findOne({ where: { id } });
  }
}
