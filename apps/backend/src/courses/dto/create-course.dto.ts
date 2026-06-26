import { IsString, IsOptional, IsInt, IsIn, Min, MinLength, IsBoolean } from 'class-validator';
import { Trim, Sanitize } from 'class-sanitizer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to Stellar Blockchain', description: 'Course title' })
  @IsString()
  @MinLength(3)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  title: string;

  @ApiProperty({
    example: 'Learn the fundamentals of the Stellar network, wallets, and smart contracts.',
    description: 'Course description (min 10 chars)',
  })
  @IsString()
  @MinLength(10)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  description: string;

  @ApiPropertyOptional({
    enum: ['beginner', 'intermediate', 'advanced'],
    example: 'beginner',
    description: 'Difficulty level',
  })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  @Trim()
  level?: string;

  @ApiPropertyOptional({ example: 8, description: 'Estimated duration in hours' })
  @IsOptional() @IsInt() @Min(0) durationHours?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether KYC is required to enroll' })
  @IsOptional() @IsBoolean() requiresKyc?: boolean;
}
