import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { dedupeReservations } from '@villa/shared';
import { Repository } from 'typeorm';
import { loadCsv } from './csv-loader';
import { PropertyEntity } from '../entities/property.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import { PaymentEntity } from '../entities/payment.entity';
import { ExpenseEntity } from '../entities/expense.entity';
import { CommissionRuleEntity } from '../entities/commission-rule.entity';

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(PropertyEntity) private readonly properties: Repository<PropertyEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservations: Repository<ReservationEntity>,
    @InjectRepository(PaymentEntity) private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(ExpenseEntity) private readonly expenses: Repository<ExpenseEntity>,
    @InjectRepository(CommissionRuleEntity)
    private readonly rules: Repository<CommissionRuleEntity>,
  ) {}

  async importFromDirectory(dataDir: string): Promise<{ importedAt: string }> {
    await this.properties.clear();
    await this.reservations.clear();
    await this.payments.clear();
    await this.expenses.clear();
    await this.rules.clear();

    const props = loadCsv(dataDir, 'properties.csv').map((r) => ({
      propertyId: r.property_id,
      propertyName: r.property_name,
      cluster: r.cluster,
      ownerId: r.owner_id,
      baseCurrency: r.base_currency,
    }));
    await this.properties.save(props);

    const rawRes = loadCsv(dataDir, 'reservations.csv').map((r) => ({
      reservationId: r.reservation_id,
      propertyId: r.property_id,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status as 'confirmed' | 'cancelled' | 'modified',
      grossBookingValue: Number(r.gross_booking_value),
      currency: r.currency,
      otaFee: Number(r.ota_fee),
      refundAmount: Number(r.refund_amount),
      channel: r.channel,
      updatedAt: r.updated_at,
    }));
    const { reservations: deduped } = dedupeReservations(rawRes);
    await this.reservations.save(
      deduped.map((r) => ({
        reservationId: r.reservationId,
        propertyId: r.propertyId,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        status: r.status,
        grossBookingValue: String(r.grossBookingValue),
        currency: r.currency,
        otaFee: String(r.otaFee),
        refundAmount: String(r.refundAmount),
        channel: r.channel,
        updatedAt: r.updatedAt,
      })),
    );

    const seenPayments = new Set<string>();
    const pays = loadCsv(dataDir, 'payments.csv')
      .filter((r) => {
        if (seenPayments.has(r.payment_id)) return false;
        seenPayments.add(r.payment_id);
        return true;
      })
      .map((r) => ({
        paymentId: r.payment_id,
        reservationId: r.reservation_id,
        propertyId: r.property_id,
        paymentDate: r.payment_date,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
      }));
    await this.payments.save(pays);

    const exps = loadCsv(dataDir, 'expenses.csv').map((r) => ({
      expenseId: r.expense_id,
      propertyId: r.property_id,
      expenseDate: r.expense_date,
      category: r.category,
      amount: r.amount,
      currency: r.currency,
      paymentStatus: r.payment_status,
    }));
    await this.expenses.save(exps);

    const rules = loadCsv(dataDir, 'commission_rules.csv').map((r) => ({
      propertyId: r.property_id,
      effectiveFrom: r.effective_from,
      effectiveTo: r.effective_to,
      managementFeeRate: Number(r.management_fee_rate),
      feeBasis: r.fee_basis,
      note: r.note ?? null,
    }));
    await this.rules.save(rules);

    return { importedAt: new Date().toISOString() };
  }
}
