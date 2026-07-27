import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Trim } from 'class-sanitizer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordProgressDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'Course ID' })
  @IsUUID()
  @Trim()
  courseId: string;

  @ApiPropertyOptional({ example: '7cb2e9a1-1234-4abc-8def-0011223344ff', description: 'Lesson ID (optional)' })
  @IsOptional()
  @IsUUID()
  @Trim()
  lessonId?: string;

  @ApiProperty({ example: 75, description: 'Progress percentage (0-100)', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  progressPct: number;
}
