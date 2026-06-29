
import { IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AdminAggregationQueryDto extends AdminDashboardQueryDto {
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class ExportQueryDto extends AdminDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  metric?: string;

  @ApiPropertyOptional()
  @IsOptional()
  format?: 'csv' | 'json';
}