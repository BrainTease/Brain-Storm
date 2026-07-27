import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagsService } from './feature-flags.service';
import { FlagExposureLogger } from './flag-exposure.logger';
import { FeatureFlag } from './feature-flag.entity';

@ApiTags('feature-flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly service: FeatureFlagsService,
    private readonly exposure: FlagExposureLogger,
  ) {}

  /** Evaluate a single flag (for frontend/backend consumption) */
  @Get('evaluate/:key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'userId', required: false })
  async evaluate(@Param('key') key: string, @Req() req: any) {
    const userId: string | undefined = req.user?.id;
    const result = await this.service.evaluate(key, userId);
    this.exposure.log(key, userId, result);
    return { key, enabled: result };
  }

  /** Batch evaluate flags */
  @Post('evaluate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async evaluateBatch(@Body() body: { keys: string[] }, @Req() req: any) {
    const userId: string | undefined = req.user?.id;
    const results: Record<string, boolean> = {};
    for (const key of body.keys) {
      results[key] = await this.service.evaluate(key, userId);
      this.exposure.log(key, userId, results[key]);
    }
    return results;
  }

  /** Admin: list all flags */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll() {
    return this.service.findAll();
  }

  /** Admin: create or update flag */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  upsert(@Body() body: Partial<FeatureFlag>) {
    return this.service.upsert(body);
  }

  /** Admin: delete flag */
  @Delete(':key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('key') key: string) {
    return this.service.remove(key);
  }
}
