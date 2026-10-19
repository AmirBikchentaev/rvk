import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commission_rules')
export class CommissionRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: string;

  @Column({ name: 'effective_to', type: 'date' })
  effectiveTo!: string;

  @Column({ name: 'management_fee_rate', type: 'double precision' })
  managementFeeRate!: number;

  @Column({ name: 'fee_basis' })
  feeBasis!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;
}
