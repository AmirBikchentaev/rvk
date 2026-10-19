import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('reservations')
@Unique(['reservationId', 'updatedAt'])
export class ReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reservation_id' })
  reservationId!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'check_in', type: 'date' })
  checkIn!: string;

  @Column({ name: 'check_out', type: 'date' })
  checkOut!: string;

  @Column()
  status!: string;

  @Column({ name: 'gross_booking_value', type: 'bigint' })
  grossBookingValue!: string;

  @Column()
  currency!: string;

  @Column({ name: 'ota_fee', type: 'bigint' })
  otaFee!: string;

  @Column({ name: 'refund_amount', type: 'bigint' })
  refundAmount!: string;

  @Column()
  channel!: string;

  @Column({ name: 'updated_at', type: 'date' })
  updatedAt!: string;
}
