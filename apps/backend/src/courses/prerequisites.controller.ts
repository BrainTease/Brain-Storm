import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrerequisitesService } from './prerequisites.service';

@ApiTags('course-prerequisites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses/:courseId/prerequisites')
export class PrerequisitesController {
  constructor(private readonly prereqService: PrerequisitesService) {}

  @Get()
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'List prerequisites for a course' })
  getPrerequisites(@Param('courseId') courseId: string) {
    return this.prereqService.getPrerequisites(courseId);
  }

  @Get('chain')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get full prerequisite chain for visualization' })
  getChain(@Param('courseId') courseId: string) {
    return this.prereqService.getPrerequisiteChain(courseId);
  }

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Add a prerequisite to a course' })
  addPrerequisite(
    @Param('courseId') courseId: string,
    @Body('prerequisiteId') prerequisiteId: string,
  ) {
    return this.prereqService.addPrerequisite(courseId, prerequisiteId);
  }

  @Delete(':prerequisiteId')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Remove a prerequisite from a course' })
  removePrerequisite(
    @Param('courseId') courseId: string,
    @Param('prerequisiteId') prerequisiteId: string,
  ) {
    return this.prereqService.removePrerequisite(courseId, prerequisiteId);
  }

  @Post('validate/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Check if a user satisfies prerequisites (admin can override)' })
  validatePrerequisites(
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
    @Body('adminOverride') adminOverride?: boolean,
  ) {
    return this.prereqService.validatePrerequisites(userId, courseId, adminOverride ?? false);
  }
}
