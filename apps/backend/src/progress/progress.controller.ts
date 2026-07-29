import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';
import { RecordProgressDto } from './dto/record-progress.dto';

/**
 * Progress REST API
 *
 * Canonical routes only — duplicate aliases removed (#798):
 *  - POST /v1/progress                   → record / update progress for current user
 *  - GET  /v1/progress/:courseId          → get progress for a specific course
 *  - GET  /v1/progress/users/:userId      → get all progress records for a user
 *
 * Removed duplicates:
 *  - POST /v1/progress/progress           (same as POST /)
 *  - GET  /v1/progress/user/:userId       (same as GET /users/:userId)
 */
@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Post()
  @ApiOperation({ summary: 'Record or update progress for a course' })
  @ApiBody({ schema: { example: { courseId: 'uuid', lessonId: 'uuid', progressPct: 75 } } })
  @ApiResponse({
    status: 201,
    description: 'Progress recorded',
    schema: {
      example: {
        id: 'uuid',
        courseId: 'uuid',
        progressPct: 75,
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  recordProgress(@Request() req, @Body() dto: RecordProgressDto) {
    return this.progressService.record(req.user.id, dto, req.user.stellarPublicKey);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get all progress records for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of progress records',
    schema: {
      example: [
        { id: 'uuid', courseId: 'uuid', progressPct: 75, updatedAt: '2024-01-01T00:00:00.000Z' },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserProgress(@Param('userId') userId: string) {
    return this.progressService.findByUser(userId);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'Get progress for a specific course' })
  @ApiResponse({
    status: 200,
    description: 'Course progress details',
    schema: {
      example: {
        id: 'uuid',
        courseId: 'uuid',
        progressPct: 75,
        completedAt: null,
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Progress not found' })
  getProgressByCourse(@Param('courseId') courseId: string, @Request() req) {
    return this.progressService.findByCourse(req.user.id, courseId);
  }
}
