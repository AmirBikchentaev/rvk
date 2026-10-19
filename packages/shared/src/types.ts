export type ReservationStatus = 'confirmed' | 'cancelled' | 'modified';

export type DataIssueSeverity = 'exclude' | 'review';

export interface PropertyRow {
  propertyId: string;
  propertyName: string;
  cluster: string;
  ownerId: string;
  baseCurrency: string;
}

export interface ReservationRow {
  reservationId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  grossBookingValue: number;
  currency: string;
  otaFee: number;
  refundAmount: number;
  channel: string;
  updatedAt: string;
}

export interface PaymentRow {
  paymentId: string;
  reservationId: string;
  propertyId: string;
  paymentDate: string;
  amount: number;
  currency: string;
  status: string;
}

export interface ExpenseRow {
  expenseId: string;
  propertyId: string;
  expenseDate: string;
  category: string;
  amount: number;
  currency: string;
  paymentStatus: string;
}

export interface CommissionRuleRow {
  propertyId: string;
  effectiveFrom: string;
  effectiveTo: string;
  managementFeeRate: number;
  feeBasis: 'gross_booking_value';
  note: string;
}

export interface AnalyticsFilters {
  propertyId?: string;
  from: string;
  to: string;
}

export type EstimateNote =
  | { code: 'RESERVATION_FX_EXCLUDED'; reservationId: string; currency: string }
  | { code: 'RESERVATION_NEGATIVE_OTA'; reservationId: string }
  | { code: 'NO_COMMISSION_RULE'; propertyId: string; checkIn: string }
  | { code: 'PENDING_EXPENSES_EXCLUDED' }
  | { code: 'OWNER_BALANCE_DISCLAIMER' };

export interface FinancialSummary {
  grossBookings: number;
  otaFees: number;
  managementFees: number;
  operationalExpenses: number;
  ownerBalanceEstimate: number;
  cashReceived: number;
  accrualNetBooking: number;
  cashVsAccrualGap: number;
  currency: string;
  isEstimate: boolean;
  estimateNotes: EstimateNote[];
}

export interface DataQualityIssue {
  code: string;
  severity: DataIssueSeverity;
  entity: string;
  entityId: string;
  /** Legacy English fallback; UI should use code + params with locale. */
  message: string;
  params?: Record<string, string>;
  details?: Record<string, unknown>;
}
