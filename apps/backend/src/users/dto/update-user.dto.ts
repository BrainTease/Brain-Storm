import { IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Trim, Sanitize } from 'class-sanitizer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StripHtmlSanitizer } from '../../common/sanitizers/strip-html.sanitizer';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'stellar_dev', description: 'Unique username (3-30 chars)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Trim()
  username?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/user.png', description: 'Avatar URL' })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Blockchain enthusiast and educator.', description: 'Short bio (max 500 chars)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Trim()
  @Sanitize(StripHtmlSanitizer)
  bio?: string;
}
