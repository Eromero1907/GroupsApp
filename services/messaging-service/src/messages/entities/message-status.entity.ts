import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MessageStatusEnum {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('message_status')
export class MessageStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string; // UUID sin FK cross-service

  @Column()
  userId: string;    // UUID sin FK cross-service

  @Column({
    type: 'enum',
    enum: MessageStatusEnum,
    default: MessageStatusEnum.SENT,
  })
  status: MessageStatusEnum;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
