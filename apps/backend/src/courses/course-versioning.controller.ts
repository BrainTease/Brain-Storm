import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CourseVersioningService } from './course-versioning.service';

@ApiTags('course-versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses/:courseId/versions')
export class CourseVersioningController {
  constructor(private readonly versioningService: CourseVersioningService) {}

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new version snapshot of a course' })
  createVersion(
    @Param('courseId') courseId: string,
    @Body('changeNote') changeNote: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.versioningService.createVersion(courseId, changeNote, req.user.id);
  }

  @Get()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'List all versions of a course' })
  listVersions(@Param('courseId') courseId: string) {
    return this.versioningService.listVersions(courseId);
  }

  @Get('diff')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Diff two versions of a course' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  diffVersions(
    @Param('courseId') courseId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.versioningService.diffVersions(courseId, from, to);
  }

  @Get(':versionId')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get a specific version snapshot' })
  getVersion(@Param('courseId') courseId: string, @Param('versionId') versionId: string) {
    return this.versioningService.getVersion(courseId, versionId);
  }

  @Post(':versionId/rollback')
  @Roles('admin')
  @ApiOperation({ summary: 'Rollback course to a previous version' })
  rollback(@Param('courseId') courseId: string, @Param('versionId') versionId: string) {
    return this.versioningService.rollback(courseId, versionId);
  }
}
