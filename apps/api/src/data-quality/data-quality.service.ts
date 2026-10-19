import { Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { join } from 'path';
import { dedupeReservations, scanDataQuality, type ReservationRow } from '@villa/shared';
import { loadCsv } from '../import/csv-loader';

@Injectable()
export class DataQualityService {
  private dataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), '..', '..', 'data');
  }

  async listIssues() {
    const dir = this.dataDir();
    if (!existsSync(dir)) {
      return { total: 0, issues: [], note: 'DATA_DIR missing' };
    }

    const properties = loadCsv(dir, 'properties.csv').map((r) => ({
      propertyId: r.property_id,
      propertyName: r.property_name,
      cluster: r.cluster,
      ownerId: r.owner_id,
      baseCurrency: r.base_currency,
    }));

    const reservations: ReservationRow[] = loadCsv(dir, 'reservations.csv').map((r) => ({
      reservationId: r.reservation_id,
      propertyId: r.property_id,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status as ReservationRow['status'],
      grossBookingValue: Number(r.gross_booking_value),
      currency: r.currency,
      otaFee: Number(r.ota_fee),
      refundAmount: Number(r.refund_amount),
      channel: r.channel,
      updatedAt: r.updated_at,
    }));

    const payments = loadCsv(dir, 'payments.csv').map((r) => ({
      paymentId: r.payment_id,
      reservationId: r.reservation_id,
      propertyId: r.property_id,
      paymentDate: r.payment_date,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
    }));

    const expenses = loadCsv(dir, 'expenses.csv').map((r) => ({
      expenseId: r.expense_id,
      propertyId: r.property_id,
      expenseDate: r.expense_date,
      category: r.category,
      amount: Number(r.amount),
      currency: r.currency,
      paymentStatus: r.payment_status,
    }));

    const issues = scanDataQuality({ properties, reservations, payments, expenses });
    const { droppedDuplicateIds } = dedupeReservations(reservations);

    return {
      /** @deprecated use issueCount — kept for older clients */
      total: issues.length,
      issueCount: issues.length,
      scannedRows: {
        properties: properties.length,
        reservations: reservations.length,
        payments: payments.length,
        expenses: expenses.length,
      },
      droppedDuplicateReservationRows: droppedDuplicateIds,
      issues,
    };
  }
}
