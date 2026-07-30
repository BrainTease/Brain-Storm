import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { JobStatus, ApplicationStatus } from '../job.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateJobDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsString() @IsOptional() category?: string;
  @IsArray() @IsOptional() requiredSkills?: string[];
  @IsNumber() @IsOptional() @Min(0) budgetMin?: number;
  @IsNumber() @IsOptional() @Min(0) budgetMax?: number;
  @IsDateString() @IsOptional() expiresAt?: string;
}

export class UpdateJobDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() category?: string;
  @IsArray() @IsOptional() requiredSkills?: string[];
  @IsEnum(JobStatus) @IsOptional() status?: JobStatus;
  @IsDateString() @IsOptional() expiresAt?: string;
}

export class CreateApplicationDto {
  @IsString() @IsOptional() coverLetter?: string;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus) status: ApplicationStatus;
  @IsString() @IsOptional() reviewNote?: string;
}

/**
 * #807: Extends shared PaginationDto instead of re-declaring page/limit fields.
 */
export class JobQueryDto extends PaginationDto {
  @IsString() @IsOptional() search?: string;
  @IsString() @IsOptional() category?: string;
  @IsEnum(JobStatus) @IsOptional() status?: JobStatus;
}
