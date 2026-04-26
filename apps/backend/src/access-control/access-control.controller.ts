import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { AccessRole } from './course-access-control.entity';

@Controller('v1/access-control')
@UseGuards(JwtAuthGuard)
export class AccessControlController {
  constructor(private accessControlService: AccessControlService) {}

  @Post('grant')
  async grantAccess(@Body() data: any) {
    return this.accessControlService.grantAccess(
      data.courseId,
      data.userId,
      data.role as AccessRole,
      data.subscriptionExpiryDate,
      data.allowedIpAddresses,
    );
  }

  @Post('check')
  async checkAccess(@Body() data: any, @Req() req: any) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.accessControlService.checkAccess(
      data.courseId,
      data.userId,
      ipAddress,
    );
  }

  @Delete(':courseId/users/:userId')
  async revokeAccess(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    return this.accessControlService.revokeAccess(courseId, userId);
  }

  @Post(':courseId/users/:userId/subscription')
  async updateSubscription(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
    @Body() data: any,
  ) {
    return this.accessControlService.updateSubscription(
      courseId,
      userId,
      data.expiryDate,
    );
  }

  @Get(':courseId/logs')
  async getAccessLogs(
    @Param('courseId') courseId: string,
    @Body() data?: any,
  ) {
    return this.accessControlService.getAccessLogs(
      courseId,
      data?.userId,
      data?.days || 30,
    );
  }

  @Get(':courseId/users/:userId')
  async getAccessControl(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    return this.accessControlService.getAccessControl(courseId, userId);
  }

  @Get(':courseId/users')
  async getCourseAccessList(@Param('courseId') courseId: string) {
    return this.accessControlService.getCourseAccessList(courseId);
  }
}
