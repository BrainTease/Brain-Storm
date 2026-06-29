import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { JobStatus, ApplicationStatus } from '../job.entity';

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

export class JobQueryDto {
  @IsString() @IsOptional() search?: string;
  @IsString() @IsOptional() category?: string;
  @IsEnum(JobStatus) @IsOptional() status?: JobStatus;
  @IsNumber() @IsOptional() @Min(1) page?: number;
  @IsNumber() @IsOptional() @Min(1) limit?: number;
}
