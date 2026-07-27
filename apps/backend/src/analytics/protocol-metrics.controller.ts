import { Controller, Get, Query, ParseEnumPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProtocolMetricsService } from './protocol-metrics.service';
import { MetricInterval } from './protocol-metrics.entity';

const VALID_METRICS = ['registrations', 'tip_volume', 'escrow_throughput', 'dispute_outcomes'] as const;
type ValidMetric = (typeof VALID_METRICS)[number];

@ApiTags('Protocol Metrics')
@Controller('v1/protocol-metrics')
export class ProtocolMetricsController {
  constructor(private readonly svc: ProtocolMetricsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'All-time protocol summary with freshness timestamp' })
  summary() {
    return this.svc.getSummary();
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Time-series data for a protocol metric' })
  @ApiQuery({ name: 'metric', enum: VALID_METRICS })
  @ApiQuery({ name: 'interval', enum: ['hour', 'day', 'week'], required: false })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date' })
  @ApiQuery({ name: 'dimension', required: false, description: 'Asset code or outcome label' })
  async timeSeries(
    @Query('metric') metric: ValidMetric,
    @Query('interval', new DefaultValuePipe('day'), new ParseEnumPipe(Object.fromEntries(['hour', 'day', 'week'].map((v) => [v, v]))))
    interval: MetricInterval,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dimension') dimension?: string,
  ) {
    return this.svc.getTimeSeries({
      metric,
      interval,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      dimension,
    });
  }
}
