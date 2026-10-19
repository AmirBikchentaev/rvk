import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('expenses')
export class ExpenseEntity {
  @PrimaryColumn({ name: 'expense_id' })
  expenseId!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Column()
  category!: string;

  @Column({ type: 'bigint' })
  amount!: string;

  @Column()
  currency!: string;

  @Column({ name: 'payment_status' })
  paymentStatus!: string;
}
