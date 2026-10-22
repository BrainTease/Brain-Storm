import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DisputeStatus,
  DisputeType,
  CreateDispute,
  ResolveDispute,
  DisputeQuery,
} from '@brain-storm/types';
import { PaginationDto } from '../common/dto/pagination.dto';

export class CreateDisputeDto implements CreateDispute {
  @ApiProperty({ enum: DisputeType })
  @IsEnum(DisputeType)
  type!: DisputeType;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetEntityType?: string;
}

export class ResolveDisputeDto implements ResolveDispute {
  @ApiProperty({ enum: DisputeStatus, description: 'Must be resolved or closed' })
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @ApiProperty()
  @IsString()
  resolution!: string;
}

export class SuspendUserDto {
  @ApiProperty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'ISO date string for suspension end' })
  @IsOptional()
  @IsString()
  until?: string;
}

export class DisputeQueryDto extends PaginationDto implements DisputeQuery {
  @ApiPropertyOptional({ enum: DisputeStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
}