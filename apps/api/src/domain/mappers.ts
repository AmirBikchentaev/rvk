import type {
  CommissionRuleRow,
  ExpenseRow,
  PaymentRow,
  PropertyRow,
  ReservationRow,
} from '@villa/shared';
import { PropertyEntity } from '../entities/property.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { ExpenseEntity } from '../entities/expense.entity';
import { CommissionRuleEntity } from '../entities/commission-rule.entity';

const num = (v: string | number) => Number(v);

export function mapProperty(p: PropertyEntity): PropertyRow {
  return {
    propertyId: p.propertyId,
    propertyName: p.propertyName,
    cluster: p.cluster,
    ownerId: p.ownerId,
    baseCurrency: p.baseCurrency,
  };
}

export function mapReservation(r: ReservationEntity): ReservationRow {
  return {
    reservationId: r.reservationId,
    propertyId: r.propertyId,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    status: r.status as ReservationRow['status'],
    grossBookingValue: num(r.grossBookingValue),
    currency: r.currency,
    otaFee: num(r.otaFee),
    refundAmount: num(r.refundAmount),
    channel: r.channel,
    updatedAt: r.updatedAt,
  };
}

export function mapPayment(p: PaymentEntity): PaymentRow {
  return {
    paymentId: p.paymentId,
    reservationId: p.reservationId,
    propertyId: p.propertyId,
    paymentDate: p.paymentDate,
    amount: num(p.amount),
    currency: p.currency,
    status: p.status,
  };
}

export function mapExpense(e: ExpenseEntity): ExpenseRow {
  return {
    expenseId: e.expenseId,
    propertyId: e.propertyId,
    expenseDate: e.expenseDate,
    category: e.category,
    amount: num(e.amount),
    currency: e.currency,
    paymentStatus: e.paymentStatus,
  };
}

export function mapRule(r: CommissionRuleEntity): CommissionRuleRow {
  return {
    propertyId: r.propertyId,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    managementFeeRate: r.managementFeeRate,
    feeBasis: r.feeBasis as CommissionRuleRow['feeBasis'],
    note: r.note ?? '',
  };
}
