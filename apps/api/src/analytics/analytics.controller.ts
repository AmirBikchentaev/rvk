import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsQueryDto } from '../common/dto/analytics-query.dto';
import { PropertyValidationService } from '../common/property-validation.service';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@Throttle({ default: { limit: 180, ttl: 60_000 } })
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly properties: PropertyValidationService,
  ) {}

  @Get()
  routes() {
    return {
      ok: true,
      routes: ['summary', 'kpi-breakdown', 'timeseries', 'by-property', 'by-channel', 'period-bounds'],
    };
  }

  @Get('period-bounds')
  async periodBounds(@Query() query: AnalyticsQueryDto) {
    await this.properties.assertKnownProperty(query.propertyId);
    return this.analytics.getPeriodBounds({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('summary')
  async summary(@Query() query: AnalyticsQueryDto) {
    await this.properties.assertKnownProperty(query.propertyId);
    return this.analytics.getSummary({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('kpi-breakdown')
  async kpiBreakdown(@Query() query: AnalyticsQueryDto) {
    await this.properties.assertKnownProperty(query.propertyId);
    return this.analytics.getKpiBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('timeseries')
  async timeseries(@Query() query: AnalyticsQueryDto) {
    await this.properties.assertKnownProperty(query.propertyId);
    return this.analytics.getTimeseries({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('by-property')
  async byProperty(@Query() query: AnalyticsQueryDto) {
    await this.properties.assertKnownProperty(query.propertyId);
    return this.analytics.getPropertyBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('by-channel')
  async byChannel(@Query() query: AnalyticsQueryDto) {
    await this.properties.assertKnownProperty(query.propertyId);
    return this.analytics.getChannelBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }
}
