import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';
import { RecordProgressDto } from './dto/record-progress.dto';

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
    schema: { example: { id: 'uuid', courseId: 'uuid', progressPct: 75, updatedAt: '2024-01-01T00:00:00.000Z' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  recordProgress(@Request() req, @Body() dto: RecordProgressDto) {
    return this.progressService.record(req.user.id, dto, req.user.stellarPublicKey);
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

  @Get('user/:userId')
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
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserProgress(@Param('userId') userId: string) {
    return this.progressService.findByUser(userId);
  }

  @Post('progress')
  @ApiOperation({ summary: 'Record lesson completion and update on-chain progress' })
  @ApiBody({ schema: { example: { courseId: 'uuid', lessonId: 'uuid', progressPct: 75 } } })
  @ApiResponse({
    status: 201,
    description: 'Progress recorded',
    schema: { example: { id: 'uuid', courseId: 'uuid', progressPct: 75 } },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  record(@Request() req, @Body() dto: RecordProgressDto) {
    return this.progressService.record(req.user.id, dto, req.user.stellarPublicKey);
  }

  @Get('users/:id/progress')
  @ApiOperation({ summary: 'Get all progress records for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of progress records',
    schema: {
      example: [{ courseId: 'uuid', progressPct: 75, updatedAt: '2024-01-01T00:00:00.000Z' }],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByUser(@Param('id') id: string) {
    return this.progressService.findByUser(id);
  }
}
