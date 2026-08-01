import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalType } from './governance-proposal.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

export class CreateProposalDto {
  @ApiProperty({ description: 'Proposal title', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Detailed description of the proposal' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: ProposalType, default: ProposalType.TEXT })
  @IsOptional()
  @IsEnum(ProposalType)
  type?: ProposalType;

  @ApiProperty({ description: 'Stellar address of the proposer' })
  @IsString()
  proposerAddress: string;

  @ApiPropertyOptional({ description: 'Minimum votes needed to pass' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quorumRequired?: number;

  @ApiPropertyOptional({ description: 'Voting window start (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  votingStartsAt?: string;

  @ApiPropertyOptional({ description: 'Voting window end (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  votingEndsAt?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata (JSON)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateProposalDto {
  @ApiPropertyOptional({ description: 'Proposal title', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the proposal' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata (JSON)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Query DTO for listing proposals — extends PaginationDto so page/limit
 * are consistently validated and documented across all list endpoints.
 */
export class ProposalQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by proposal type' })
  @IsOptional()
  @IsEnum(ProposalType)
  type?: ProposalType;

  @ApiPropertyOptional({ description: 'Filter by proposer address' })
  @IsOptional()
  @IsString()
  proposerAddress?: string;
}

export class VoteDto {
  @ApiProperty({ description: 'Voter Stellar address' })
  @IsString()
  voter: string;

  @ApiProperty({ description: 'true = vote for, false = vote against' })
  support: boolean;

  @ApiPropertyOptional({ description: 'Signed Stellar transaction XDR' })
  @IsOptional()
  @IsString()
  signedTransaction?: string;
}
