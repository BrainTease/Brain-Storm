import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IssueCertificateDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', description: 'User ID to issue certificate for' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'a1b2c3d4-1234-5678-abcd-ef0123456789', description: 'Course ID the certificate is for' })
  @IsUUID()
  courseId: string;
}
