import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column()
  senderId: string;

  @Column()
  groupId: string;

  @Column({ default: false })
  isEdited: boolean;

  /** ID del archivo adjunto en el media-service (nullable) */
  @Column({ nullable: true })
  mediaId: string | null;

  /** URL del archivo — se denormaliza al crear para evitar llamadas al media-service en cada lectura */
  @Column({ nullable: true })
  mediaUrl: string | null;

  /** MIME type del archivo para saber si renderizar como imagen */
  @Column({ nullable: true })
  mediaMimeType: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}