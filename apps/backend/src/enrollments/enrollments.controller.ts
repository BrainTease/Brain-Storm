import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/enrollments')
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create enrollment for a user in a course' })
  @ApiResponse({
    status: 201,
    description: 'Enrollment created successfully',
    schema: {
      example: {
        id: 'uuid',
        userId: 'uuid',
        courseId: 'uuid',
        status: 'active',
        enrolledAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  createEnrollment(
    @Body() body: { courseId: string; adminOverride?: boolean },
    @Request() req: { user: { id: string; role: string } },
  ) {
    const isAdmin = req.user.role === 'admin';
    return this.enrollmentsService.enroll(req.user.id, body.courseId, isAdmin && !!body.adminOverride);
  }

  @Get()
  @ApiOperation({ summary: 'List all enrollments for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of enrollments',
    schema: {
      example: [
        {
          id: 'uuid',
          userId: 'uuid',
          courseId: 'uuid',
          status: 'active',
          enrolledAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    },
  })
  listEnrollments(@Request() req: { user: { id: string } }) {
    return this.enrollmentsService.findByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get enrollment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment details',
    schema: {
      example: {
        id: 'uuid',
        userId: 'uuid',
        courseId: 'uuid',
        status: 'active',
        enrolledAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  getEnrollment(@Param('id') id: string) {
    return this.enrollmentsService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/unenroll from a course' })
  @ApiResponse({ status: 200, description: 'Unenrolled successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  deleteEnrollment(@Param('id') id: string) {
    return this.enrollmentsService.deleteById(id);
  }

  @Post('courses/:id/enroll')
  @ApiOperation({ summary: 'Enroll the current user in a course' })
  @ApiResponse({
    status: 201,
    description: 'Enrolled successfully',
    schema: {
      example: {
        id: 'uuid',
        userId: 'uuid',
        courseId: 'uuid',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Prerequisites not completed' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  enroll(
    @Param('id') courseId: string,
    @Request() req: { user: { id: string; role: string } },
    @Body('adminOverride') adminOverride?: boolean,
  ) {
    const isAdmin = req.user.role === 'admin';
    return this.enrollmentsService.enroll(req.user.id, courseId, isAdmin && !!adminOverride);
  }

  @Delete('courses/:id/enroll')
  @ApiOperation({ summary: 'Unenroll the current user from a course' })
  @ApiResponse({ status: 200, description: 'Unenrolled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  unenroll(@Param('id') courseId: string, @Request() req: { user: { id: string } }) {
    return this.enrollmentsService.unenroll(req.user.id, courseId);
  }

  @Get('users/:id/enrollments')
  @ApiOperation({ summary: 'Get all enrollments for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of enrollments',
    schema: { example: [{ id: 'uuid', courseId: 'uuid', createdAt: '2024-01-01T00:00:00.000Z' }] },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserEnrollments(@Param('id') userId: string) {
    return this.enrollmentsService.findByUser(userId);
  }
}
