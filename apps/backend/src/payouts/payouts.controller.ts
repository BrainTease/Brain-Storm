import { Controller, Post, Get, Param, Body, UseGuards, Query } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/payouts')
export class PayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Post('calculate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async calculatePayouts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.payoutsService.calculatePayouts(new Date(startDate), new Date(endDate));
  }

  @Post(':payoutId/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async processPayout(@Param('payoutId') payoutId: string) {
    return this.payoutsService.processPayout(payoutId);
  }

  @Get('instructor/:instructorId')
  @UseGuards(JwtAuthGuard)
  async getInstructorPayouts(@Param('instructorId') instructorId: string) {
    return this.payoutsService.getInstructorPayouts(instructorId);
  }

  @Get('instructor/:instructorId/stats')
  @UseGuards(JwtAuthGuard)
  async getPayoutStats(@Param('instructorId') instructorId: string) {
    return this.payoutsService.getPayoutStats(instructorId);
  }

  @Get('instructor/:instructorId/history')
  @UseGuards(JwtAuthGuard)
  async getPayoutHistory(
    @Param('instructorId') instructorId: string,
    @Query('limit') limit = 10,
  ) {
    return this.payoutsService.getPayoutHistory(instructorId, limit);
  }
}
