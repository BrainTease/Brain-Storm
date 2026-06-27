import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/surveys')
@UseGuards(JwtAuthGuard)
export class SurveysController {
  constructor(private surveysService: SurveysService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  async createSurvey(
    @Body()
    body: {
      courseId: string;
      title: string;
      description: string;
      triggerType: 'completion' | 'milestone';
      triggerMilestone?: number;
    },
  ) {
    return this.surveysService.createSurvey(
      body.courseId,
      body.title,
      body.description,
      body.triggerType,
      body.triggerMilestone,
    );
  }

  @Post(':surveyId/questions')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  async addQuestion(
    @Param('surveyId') surveyId: string,
    @Body()
    body: {
      text: string;
      type: 'rating' | 'text' | 'mcq';
      order: number;
      options?: string[];
      required?: boolean;
    },
  ) {
    return this.surveysService.addQuestion(
      surveyId,
      body.text,
      body.type,
      body.order,
      body.options,
      body.required,
    );
  }

  @Post(':surveyId/responses')
  async submitResponse(
    @Param('surveyId') surveyId: string,
    @Body() body: { userId: string; answers: Record<string, string | number> },
  ) {
    return this.surveysService.submitResponse(surveyId, body.userId, body.answers);
  }

  @Get('course/:courseId')
  async getSurveysByCourse(@Param('courseId') courseId: string) {
    return this.surveysService.getSurveyByCourse(courseId);
  }

  @Get(':surveyId/responses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  async getResponses(@Param('surveyId') surveyId: string) {
    return this.surveysService.getResponsesForSurvey(surveyId);
  }

  @Get(':surveyId/analytics')
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  async getAnalytics(@Param('surveyId') surveyId: string) {
    return this.surveysService.getAnalytics(surveyId);
  }
}
