import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('payments')
export class PaymentEntity {
  @PrimaryColumn({ name: 'payment_id' })
  paymentId!: string;

  @Column({ name: 'reservation_id' })
  reservationId!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column()
  currency!: string;

  @Column()
  status!: string;
}
