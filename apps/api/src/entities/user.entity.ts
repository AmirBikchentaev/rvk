import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ default: 'viewer' })
  role!: string;

  /** When role=owner, limits portfolio to properties with this owner_id. */
  @Column({ name: 'owner_id', nullable: true, type: 'varchar' })
  ownerId?: string | null;
}
