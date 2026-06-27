import { IsString, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class SessionResponseDto {
  id: string;
  cohortId: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  videoProviderId: string;
  recordingUrl: string;
  status: string;
  instructorId: string;
  attendances: any[];
  createdAt: Date;
  updatedAt: Date;
}
