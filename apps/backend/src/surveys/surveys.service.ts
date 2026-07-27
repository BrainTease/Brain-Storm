import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './survey.entity';
import { SurveyQuestion } from './survey-question.entity';
import { SurveyResponse } from './survey-response.entity';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveyRepo: Repository<Survey>,
    @InjectRepository(SurveyQuestion)
    private questionRepo: Repository<SurveyQuestion>,
    @InjectRepository(SurveyResponse)
    private responseRepo: Repository<SurveyResponse>,
  ) {}

  async createSurvey(
    courseId: string,
    title: string,
    description: string,
    triggerType: 'completion' | 'milestone',
    triggerMilestone?: number,
  ): Promise<Survey> {
    const survey = this.surveyRepo.create({
      courseId,
      title,
      description,
      triggerType,
      triggerMilestone,
    });
    return this.surveyRepo.save(survey);
  }

  async addQuestion(
    surveyId: string,
    text: string,
    type: 'rating' | 'text' | 'mcq',
    order: number,
    options?: string[],
    required = true,
  ): Promise<SurveyQuestion> {
    const question = this.questionRepo.create({
      surveyId,
      text,
      type,
      order,
      options,
      required,
    });
    return this.questionRepo.save(question);
  }

  async submitResponse(
    surveyId: string,
    userId: string,
    answers: Record<string, string | number>,
  ): Promise<SurveyResponse> {
    const response = this.responseRepo.create({
      surveyId,
      userId,
      answers,
    });
    return this.responseRepo.save(response);
  }

  async getSurveyByCourse(courseId: string): Promise<Survey[]> {
    return this.surveyRepo.find({
      where: { courseId, isActive: true },
      relations: ['questions'],
      order: { createdAt: 'DESC' },
    });
  }

  async getResponsesForSurvey(surveyId: string): Promise<SurveyResponse[]> {
    return this.responseRepo.find({
      where: { surveyId },
      relations: ['user'],
    });
  }

  async getAnalytics(surveyId: string): Promise<{
    totalResponses: number;
    responseRate: number;
    questionStats: Record<string, any>;
  }> {
    const survey = await this.surveyRepo.findOne({
      where: { id: surveyId },
      relations: ['course', 'responses', 'questions'],
    });

    if (!survey) throw new Error('Survey not found');

    const totalResponses = survey.responses.length;
    const questionStats: Record<string, any> = {};

    for (const question of survey.questions) {
      const responses = survey.responses.map((r) => r.answers[question.id]);

      if (question.type === 'rating') {
        const ratings = responses.filter((r) => typeof r === 'number') as number[];
        questionStats[question.id] = {
          average: ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0,
          count: ratings.length,
        };
      } else if (question.type === 'mcq') {
        const counts: Record<string, number> = {};
        responses.forEach((r) => {
          if (r) counts[r] = (counts[r] || 0) + 1;
        });
        questionStats[question.id] = counts;
      } else {
        questionStats[question.id] = { responses: responses.filter((r) => r) };
      }
    }

    return {
      totalResponses,
      responseRate: totalResponses > 0 ? (totalResponses / survey.course.durationHours) * 100 : 0,
      questionStats,
    };
  }
}
