import { IsString, IsOptional, IsInt, IsIn, Min, MinLength, IsBoolean } from 'class-validator';
import { Trim, Sanitize } from 'class-sanitizer';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  title: string;

  @IsString()
  @MinLength(10)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  description: string;

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  @Trim()
  level?: string;

  @IsOptional() @IsInt() @Min(0) durationHours?: number;

  @IsOptional() @IsBoolean() requiresKyc?: boolean;
}
