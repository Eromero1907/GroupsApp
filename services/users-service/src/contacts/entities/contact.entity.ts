import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Unique,
} from 'typeorm';

export enum ContactStatus {
  PENDING  = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED  = 'blocked',
}

@Entity('contacts')
@Unique(['ownerId', 'contactId'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column()
  contactId: string;

  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.PENDING })
  status: ContactStatus;

  @Column({ nullable: true })
  nickname: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
