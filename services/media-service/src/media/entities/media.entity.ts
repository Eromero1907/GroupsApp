import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  url: string;

  /** Clave del objeto en S3 (null si es modo local) */
  @Column({ nullable: true })
  s3Key: string | null;

  @Column()
  mimeType: string;

  @Column('bigint')
  size: number;

  @Column()
  uploadedBy: string;

  @Column({ nullable: true })
  groupId: string | null;

  /** Mensaje al que está adjunto (opcional) */
  @Column({ nullable: true })
  messageId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
