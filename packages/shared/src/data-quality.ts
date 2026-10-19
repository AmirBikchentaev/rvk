import type {
  DataQualityIssue,
  ExpenseRow,
  PaymentRow,
  PropertyRow,
  ReservationRow,
} from './types';
import { parseIsoDate, stayOverlapsPeriod } from './finance';

function overlaps(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string,
): boolean {
  return (
    parseIsoDate(aIn) < parseIsoDate(bOut) && parseIsoDate(bIn) < parseIsoDate(aOut)
  );
}

export function scanDataQuality(input: {
  properties: PropertyRow[];
  reservations: ReservationRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const validProps = new Set(input.properties.map((p) => p.propertyId));

  const byResId = new Map<string, ReservationRow[]>();
  for (const r of input.reservations) {
    const list = byResId.get(r.reservationId) ?? [];
    list.push(r);
    byResId.set(r.reservationId, list);
  }
  for (const [id, rows] of byResId) {
    if (rows.length > 1) {
      issues.push({
        code: 'DUPLICATE_RESERVATION_ID',
        severity: 'exclude',
        entity: 'reservation',
        entityId: id,
        message: 'Duplicate reservation_id; keep latest updated_at for aggregates.',
        details: { rows: rows.length, updatedAt: rows.map((r) => r.updatedAt) },
      });
    }
  }

  for (const r of input.reservations) {
    if (!validProps.has(r.propertyId)) {
      issues.push({
        code: 'UNKNOWN_PROPERTY',
        severity: 'exclude',
        entity: 'reservation',
        entityId: r.reservationId,
        message: `Unknown property_id ${r.propertyId}.`,
        params: { propertyId: r.propertyId },
      });
    }
    if (r.currency !== 'IDR') {
      issues.push({
        code: 'FOREIGN_CURRENCY',
        severity: 'review',
        entity: 'reservation',
        entityId: r.reservationId,
        message: `Currency ${r.currency} requires FX conversion.`,
        params: { currency: r.currency },
      });
    }
    if (r.otaFee < 0) {
      issues.push({
        code: 'NEGATIVE_OTA_FEE',
        severity: 'review',
        entity: 'reservation',
        entityId: r.reservationId,
        message: 'Negative OTA fee — likely data entry error.',
      });
    }
    if (r.status === 'cancelled' && r.refundAmount !== r.grossBookingValue && r.refundAmount > 0) {
      issues.push({
        code: 'PARTIAL_REFUND',
        severity: 'review',
        entity: 'reservation',
        entityId: r.reservationId,
        message: 'Cancelled with partial refund — verify policy.',
      });
    }
  }

  const active = input.reservations.filter((r) =>
    ['confirmed', 'modified'].includes(r.status),
  );
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.propertyId !== b.propertyId) continue;
      if (overlaps(a.checkIn, a.checkOut, b.checkIn, b.checkOut)) {
        issues.push({
          code: 'OVERLAPPING_STAY',
          severity: 'review',
          entity: 'reservation',
          entityId: `${a.reservationId}/${b.reservationId}`,
          message: `Overlapping stays on ${a.propertyId}.`,
          params: { propertyId: a.propertyId },
        });
      }
    }
  }

  for (const e of input.expenses) {
    if (!validProps.has(e.propertyId)) {
      issues.push({
        code: 'UNKNOWN_PROPERTY',
        severity: 'exclude',
        entity: 'expense',
        entityId: e.expenseId,
        message: `Unknown property_id ${e.propertyId}.`,
        params: { propertyId: e.propertyId },
      });
    }
  }

  const payById = new Map<string, number>();
  for (const p of input.payments) {
    payById.set(p.paymentId, (payById.get(p.paymentId) ?? 0) + 1);
    if (!validProps.has(p.propertyId)) {
      issues.push({
        code: 'UNKNOWN_PROPERTY',
        severity: 'exclude',
        entity: 'payment',
        entityId: p.paymentId,
        message: `Payment linked to unknown property ${p.propertyId}.`,
        params: { propertyId: p.propertyId },
      });
    }
  }
  for (const [pid, count] of payById) {
    if (count > 1) {
      issues.push({
        code: 'DUPLICATE_PAYMENT_ID',
        severity: 'exclude',
        entity: 'payment',
        entityId: pid,
        message: 'Duplicate payment_id — count once in cash totals.',
        details: { count },
      });
    }
  }

  return issues;
}
