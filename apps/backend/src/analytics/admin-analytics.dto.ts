import { IsOptional, IsDateString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ISODateString } from '@brain-storm/types';

export class AdminDashboardQueryDto implements Partial<Pick<AdminDashboardQuery, 'startDate' | 'endDate'>> {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: ISODateString;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: ISODateString;
}

export class AdminAggregationQueryDto
  extends AdminDashboardQueryDto
  implements Partial<Pick<AdminAggregationQuery, 'startDate' | 'endDate' | 'days'>>
{
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class ExportQueryDto
  extends AdminDashboardQueryDto
  implements Partial<Pick<ExportQuery, 'startDate' | 'endDate' | 'metric' | 'format'>>
{
  @ApiPropertyOptional()
  @IsOptional()
  metric?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['csv', 'json'])
  format?: 'csv' | 'json';
}

// Shared query shapes re-exported from @brain-storm/types to avoid duplicate
// interface declarations for the same entity between packages/types and the backend.
import type {
  AdminDashboardQuery,
  AdminAggregationQuery,
  ExportQuery,
} from '@brain-storm/types';