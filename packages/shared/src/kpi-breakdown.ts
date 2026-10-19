import {
  computeFinancialSummary,
  dedupeReservations,
  effectiveGross,
  effectiveOtaFee,
  findCommissionRule,
  stayOverlapsPeriod,
  dateInRange,
  parseIsoDate,
} from './finance';
import type {
  AnalyticsFilters,
  CommissionRuleRow,
  ExpenseRow,
  FinancialSummary,
  PaymentRow,
  PropertyRow,
  ReservationRow,
} from './types';

export type KpiBreakdownExclusion = {
  code:
    | 'DUPLICATE_ROW'
    | 'OUTSIDE_PERIOD'
    | 'UNKNOWN_PROPERTY'
    | 'FOREIGN_CURRENCY'
    | 'NEGATIVE_OTA'
    | 'CANCELLED_ZERO';
  count: number;
};

export type KpiReservationContributor = {
  reservationId: string;
  propertyId: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  status: string;
  effectiveGross: number;
  otaFee: number;
  managementFee: number;
};

export interface KpiBreakdown {
  filters: AnalyticsFilters;
  counts: {
    reservationsRaw: number;
    reservationsDeduped: number;
    reservationsOverlapPeriod: number;
    reservationsInAccrualSum: number;
    paymentsCashLines: number;
    expensesOpexLines: number;
  };
  exclusions: KpiBreakdownExclusion[];
  summary: FinancialSummary;
  topReservations: KpiReservationContributor[];
}

export function computeKpiBreakdown(input: {
  filters: AnalyticsFilters;
  properties: PropertyRow[];
  reservations: ReservationRow[];
  reservationsRaw?: ReservationRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  commissionRules: CommissionRuleRow[];
  validPropertyIds: Set<string>;
}): KpiBreakdown {
  const {
    filters,
    reservations,
    reservationsRaw,
    payments,
    expenses,
    commissionRules,
    validPropertyIds,
  } = input;

  const raw = reservationsRaw ?? reservations;
  const deduped = dedupeReservations(raw);
  const summary = computeFinancialSummary({ ...input, reservations });

  const exclusions: Record<KpiBreakdownExclusion['code'], number> = {
    DUPLICATE_ROW: deduped.droppedDuplicateIds.length,
    OUTSIDE_PERIOD: 0,
    UNKNOWN_PROPERTY: 0,
    FOREIGN_CURRENCY: 0,
    NEGATIVE_OTA: 0,
    CANCELLED_ZERO: 0,
  };

  let overlapCount = 0;
  let inSumCount = 0;
  const contributors: KpiReservationContributor[] = [];

  for (const r of reservations) {
    if (filters.propertyId && r.propertyId !== filters.propertyId) continue;

    const overlaps = stayOverlapsPeriod(r.checkIn, r.checkOut, filters.from, filters.to);
    if (!overlaps) {
      exclusions.OUTSIDE_PERIOD += 1;
      continue;
    }
    overlapCount += 1;

    if (!validPropertyIds.has(r.propertyId)) {
      exclusions.UNKNOWN_PROPERTY += 1;
      continue;
    }
    if (r.currency !== summary.currency) {
      exclusions.FOREIGN_CURRENCY += 1;
      continue;
    }
    if (r.otaFee < 0) {
      exclusions.NEGATIVE_OTA += 1;
      continue;
    }

    const gross = effectiveGross(r);
    const ota = effectiveOtaFee(r);
    if (r.status === 'cancelled') {
      exclusions.CANCELLED_ZERO += 1;
    }

    inSumCount += 1;
    const rule = findCommissionRule(commissionRules, r.propertyId, r.checkIn);
    const mgmt =
      rule && rule.feeBasis === 'gross_booking_value' ? gross * rule.managementFeeRate : 0;

    contributors.push({
      reservationId: r.reservationId,
      propertyId: r.propertyId,
      channel: r.channel,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      effectiveGross: gross,
      otaFee: ota,
      managementFee: mgmt,
    });
  }

  contributors.sort((a, b) => b.effectiveGross - a.effectiveGross);

  const cashLines = payments.filter((p) => {
    if (filters.propertyId && p.propertyId !== filters.propertyId) return false;
    if (!validPropertyIds.has(p.propertyId)) return false;
    if (p.status !== 'received') return false;
    if (p.currency !== summary.currency) return false;
    return dateInRange(
      parseIsoDate(p.paymentDate),
      parseIsoDate(filters.from),
      parseIsoDate(filters.to),
    );
  });

  const opexLines = expenses.filter((e) => {
    if (filters.propertyId && e.propertyId !== filters.propertyId) return false;
    if (!validPropertyIds.has(e.propertyId)) return false;
    if (e.paymentStatus !== 'paid') return false;
    if (e.currency !== summary.currency) return false;
    return dateInRange(
      parseIsoDate(e.expenseDate),
      parseIsoDate(filters.from),
      parseIsoDate(filters.to),
    );
  });

  const exclusionList: KpiBreakdownExclusion[] = (
    Object.entries(exclusions) as [KpiBreakdownExclusion['code'], number][]
  )
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({ code, count }));

  return {
    filters,
    counts: {
      reservationsRaw: raw.length,
      reservationsDeduped: reservations.length,
      reservationsOverlapPeriod: overlapCount,
      reservationsInAccrualSum: inSumCount,
      paymentsCashLines: cashLines.length,
      expensesOpexLines: opexLines.length,
    },
    exclusions: exclusionList,
    summary,
    topReservations: contributors.slice(0, 8),
  };
}
