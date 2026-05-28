import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID with questions and answers' })
  @ApiResponse({
    status: 200,
    description: 'Quiz details',
    schema: {
      example: {
        id: 'uuid',
        title: 'Quiz Title',
        description: 'Quiz description',
        questions: [],
        passingScore: 70,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async getQuiz(@Param('id') id: string) {
    return this.quizzesService.getQuiz(id);
  }

  @Post(':quizId/submit')
  @ApiOperation({ summary: 'Submit quiz attempt with answers' })
  @ApiResponse({
    status: 201,
    description: 'Quiz submitted and scored',
    schema: {
      example: {
        id: 'uuid',
        quizId: 'uuid',
        userId: 'uuid',
        score: 85,
        isGraded: true,
        submittedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid submission' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async submitAttempt(
    @Param('quizId') quizId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.quizzesService.submitAttempt(quizId, user.id, data.answers);
  }

  @Get(':quizId/results')
  @ApiOperation({ summary: 'Get quiz results and analytics' })
  @ApiResponse({
    status: 200,
    description: 'Quiz results and analytics',
    schema: {
      example: {
        quizId: 'uuid',
        totalAttempts: 10,
        averageScore: 75,
        passRate: 0.8,
        attempts: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async getResults(@Param('quizId') quizId: string, @Request() req: { user: { id: string } }) {
    return this.quizzesService.getResults(quizId, req.user.id);
  }

  @Post(':lessonId')
  async createQuiz(@Param('lessonId') lessonId: string, @Body() data: any) {
    return this.quizzesService.createQuiz(lessonId, data);
  }

  @Post(':quizId/questions')
  async addQuestion(@Param('quizId') quizId: string, @Body() data: any) {
    return this.quizzesService.addQuestion(quizId, data);
  }

  @Post('questions/:questionId/answers')
  async addAnswer(@Param('questionId') questionId: string, @Body() data: any) {
    return this.quizzesService.addAnswer(questionId, data);
  }

  @Post(':attemptId/grade')
  async gradeEssay(
    @Param('attemptId') attemptId: string,
    @Body() data: any,
  ) {
    return this.quizzesService.gradeEssay(
      attemptId,
      data.questionId,
      data.points,
      data.feedback,
    );
  }

  @Get(':quizId/attempts')
  async getAttempts(@Param('quizId') quizId: string) {
    return this.quizzesService.getAttempts(quizId);
  }
}
