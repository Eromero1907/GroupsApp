// Mensajería directa 1-1 entre usuarios
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum DirectMessageStatus {
  SENT      = 'sent',
  DELIVERED = 'delivered',
  READ      = 'read',
}

@Entity('direct_messages')
export class DirectMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column()
  senderId: string;   // UUID sin FK cross-service

  @Column()
  receiverId: string; // UUID sin FK cross-service

  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'enum', enum: DirectMessageStatus, default: DirectMessageStatus.SENT })
  status: DirectMessageStatus;

  /** ID del archivo adjunto (referencia al media-service) */
  @Column({ nullable: true })
  mediaId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
