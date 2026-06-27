import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecommendationSignalsService, RecSignal } from './recommendation-signals.service';
import { SignalType } from './recommendation-signal.entity';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/recommendations')
export class RecommendationSignalsController {
  constructor(private readonly signalsService: RecommendationSignalsService) {}

  @Post('signals')
  @ApiOperation({ summary: 'Record an implicit or explicit recommendation signal' })
  @ApiBody({
    schema: {
      example: {
        courseId: 'uuid',
        signalType: 'view',
        value: 1,
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Signal recorded' })
  async recordSignal(
    @Request() req: any,
    @Body() body: { courseId: string; signalType: SignalType; value?: number },
  ) {
    const signal: RecSignal = {
      userId: req.user.userId,
      courseId: body.courseId,
      signalType: body.signalType,
      value: body.value,
      consentGranted: true,
    };
    await this.signalsService.record(signal);
    return { ok: true };
  }

  @Get('signal-recommendations')
  @ApiOperation({ summary: 'Get signal-scored course recommendations for the current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Signal-based recommendations' })
  async getSignalRecommendations(
    @Request() req: any,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.signalsService.getSignalRecommendations(req.user.userId, Math.min(limit, 50));
  }

  @Delete('signals')
  @ApiOperation({ summary: 'Delete all recommendation signals for the current user (GDPR)' })
  @ApiResponse({ status: 200, description: 'Signals deleted' })
  async deleteMySignals(@Request() req: any) {
    await this.signalsService.deleteUserSignals(req.user.userId);
    return { ok: true };
  }

  @Get('evaluate')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: run offline precision@k evaluation on held-out signals' })
  @ApiQuery({ name: 'k', required: false, type: Number })
  @ApiQuery({ name: 'holdoutDays', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Precision@k result' })
  async evaluate(
    @Query('k', new DefaultValuePipe(10), ParseIntPipe) k: number,
    @Query('holdoutDays', new DefaultValuePipe(7), ParseIntPipe) holdoutDays: number,
  ) {
    return this.signalsService.evaluatePrecisionAtK(Math.min(k, 50), holdoutDays);
  }
}
