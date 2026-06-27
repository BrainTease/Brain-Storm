import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus, DisputeType } from './dispute.entity';

export class CreateDisputeDto {
  @ApiProperty({ enum: DisputeType })
  @IsEnum(DisputeType)
  type: DisputeType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetEntityType?: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: DisputeStatus, description: 'Must be resolved or closed' })
  @IsEnum(DisputeStatus)
  status: DisputeStatus;

  @ApiProperty()
  @IsString()
  resolution: string;
}

export class SuspendUserDto {
  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'ISO date string for suspension end' })
  @IsOptional()
  @IsString()
  until?: string;
}
