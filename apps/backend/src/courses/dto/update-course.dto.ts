import { IsString, IsOptional, IsInt, IsIn, IsBoolean, Min, MinLength } from 'class-validator';
import { Trim, Sanitize } from 'class-sanitizer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Advanced Stellar Smart Contracts', description: 'Course title' })
  @IsOptional() @IsString() @MinLength(3) @Trim() @Sanitize(StripHtmlSanitizer) title?: string;

  @ApiPropertyOptional({ example: 'An in-depth look at Soroban contract development patterns.', description: 'Course description' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  description?: string;

  @ApiPropertyOptional({ enum: ['beginner', 'intermediate', 'advanced'], example: 'intermediate', description: 'Difficulty level' })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  @Trim()
  level?: string;

  @ApiPropertyOptional({ example: 12, description: 'Duration in hours' })
  @IsOptional() @IsInt() @Min(0) durationHours?: number;

  @ApiPropertyOptional({ example: true, description: 'Publish the course' })
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
