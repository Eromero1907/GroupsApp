// src/groups/groups.controller.ts

import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, CreateJoinRequestDto, ReviewJoinRequestDto } from './dto/groups.dto';
import { GroupRole } from './entities/group-member.entity';
import { JoinRequestStatus } from './entities/join-request.entity';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto.name, dto.description, dto.createdBy, {
      visibility: dto.visibility,
      joinPolicy: dto.joinPolicy,
      maxMembers: dto.maxMembers,
      rules: dto.rules,
    });
  }

  @Get()
  async findAll(@Query('requesterId') requesterId?: string) {
    return this.groupsService.findAll(requesterId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.groupsService.findById(id);
  }

  @Get(':id/settings')
  async getSettings(@Param('id') id: string) {
    return this.groupsService.getGroupSettings(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto.name, dto.description, {
      visibility: dto.visibility,
      joinPolicy: dto.joinPolicy,
      maxMembers: dto.maxMembers,
      rules: dto.rules,
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.groupsService.delete(id);
  }

  // ── Miembros ───────────────────────────────────────────────────

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.groupsService.getMembers(id);
  }

  /** Endpoint interno: usado por messaging-service para verificar membresía */
  @Get(':groupId/members/:userId/check')
  async checkMembership(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    const isMember = await this.groupsService.isMember(groupId, userId);
    const isAdmin  = await this.groupsService.isAdmin(groupId, userId);
    return { isMember, isAdmin };
  }

  @Post(':groupId/members/:userId')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.groupsService.addMember(groupId, userId, body?.requestedBy);
  }

  /** Admin agrega directamente sin pasar por joinPolicy */
  @Post(':groupId/members/:userId/direct')
  @HttpCode(HttpStatus.CREATED)
  async addMemberDirect(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: { role?: GroupRole },
  ) {
    return this.groupsService.addMemberDirect(groupId, userId, body.role);
  }

  @Delete(':groupId/members/:userId')
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.removeMember(groupId, userId);
  }

  @Put(':groupId/members/:userId/promote')
  async promoteToAdmin(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.groupsService.promoteToAdmin(groupId, userId);
  }

  // ── Solicitudes de membresía ───────────────────────────────────

  @Get(':groupId/join-requests')
  async getJoinRequests(
    @Param('groupId') groupId: string,
    @Query('status') status?: JoinRequestStatus,
  ) {
    return this.groupsService.getJoinRequests(groupId, status);
  }

  @Post(':groupId/join-requests')
  @HttpCode(HttpStatus.CREATED)
  async createJoinRequest(
    @Param('groupId') groupId: string,
    @Body() dto: CreateJoinRequestDto,
  ) {
    return this.groupsService.createJoinRequest(groupId, dto.userId, dto.message);
  }

  @Put('join-requests/:requestId/review')
  async reviewJoinRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewJoinRequestDto,
  ) {
    return this.groupsService.reviewJoinRequest(requestId, dto.status, dto.reviewedBy);
  }
}