import type {
  AnalyticsFilters,
  CommissionRuleRow,
  ExpenseRow,
  PaymentRow,
  PropertyRow,
  ReservationRow,
} from './types';
import {
  computeFinancialSummary,
  dateInRange,
  effectiveGross,
  effectiveOtaFee,
  findCommissionRule,
  parseIsoDate,
  stayOverlapsPeriod,
} from './finance';

export interface TimeseriesPoint {
  period: string;
  grossBookings: number;
  cashReceived: number;
  managementFees: number;
  operationalExpenses: number;
  accrualNet: number;
}

export interface PropertyBreakdownRow {
  propertyId: string;
  propertyName: string;
  cluster: string;
  grossBookings: number;
  otaFees: number;
  managementFees: number;
  cashReceived: number;
  ownerBalanceEstimate: number;
}

export interface ChannelBreakdownRow {
  channel: string;
  grossBookings: number;
  bookingCount: number;
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function inAnalyticsScope(
  filters: AnalyticsFilters,
  propertyId: string,
  validPropertyIds: Set<string>,
): boolean {
  if (filters.propertyId && propertyId !== filters.propertyId) return false;
  return validPropertyIds.has(propertyId);
}

function reservationEligible(r: ReservationRow, validPropertyIds: Set<string>): boolean {
  if (!validPropertyIds.has(r.propertyId)) return false;
  if (r.currency !== 'IDR') return false;
  if (r.otaFee < 0) return false;
  return true;
}

export function computeTimeseries(input: {
  filters: AnalyticsFilters;
  reservations: ReservationRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  commissionRules: CommissionRuleRow[];
  validPropertyIds: Set<string>;
}): TimeseriesPoint[] {
  const { filters, reservations, payments, expenses, commissionRules, validPropertyIds } =
    input;
  const buckets = new Map<string, TimeseriesPoint>();

  const ensure = (period: string): TimeseriesPoint => {
    let b = buckets.get(period);
    if (!b) {
      b = {
        period,
        grossBookings: 0,
        cashReceived: 0,
        managementFees: 0,
        operationalExpenses: 0,
        accrualNet: 0,
      };
      buckets.set(period, b);
    }
    return b;
  };

  for (const r of reservations) {
    if (!reservationEligible(r, validPropertyIds)) continue;
    if (!stayOverlapsPeriod(r.checkIn, r.checkOut, filters.from, filters.to)) continue;
    if (!inAnalyticsScope(filters, r.propertyId, validPropertyIds)) continue;

    const period = monthKey(r.checkIn);
    const b = ensure(period);
    const gross = effectiveGross(r);
    const ota = effectiveOtaFee(r);
    b.grossBookings += gross;
    b.accrualNet += gross - ota;
    const rule = findCommissionRule(commissionRules, r.propertyId, r.checkIn);
    if (rule) b.managementFees += gross * rule.managementFeeRate;
  }

  for (const p of payments) {
    if (!inAnalyticsScope(filters, p.propertyId, validPropertyIds)) continue;
    if (p.status !== 'received' || p.currency !== 'IDR') continue;
    if (!dateInRange(parseIsoDate(p.paymentDate), parseIsoDate(filters.from), parseIsoDate(filters.to)))
      continue;
    ensure(monthKey(p.paymentDate)).cashReceived += p.amount;
  }

  for (const e of expenses) {
    if (!inAnalyticsScope(filters, e.propertyId, validPropertyIds)) continue;
    if (e.paymentStatus !== 'paid' || e.currency !== 'IDR') continue;
    if (!dateInRange(parseIsoDate(e.expenseDate), parseIsoDate(filters.from), parseIsoDate(filters.to)))
      continue;
    ensure(monthKey(e.expenseDate)).operationalExpenses += e.amount;
  }

  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export function computePropertyBreakdown(input: {
  filters: AnalyticsFilters;
  properties: PropertyRow[];
  reservations: ReservationRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  commissionRules: CommissionRuleRow[];
  validPropertyIds: Set<string>;
}): PropertyBreakdownRow[] {
  const rows: PropertyBreakdownRow[] = [];
  for (const prop of input.properties) {
    if (input.filters.propertyId && prop.propertyId !== input.filters.propertyId) continue;
    const f = { ...input.filters, propertyId: prop.propertyId };
    const summary = computeFinancialSummary({
      filters: f,
      properties: input.properties,
      reservations: input.reservations,
      payments: input.payments,
      expenses: input.expenses,
      commissionRules: input.commissionRules,
      validPropertyIds: input.validPropertyIds,
    });
    rows.push({
      propertyId: prop.propertyId,
      propertyName: prop.propertyName,
      cluster: prop.cluster,
      grossBookings: summary.grossBookings,
      otaFees: summary.otaFees,
      managementFees: summary.managementFees,
      cashReceived: summary.cashReceived,
      ownerBalanceEstimate: summary.ownerBalanceEstimate,
    });
  }
  return rows.sort((a, b) => b.grossBookings - a.grossBookings);
}

export function computeChannelBreakdown(input: {
  filters: AnalyticsFilters;
  reservations: ReservationRow[];
  validPropertyIds: Set<string>;
}): ChannelBreakdownRow[] {
  const map = new Map<string, ChannelBreakdownRow>();
  for (const r of input.reservations) {
    if (!reservationEligible(r, input.validPropertyIds)) continue;
    if (!stayOverlapsPeriod(r.checkIn, r.checkOut, input.filters.from, input.filters.to)) continue;
    if (input.filters.propertyId && r.propertyId !== input.filters.propertyId) continue;
    if (r.status === 'cancelled') continue;

    const row = map.get(r.channel) ?? {
      channel: r.channel,
      grossBookings: 0,
      bookingCount: 0,
    };
    row.grossBookings += effectiveGross(r);
    row.bookingCount += 1;
    map.set(r.channel, row);
  }
  return [...map.values()].sort((a, b) => b.grossBookings - a.grossBookings);
}
