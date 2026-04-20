// group.entity.ts
// IMPORTANTE: En microservicios no importamos entidades de otros servicios.
// Los campos de usuario (adminId, userId) se guardan como UUID strings,
// no como FK con relación ORM. La integridad se mantiene a nivel de aplicación.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupMember } from './group-member.entity';

export enum GroupVisibility {
  PUBLIC  = 'public',   // cualquiera puede ver y unirse
  PRIVATE = 'private',  // solo por invitación del admin
}

export enum GroupJoinPolicy {
  OPEN     = 'open',     // cualquier miembro puede unirse sin aprobación
  APPROVAL = 'approval', // el admin debe aprobar las solicitudes
  INVITE   = 'invite',   // solo por invitación explícita del admin
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Guardamos el UUID del creador sin FK a users (tabla en otro servicio)
  @Column({ nullable: true })
  createdBy: string;

  // ── Opciones de suscripción / acceso ──────────────────────────
  @Column({
    type: 'enum',
    enum: GroupVisibility,
    default: GroupVisibility.PUBLIC,
  })
  visibility: GroupVisibility;

  @Column({
    type: 'enum',
    enum: GroupJoinPolicy,
    default: GroupJoinPolicy.OPEN,
  })
  joinPolicy: GroupJoinPolicy;

  /** Máximo de miembros permitidos (null = sin límite) */
  @Column({ type: 'int', nullable: true })
  maxMembers: number | null;

  /** Descripción breve de las reglas del grupo */
  @Column({ type: 'text', nullable: true })
  rules: string | null;

  // ─────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GroupMember, (gm) => gm.group, {
    cascade: true,
    eager: true,
  })
  members: GroupMember[];
}
