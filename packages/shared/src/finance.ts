import type {
  AnalyticsFilters,
  CommissionRuleRow,
  EstimateNote,
  ExpenseRow,
  FinancialSummary,
  PaymentRow,
  PropertyRow,
  ReservationRow,
} from './types';

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dateInRange(d: Date, from: Date, to: Date): boolean {
  return d >= from && d <= to;
}

/** Stay overlaps [from, to] if any night falls in the window (check-out exclusive). */
export function stayOverlapsPeriod(
  checkIn: string,
  checkOut: string,
  from: string,
  to: string,
): boolean {
  const ci = parseIsoDate(checkIn);
  const co = parseIsoDate(checkOut);
  const f = parseIsoDate(from);
  const t = parseIsoDate(to);
  return ci <= t && co > f;
}

export function dedupeReservations(rows: ReservationRow[]): {
  reservations: ReservationRow[];
  droppedDuplicateIds: string[];
} {
  const byId = new Map<string, ReservationRow>();
  for (const r of rows) {
    const prev = byId.get(r.reservationId);
    if (!prev || parseIsoDate(r.updatedAt) >= parseIsoDate(prev.updatedAt)) {
      byId.set(r.reservationId, r);
    }
  }
  const dropped = rows
    .filter((r) => byId.get(r.reservationId) !== r)
    .map((r) => r.reservationId);
  return { reservations: [...byId.values()], droppedDuplicateIds: [...new Set(dropped)] };
}

export function findCommissionRule(
  rules: CommissionRuleRow[],
  propertyId: string,
  checkIn: string,
): CommissionRuleRow | undefined {
  const d = parseIsoDate(checkIn);
  return rules.find(
    (rule) =>
      rule.propertyId === propertyId &&
      d >= parseIsoDate(rule.effectiveFrom) &&
      d <= parseIsoDate(rule.effectiveTo),
  );
}

export function effectiveGross(r: ReservationRow): number {
  if (r.status === 'cancelled') return 0;
  return Math.max(0, r.grossBookingValue - r.refundAmount);
}

export function effectiveOtaFee(r: ReservationRow): number {
  if (r.status === 'cancelled') return 0;
  return Math.max(0, r.otaFee);
}

export function computeFinancialSummary(input: {
  filters: AnalyticsFilters;
  properties: PropertyRow[];
  reservations: ReservationRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  commissionRules: CommissionRuleRow[];
  validPropertyIds: Set<string>;
}): FinancialSummary {
  const { filters, reservations, payments, expenses, commissionRules, validPropertyIds } =
    input;
  const estimateNotes: EstimateNote[] = [];
  const currency = 'IDR';

  const inScope = reservations.filter((r) => {
    if (filters.propertyId && r.propertyId !== filters.propertyId) return false;
    return stayOverlapsPeriod(r.checkIn, r.checkOut, filters.from, filters.to);
  });

  let grossBookings = 0;
  let otaFees = 0;
  let managementFees = 0;
  let accrualNetBooking = 0;

  for (const r of inScope) {
    if (!validPropertyIds.has(r.propertyId)) continue;
    if (r.currency !== currency) {
      estimateNotes.push({
        code: 'RESERVATION_FX_EXCLUDED',
        reservationId: r.reservationId,
        currency: r.currency,
      });
      continue;
    }
    if (r.otaFee < 0) {
      estimateNotes.push({
        code: 'RESERVATION_NEGATIVE_OTA',
        reservationId: r.reservationId,
      });
      continue;
    }

    const gross = effectiveGross(r);
    const ota = effectiveOtaFee(r);
    grossBookings += gross;
    otaFees += ota;

    const rule = findCommissionRule(commissionRules, r.propertyId, r.checkIn);
    if (!rule) {
      estimateNotes.push({
        code: 'NO_COMMISSION_RULE',
        propertyId: r.propertyId,
        checkIn: r.checkIn,
      });
    } else if (rule.feeBasis === 'gross_booking_value') {
      managementFees += gross * rule.managementFeeRate;
    }

    accrualNetBooking += gross - ota;
  }

  const operationalExpenses = expenses
    .filter((e) => {
      if (filters.propertyId && e.propertyId !== filters.propertyId) return false;
      if (!validPropertyIds.has(e.propertyId)) return false;
      if (e.paymentStatus !== 'paid') return false;
      if (e.currency !== currency) return false;
      return dateInRange(parseIsoDate(e.expenseDate), parseIsoDate(filters.from), parseIsoDate(filters.to));
    })
    .reduce((s, e) => s + e.amount, 0);

  const cashReceived = payments
    .filter((p) => {
      if (filters.propertyId && p.propertyId !== filters.propertyId) return false;
      if (!validPropertyIds.has(p.propertyId)) return false;
      if (p.status !== 'received') return false;
      if (p.currency !== currency) return false;
      return dateInRange(parseIsoDate(p.paymentDate), parseIsoDate(filters.from), parseIsoDate(filters.to));
    })
    .reduce((s, p) => s + p.amount, 0);

  const ownerBalanceEstimate = accrualNetBooking - managementFees - operationalExpenses;
  const cashVsAccrualGap = cashReceived - accrualNetBooking;

  if (operationalExpenses === 0) {
    estimateNotes.push({ code: 'PENDING_EXPENSES_EXCLUDED' });
  }
  estimateNotes.push({ code: 'OWNER_BALANCE_DISCLAIMER' });

  const uniqueNotes = [
    ...new Map(estimateNotes.map((n) => [JSON.stringify(n), n] as const)).values(),
  ];

  return {
    grossBookings,
    otaFees,
    managementFees,
    operationalExpenses,
    ownerBalanceEstimate,
    cashReceived,
    accrualNetBooking,
    cashVsAccrualGap,
    currency,
    isEstimate: uniqueNotes.length > 0,
    estimateNotes: uniqueNotes,
  };
}

/** Fallback when DB is empty — matches bundled demo CSV span. */
export const DEMO_DATA_PERIOD = { from: '2026-09-01', to: '2026-11-30' } as const;

export function computeDatasetDateBounds(input: {
  reservations: ReservationRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
}): { from: string; to: string } {
  const dates: string[] = [];
  for (const r of input.reservations) {
    dates.push(r.checkIn, r.checkOut);
  }
  for (const p of input.payments) {
    dates.push(p.paymentDate);
  }
  for (const e of input.expenses) {
    dates.push(e.expenseDate);
  }
  if (dates.length === 0) return { ...DEMO_DATA_PERIOD };
  dates.sort();
  return { from: dates[0]!, to: dates[dates.length - 1]! };
}
