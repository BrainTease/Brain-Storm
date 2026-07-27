import { IsString, IsInt, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { OrgRole } from '../organization.entity';

export class CreateOrgDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  seats?: number;
}

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(OrgRole)
  role: OrgRole;
}

export class AssignCourseDto {
  @IsString()
  courseId: string;

  @IsString()
  orgId: string;
}
