import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('properties')
export class PropertyEntity {
  @PrimaryColumn({ name: 'property_id' })
  propertyId!: string;

  @Column({ name: 'property_name' })
  propertyName!: string;

  @Column()
  cluster!: string;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @Column({ name: 'base_currency' })
  baseCurrency!: string;
}
