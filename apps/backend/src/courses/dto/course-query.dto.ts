import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim, Sanitize } from 'class-sanitizer';
import { IsOptional, IsString, IsIn } from 'class-validator';

import { PaginationDto } from '../../common/dto/pagination.dto';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';

export class CourseQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Full-text search on title and description' })
  @IsOptional()
  @IsString()
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  search?: string;

  @ApiPropertyOptional({
    enum: ['beginner', 'intermediate', 'advanced'],
    description: 'Filter by course level',
  })
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  level?: string;
}
