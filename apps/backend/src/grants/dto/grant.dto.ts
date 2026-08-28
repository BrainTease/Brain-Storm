import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  MaxLength,
  Min,
} from 'class-validator';
import { Sanitize, Trim } from 'class-sanitizer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';
import type { GrantStatus } from '../grant.entity';

export class CreateGrantDto {
  @ApiProperty({ example: 'Stellar Education Initiative' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  title: string;

  @ApiProperty({ example: 'A grant to fund blockchain education in underserved communities.' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  description: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  @IsNotEmpty()
  applicantId: string;
}

export class UpdateGrantDto {
  @ApiPropertyOptional({ example: 'Updated Grant Title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description text.' })
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  description?: string;

  @ApiPropertyOptional({ example: 7500 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional({ enum: ['open', 'under_review', 'approved', 'rejected', 'closed'] })
  @IsOptional()
  @IsIn(['open', 'under_review', 'approved', 'rejected', 'closed'])
  status?: GrantStatus;

  @ApiPropertyOptional({ example: 'Application looks promising.' })
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  reviewNotes?: string;

  @ApiPropertyOptional({ example: 'reviewer-uuid-here' })
  @IsOptional()
  @IsString()
  reviewerId?: string;
}

/**
 * #807: Extends shared PaginationDto to avoid duplicating page/limit fields.
 * Adds grant-specific filter (status).
 */
export class PaginateGrantsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['open', 'under_review', 'approved', 'rejected', 'closed'] })
  @IsOptional()
  @IsIn(['open', 'under_review', 'approved', 'rejected', 'closed'])
  status?: GrantStatus;
}
