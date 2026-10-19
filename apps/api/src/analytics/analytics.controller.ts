import { Controller, Get, Query } from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { AnalyticsService } from './analytics.service';

class SummaryQueryDto {
  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Quick check that charts routes are registered (GET /api/analytics). */
  @Get()
  ping() {
    return {
      ok: true,
      routes: ['summary', 'timeseries', 'by-property', 'by-channel', 'period-bounds'],
    };
  }

  @Get('period-bounds')
  periodBounds(@Query() query: SummaryQueryDto) {
    return this.analytics.getPeriodBounds({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('summary')
  summary(@Query() query: SummaryQueryDto) {
    return this.analytics.getSummary({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('timeseries')
  timeseries(@Query() query: SummaryQueryDto) {
    return this.analytics.getTimeseries({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('by-property')
  byProperty(@Query() query: SummaryQueryDto) {
    return this.analytics.getPropertyBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('by-channel')
  byChannel(@Query() query: SummaryQueryDto) {
    return this.analytics.getChannelBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }
}
