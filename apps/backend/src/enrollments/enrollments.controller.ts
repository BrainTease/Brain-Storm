import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';

/**
 * Enrollments REST API
 *
 * Canonical routes only — duplicate aliases removed (#798):
 *  - POST   /v1/enrollments                     → enroll current user in a course
 *  - GET    /v1/enrollments                     → list current user's enrollments
 *  - GET    /v1/enrollments/:id                 → get enrollment by ID
 *  - DELETE /v1/enrollments/:id                 → delete enrollment by ID
 *
 * Removed duplicates:
 *  - POST   /v1/enrollments/courses/:id/enroll  (same as POST /)
 *  - DELETE /v1/enrollments/courses/:id/enroll  (same as DELETE /:id)
 *  - GET    /v1/enrollments/users/:id/enrollments (same as GET /)
 */
@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/enrollments')
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll the current user in a course' })
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
  @ApiResponse({ status: 403, description: 'Prerequisites not completed' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  createEnrollment(
    @Body() body: { courseId: string; adminOverride?: boolean },
    @Request() req: { user: { id: string; role: string } }
  ) {
    const isAdmin = req.user.role === 'admin';
    return this.enrollmentsService.enroll(
      req.user.id,
      body.courseId,
      isAdmin && !!body.adminOverride
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all enrollments for the current user' })
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
  @ApiOperation({ summary: 'Delete / unenroll from a course by enrollment ID' })
  @ApiResponse({ status: 200, description: 'Unenrolled successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  deleteEnrollment(@Param('id') id: string) {
    return this.enrollmentsService.deleteById(id);
  }
}
