import type { DataQualityIssue, EstimateNote } from '@villa/shared';
import type { Dictionary } from '@/lib/i18n/dictionaries';

function fill(template: string, params: Record<string, string>) {
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, v),
    template,
  );
}

export function formatEstimateNote(note: EstimateNote, t: Dictionary): string {
  switch (note.code) {
    case 'RESERVATION_FX_EXCLUDED':
      return fill(t.estimateReservationFxExcluded, {
        id: note.reservationId,
        currency: note.currency,
      });
    case 'RESERVATION_NEGATIVE_OTA':
      return fill(t.estimateReservationNegativeOta, { id: note.reservationId });
    case 'NO_COMMISSION_RULE':
      return fill(t.estimateNoCommissionRule, {
        propertyId: note.propertyId,
        checkIn: note.checkIn,
      });
    case 'PENDING_EXPENSES_EXCLUDED':
      return t.estimatePendingExpensesExcluded;
    case 'OWNER_BALANCE_DISCLAIMER':
      return t.estimateOwnerBalanceDisclaimer;
    default:
      return '';
  }
}

export function formatDataQualityIssue(issue: DataQualityIssue, t: Dictionary): string {
  const p = issue.params ?? {};
  switch (issue.code) {
    case 'DUPLICATE_RESERVATION_ID':
      return t.dqDuplicateReservationId;
    case 'FOREIGN_CURRENCY':
      return fill(t.dqForeignCurrency, { currency: p.currency ?? '?' });
    case 'NEGATIVE_OTA_FEE':
      return t.dqNegativeOtaFee;
    case 'PARTIAL_REFUND':
      return t.dqPartialRefund;
    case 'OVERLAPPING_STAY':
      return fill(t.dqOverlappingStay, { propertyId: p.propertyId ?? '?' });
    case 'DUPLICATE_PAYMENT_ID':
      return t.dqDuplicatePaymentId;
    case 'UNKNOWN_PROPERTY':
      if (issue.entity === 'payment') {
        return fill(t.dqUnknownPropertyPayment, { propertyId: p.propertyId ?? '?' });
      }
      if (issue.entity === 'expense') {
        return fill(t.dqUnknownPropertyExpense, { propertyId: p.propertyId ?? '?' });
      }
      return fill(t.dqUnknownPropertyReservation, { propertyId: p.propertyId ?? '?' });
    default:
      return issue.message;
  }
}

export function formatSeverity(severity: DataQualityIssue['severity'], t: Dictionary): string {
  return severity === 'exclude' ? t.severityExclude : t.severityReview;
}
