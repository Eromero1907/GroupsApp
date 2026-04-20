import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PresenceStatus {
  ONLINE  = 'online',
  OFFLINE = 'offline',
  AWAY    = 'away',
  DND     = 'dnd',
}

@Entity('presence')
export class Presence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // UUID del usuario — sin FK cross-service, indexado para queries rápidas
  @Column({ unique: true })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: PresenceStatus, default: PresenceStatus.OFFLINE })
  status: PresenceStatus;

  // Última vez que el usuario estuvo online
  @Column({ nullable: true })
  lastSeen: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
