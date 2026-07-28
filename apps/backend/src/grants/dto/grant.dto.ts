import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsIn, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { GrantStatus } from '../grant.entity';

export class CreateGrantDto {
  @ApiProperty({ example: 'Stellar Education Initiative' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'A grant to fund blockchain education in underserved communities.' })
  @IsString()
  @IsNotEmpty()
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
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description text.' })
  @IsOptional()
  @IsString()
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
  reviewNotes?: string;

  @ApiPropertyOptional({ example: 'reviewer-uuid-here' })
  @IsOptional()
  @IsString()
  reviewerId?: string;
}

export class PaginateGrantsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ enum: ['open', 'under_review', 'approved', 'rejected', 'closed'] })
  @IsOptional()
  @IsIn(['open', 'under_review', 'approved', 'rejected', 'closed'])
  status?: GrantStatus;
}
