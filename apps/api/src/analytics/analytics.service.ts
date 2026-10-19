import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeChannelBreakdown,
  computeDatasetDateBounds,
  computeFinancialSummary,
  computeKpiBreakdown,
  computePropertyBreakdown,
  computeTimeseries,
  dedupeReservations,
  type AnalyticsFilters,
  type FinancialSummary,
} from '@villa/shared';
import { PropertyEntity } from '../entities/property.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { ExpenseEntity } from '../entities/expense.entity';
import { CommissionRuleEntity } from '../entities/commission-rule.entity';
import {
  mapExpense,
  mapPayment,
  mapProperty,
  mapReservation,
  mapRule,
} from '../domain/mappers';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PropertyEntity) private readonly properties: Repository<PropertyEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservations: Repository<ReservationEntity>,
    @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(ExpenseEntity) private readonly expenses: Repository<ExpenseEntity>,
    @InjectRepository(CommissionRuleEntity) private readonly rules: Repository<CommissionRuleEntity>,
  ) {}

  private async loadContext() {
    const properties = (await this.properties.find()).map(mapProperty);
    const validPropertyIds = new Set(properties.map((p) => p.propertyId));
    const rawRes = (await this.reservations.find()).map(mapReservation);
    const { reservations } = dedupeReservations(rawRes);
    return {
      properties,
      validPropertyIds,
      reservations,
      payments: (await this.payments.find()).map(mapPayment),
      expenses: (await this.expenses.find()).map(mapExpense),
      commissionRules: (await this.rules.find()).map(mapRule),
    };
  }

  async getPeriodBounds(partial: {
    propertyId?: string;
    from?: string;
    to?: string;
  }) {
    const ctx = await this.loadContext();
    const dataset = computeDatasetDateBounds({
      reservations: ctx.reservations,
      payments: ctx.payments,
      expenses: ctx.expenses,
    });
    const applied = await this.resolveFilters(partial);
    return {
      datasetFrom: dataset.from,
      datasetTo: dataset.to,
      appliedFrom: applied.from,
      appliedTo: applied.to,
      usingCustomRange: Boolean(partial.from?.trim() || partial.to?.trim()),
    };
  }

  async resolveFilters(partial: {
    propertyId?: string;
    from?: string;
    to?: string;
  }): Promise<AnalyticsFilters> {
    const ctx = await this.loadContext();
    const bounds = computeDatasetDateBounds({
      reservations: ctx.reservations,
      payments: ctx.payments,
      expenses: ctx.expenses,
    });
    return {
      propertyId: partial.propertyId,
      from: partial.from ?? bounds.from,
      to: partial.to ?? bounds.to,
    };
  }

  async getSummary(partial: {
    propertyId?: string;
    from?: string;
    to?: string;
  }): Promise<FinancialSummary> {
    const filters = await this.resolveFilters(partial);
    const ctx = await this.loadContext();
    return computeFinancialSummary({ filters, ...ctx });
  }

  async getKpiBreakdown(partial: {
    propertyId?: string;
    from?: string;
    to?: string;
  }) {
    const filters = await this.resolveFilters(partial);
    const properties = (await this.properties.find()).map(mapProperty);
    const validPropertyIds = new Set(properties.map((p) => p.propertyId));
    const rawRes = (await this.reservations.find()).map(mapReservation);
    const { reservations } = dedupeReservations(rawRes);
    return computeKpiBreakdown({
      filters,
      properties,
      validPropertyIds,
      reservations,
      reservationsRaw: rawRes,
      payments: (await this.payments.find()).map(mapPayment),
      expenses: (await this.expenses.find()).map(mapExpense),
      commissionRules: (await this.rules.find()).map(mapRule),
    });
  }

  async getTimeseries(partial: { propertyId?: string; from?: string; to?: string }) {
    const filters = await this.resolveFilters(partial);
    const ctx = await this.loadContext();
    return computeTimeseries({ filters, ...ctx });
  }

  async getPropertyBreakdown(partial: { propertyId?: string; from?: string; to?: string }) {
    const filters = await this.resolveFilters(partial);
    const ctx = await this.loadContext();
    return computePropertyBreakdown({ filters, ...ctx });
  }

  async getChannelBreakdown(partial: { propertyId?: string; from?: string; to?: string }) {
    const filters = await this.resolveFilters(partial);
    const ctx = await this.loadContext();
    return computeChannelBreakdown({
      filters,
      reservations: ctx.reservations,
      validPropertyIds: ctx.validPropertyIds,
    });
  }

  async listProperties() {
    return (await this.properties.find({ order: { propertyId: 'ASC' } })).map(mapProperty);
  }
}
