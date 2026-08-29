import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Sanitize, Trim } from 'class-sanitizer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, ModerationStatus } from '../moderation.enums';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';

export class FlagContentDto {
  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  contentType!: ContentType;

  @ApiProperty()
  @IsUUID()
  contentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  reason?: string;
}

export class ReviewItemDto {
  @ApiProperty({ enum: [ModerationStatus.APPROVED, ModerationStatus.REJECTED] })
  @IsEnum([ModerationStatus.APPROVED, ModerationStatus.REJECTED])
  status!: ModerationStatus.APPROVED | ModerationStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  note?: string;
}

export class AppealDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}

export class ModerationQueueQueryDto {
  @ApiPropertyOptional({ enum: ModerationStatus })
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;
}
