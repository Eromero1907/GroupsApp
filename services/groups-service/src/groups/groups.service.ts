// src/groups/groups.service.ts
// Lógica de negocio del Groups Service.
// - Soporta opciones de suscripción: visibility, joinPolicy, maxMembers, rules
// - Gestión de solicitudes de membresía (join requests)
// - Llama al users-service (HTTP) para validar que un usuario existe
// - Publica eventos a Kafka tras operaciones relevantes

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, GroupVisibility, GroupJoinPolicy } from './entities/group.entity';
import { GroupMember, GroupRole } from './entities/group-member.entity';
import { GroupJoinRequest, JoinRequestStatus } from './entities/join-request.entity';
import { KafkaService } from '../kafka/kafka.service';
import { HttpClientService } from '../common/http-client.service';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);
  private readonly usersServiceUrl =
    process.env.USERS_SERVICE_URL || 'http://localhost:3002';

  constructor(
    @InjectRepository(Group)
    private groupsRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private groupMembersRepository: Repository<GroupMember>,
    @InjectRepository(GroupJoinRequest)
    private joinRequestsRepository: Repository<GroupJoinRequest>,
    private readonly kafkaService: KafkaService,
    private readonly httpClient: HttpClientService,
  ) {}

  // ─────────────────────────────────────────
  // CRUD de Grupos
  // ─────────────────────────────────────────

  async create(
    name: string,
    description?: string,
    createdBy?: string,
    options?: {
      visibility?: GroupVisibility;
      joinPolicy?: GroupJoinPolicy;
      maxMembers?: number;
      rules?: string;
    },
  ) {
    const group = this.groupsRepository.create({
      name,
      description,
      createdBy,
      visibility: options?.visibility ?? GroupVisibility.PUBLIC,
      joinPolicy: options?.joinPolicy ?? GroupJoinPolicy.OPEN,
      maxMembers: options?.maxMembers ?? null,
      rules: options?.rules ?? null,
    });
    const saved = await this.groupsRepository.save(group);

    // El creador se convierte automáticamente en admin
    if (createdBy) {
      await this.groupMembersRepository.save(
        this.groupMembersRepository.create({
          group: { id: saved.id } as Group,
          userId: createdBy,
          role: GroupRole.ADMIN,
        }),
      );
    }

    await this.kafkaService.emitGroupCreated({
      groupId: saved.id,
      name: saved.name,
      createdBy: createdBy || 'unknown',
      visibility: saved.visibility,
      joinPolicy: saved.joinPolicy,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Grupo creado: ${saved.id} - "${saved.name}" (${saved.visibility}/${saved.joinPolicy})`);
    return saved;
  }

  async findAll(requesterId?: string) {
    const groups = await this.groupsRepository.find();
    // Los grupos privados solo son visibles para sus miembros
    if (!requesterId) return groups.filter(g => g.visibility === GroupVisibility.PUBLIC);
    const memberGroupIds = new Set(
      (await this.groupMembersRepository.find({ 
        where: { userId: requesterId },
        relations: ['group']
      }))
        .map(m => m.group?.id),
    );
    return groups.filter(
      g => g.visibility === GroupVisibility.PUBLIC || memberGroupIds.has(g.id),
    );
  }

  async findById(id: string) {
    const group = await this.groupsRepository.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Grupo ${id} no encontrado`);
    return group;
  }

  async update(
    id: string,
    name?: string,
    description?: string,
    options?: {
      visibility?: GroupVisibility;
      joinPolicy?: GroupJoinPolicy;
      maxMembers?: number | null;
      rules?: string | null;
    },
  ) {
    const group = await this.findById(id);
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (options?.visibility !== undefined) group.visibility = options.visibility;
    if (options?.joinPolicy !== undefined) group.joinPolicy = options.joinPolicy;
    if (options?.maxMembers !== undefined) group.maxMembers = options.maxMembers;
    if (options?.rules !== undefined) group.rules = options.rules;
    return this.groupsRepository.save(group);
  }

  async delete(id: string, requestedBy: string) {
    if (!requestedBy) throw new BadRequestException('requestedBy es requerido');
    await this.findById(id);
    const isAdminUser = await this.isAdmin(id, requestedBy);
    if (!isAdminUser) {
      throw new ForbiddenException('Solo un administrador puede eliminar el grupo');
    }
    await this.groupsRepository.delete(id);
    await this.kafkaService.emitGroupDeleted({
      groupId: id,
      deletedBy: requestedBy,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Grupo eliminado: ${id} por ${requestedBy}`);
    return { message: `Grupo ${id} eliminado correctamente` };
  }

  async getGroupSettings(id: string) {
    const group = await this.findById(id);
    return {
      id: group.id,
      visibility: group.visibility,
      joinPolicy: group.joinPolicy,
      maxMembers: group.maxMembers,
      rules: group.rules,
    };
  }

  // ─────────────────────────────────────────
  // Gestión de Miembros
  // ─────────────────────────────────────────

  async addMember(groupId: string, userId: string, requestedBy?: string) {
    const group = await this.findById(groupId);

    // Verificar límite de miembros
    if (group.maxMembers !== null) {
      const count = await this.groupMembersRepository.count({ where: { group: { id: groupId } } });
      if (count >= group.maxMembers) {
        throw new BadRequestException(`El grupo ha alcanzado el límite de ${group.maxMembers} miembros`);
      }
    }

    // Si el grupo requiere invitación, solo admins pueden agregar directamente
    if (group.joinPolicy === GroupJoinPolicy.INVITE) {
      if (!requestedBy) throw new ForbiddenException('Este grupo solo admite miembros por invitación del administrador');
      const isAdmin = await this.isAdmin(groupId, requestedBy);
      if (!isAdmin) throw new ForbiddenException('Solo un administrador puede agregar miembros a este grupo');
    }

    // Si la política es aprobación, crear solicitud en vez de agregar directo
    if (group.joinPolicy === GroupJoinPolicy.APPROVAL) {
      return this.createJoinRequest(groupId, userId);
    }

    await this.validateUserExists(userId);

    const existing = await this.groupMembersRepository.findOne({
      where: { group: { id: groupId }, userId },
    });
    if (existing) throw new ConflictException('El usuario ya es miembro de este grupo');

    const member = this.groupMembersRepository.create({
      group: { id: groupId } as Group,
      userId,
      role: GroupRole.MEMBER,
    });
    const saved = await this.groupMembersRepository.save(member);

    await this.kafkaService.emitMemberAdded({ groupId, userId, role: GroupRole.MEMBER, timestamp: new Date().toISOString() });
    this.logger.log(`Usuario ${userId} agregado al grupo ${groupId}`);
    return saved;
  }

  /** Agrega un miembro directamente, ignorando la joinPolicy (uso interno/admin) */
  async addMemberDirect(groupId: string, userId: string, role: GroupRole = GroupRole.MEMBER) {
    await this.findById(groupId);
    await this.validateUserExists(userId);

    const existing = await this.groupMembersRepository.findOne({ where: { group: { id: groupId }, userId } });
    if (existing) throw new ConflictException('El usuario ya es miembro de este grupo');

    const member = this.groupMembersRepository.create({
      group: { id: groupId } as Group,
      userId,
      role,
    });
    const saved = await this.groupMembersRepository.save(member);
    await this.kafkaService.emitMemberAdded({ groupId, userId, role, timestamp: new Date().toISOString() });
    return saved;
  }

  async removeMember(groupId: string, userId: string) {
    const member = await this.groupMembersRepository.findOne({ where: { group: { id: groupId }, userId } });
    if (!member) throw new NotFoundException('Miembro no encontrado en este grupo');

    await this.groupMembersRepository.remove(member);
    await this.kafkaService.emitMemberRemoved({ groupId, userId, timestamp: new Date().toISOString() });
    return { message: `Usuario ${userId} removido del grupo ${groupId}` };
  }

  async getMembers(groupId: string) {
    await this.findById(groupId);
    return this.groupMembersRepository.find({ where: { group: { id: groupId } } });
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const member = await this.groupMembersRepository.findOne({ where: { group: { id: groupId }, userId } });
    return !!member;
  }

  async isAdmin(groupId: string, userId: string): Promise<boolean> {
    const member = await this.groupMembersRepository.findOne({ where: { group: { id: groupId }, userId, role: GroupRole.ADMIN } });
    return !!member;
  }

  async promoteToAdmin(groupId: string, userId: string) {
    const member = await this.groupMembersRepository.findOne({ where: { group: { id: groupId }, userId } });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    member.role = GroupRole.ADMIN;
    return this.groupMembersRepository.save(member);
  }

  async demoteFromAdmin(groupId: string, userId: string) {
    const group = await this.findById(groupId);
    
    // Verificar que el usuario no es el creador del grupo
    if (userId === group.createdBy) {
      throw new ForbiddenException('No se puede remover los permisos de administrador del creador del grupo');
    }

    const member = await this.groupMembersRepository.findOne({ where: { group: { id: groupId }, userId } });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    if (member.role !== GroupRole.ADMIN) throw new BadRequestException('Este usuario no es administrador');
    
    member.role = GroupRole.MEMBER;
    return this.groupMembersRepository.save(member);
  }

  // ─────────────────────────────────────────
  // Solicitudes de membresía (Join Requests)
  // ─────────────────────────────────────────

  async createJoinRequest(groupId: string, userId: string, message?: string) {
    await this.findById(groupId);
    await this.validateUserExists(userId);

    const alreadyMember = await this.isMember(groupId, userId);
    if (alreadyMember) throw new ConflictException('Ya eres miembro de este grupo');

    const existingRequest = await this.joinRequestsRepository.findOne({
      where: { group: { id: groupId }, userId, status: JoinRequestStatus.PENDING },
    });
    if (existingRequest) throw new ConflictException('Ya tienes una solicitud pendiente para este grupo');

    const request = this.joinRequestsRepository.create({
      group: { id: groupId } as Group,
      userId,
      message: message || null,
      status: JoinRequestStatus.PENDING,
    });
    const saved = await this.joinRequestsRepository.save(request);
    this.logger.log(`Solicitud de ingreso creada: usuario ${userId} → grupo ${groupId}`);
    return saved;
  }

  async getJoinRequests(groupId: string, status?: JoinRequestStatus) {
    await this.findById(groupId);
    const where: any = { group: { id: groupId } };
    if (status) where.status = status;
    return this.joinRequestsRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async reviewJoinRequest(requestId: string, status: 'approved' | 'rejected', reviewedBy: string) {
    const request = await this.joinRequestsRepository.findOne({
      where: { id: requestId },
      relations: ['group'],
    });
    if (!request) throw new NotFoundException(`Solicitud ${requestId} no encontrada`);
    if (request.status !== JoinRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    request.status = status === 'approved' ? JoinRequestStatus.APPROVED : JoinRequestStatus.REJECTED;
    request.reviewedBy = reviewedBy;
    await this.joinRequestsRepository.save(request);

    if (status === 'approved') {
      await this.addMemberDirect(request.group.id, request.userId);
    }

    return { requestId, status, userId: request.userId, groupId: request.group.id };
  }

  // ─────────────────────────────────────────
  // Helpers inter-servicio
  // ─────────────────────────────────────────

  private async validateUserExists(userId: string): Promise<void> {
    try {
      const user = await this.httpClient.get(`${this.usersServiceUrl}/users/${userId}`);
      if (!user) throw new BadRequestException(`Usuario ${userId} no encontrado`);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn(`⚠️ No se pudo verificar usuario ${userId} en users-service: ${error.message}`);
    }
  }
}