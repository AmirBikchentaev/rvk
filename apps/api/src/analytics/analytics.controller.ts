import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/auth.types';
import { PropertyAccessService } from '../auth/property-access.service';
import { AnalyticsQueryDto } from '../common/dto/analytics-query.dto';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@Throttle({ default: { limit: 180, ttl: 60_000 } })
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  @Get()
  routes() {
    return {
      ok: true,
      routes: ['summary', 'timeseries', 'by-property', 'by-channel', 'period-bounds'],
    };
  }

  @Get('period-bounds')
  async periodBounds(@Query() query: AnalyticsQueryDto, @CurrentUser() user: JwtUser) {
    this.propertyAccess.assertPortfolioScope(user, query.propertyId);
    await this.propertyAccess.assertPropertyAccess(user, query.propertyId);
    return this.analytics.getPeriodBounds({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('summary')
  async summary(@Query() query: AnalyticsQueryDto, @CurrentUser() user: JwtUser) {
    this.propertyAccess.assertPortfolioScope(user, query.propertyId);
    await this.propertyAccess.assertPropertyAccess(user, query.propertyId);
    return this.analytics.getSummary({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('timeseries')
  async timeseries(@Query() query: AnalyticsQueryDto, @CurrentUser() user: JwtUser) {
    this.propertyAccess.assertPortfolioScope(user, query.propertyId);
    await this.propertyAccess.assertPropertyAccess(user, query.propertyId);
    return this.analytics.getTimeseries({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }

  @Get('by-property')
  async byProperty(@Query() query: AnalyticsQueryDto, @CurrentUser() user: JwtUser) {
    this.propertyAccess.assertPortfolioScope(user, query.propertyId);
    await this.propertyAccess.assertPropertyAccess(user, query.propertyId);
    const rows = await this.analytics.getPropertyBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
    const allowed = await this.propertyAccess.allowedPropertyIds(user);
    if (allowed === 'all') return rows;
    return rows.filter((r) => allowed.has(r.propertyId));
  }

  @Get('by-channel')
  async byChannel(@Query() query: AnalyticsQueryDto, @CurrentUser() user: JwtUser) {
    this.propertyAccess.assertPortfolioScope(user, query.propertyId);
    await this.propertyAccess.assertPropertyAccess(user, query.propertyId);
    return this.analytics.getChannelBreakdown({
      propertyId: query.propertyId,
      from: query.from,
      to: query.to,
    });
  }
}
