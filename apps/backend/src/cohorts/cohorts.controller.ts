import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CohortsService } from './cohorts.service';

@Controller('v1/cohorts')
@UseGuards(JwtAuthGuard)
export class CohortsController {
  constructor(private cohortsService: CohortsService) {}

  @Post()
  async createCohort(@Body() data: any, @CurrentUser() user: any) {
    return this.cohortsService.createCohort(data.courseId, user.id, data);
  }

  @Get(':id')
  async getCohort(@Param('id') id: string) {
    return this.cohortsService.getCohort(id);
  }

  @Post(':cohortId/members')
  async addMember(
    @Param('cohortId') cohortId: string,
    @Body() data: any,
  ) {
    return this.cohortsService.addMember(cohortId, data.userId);
  }

  @Delete(':cohortId/members/:userId')
  async removeMember(
    @Param('cohortId') cohortId: string,
    @Param('userId') userId: string,
  ) {
    return this.cohortsService.removeMember(cohortId, userId);
  }

  @Post(':cohortId/progress')
  async updateProgress(
    @Param('cohortId') cohortId: string,
    @Body() data: any,
  ) {
    return this.cohortsService.updateMemberProgress(
      cohortId,
      data.userId,
      data.progressPercentage,
    );
  }

  @Get(':cohortId/progress')
  async getCohortProgress(@Param('cohortId') cohortId: string) {
    return this.cohortsService.getCohortProgress(cohortId);
  }

  @Get('course/:courseId')
  async getCohortsByCourse(@Param('courseId') courseId: string) {
    return this.cohortsService.getCohortsByCourse(courseId);
  }
}
