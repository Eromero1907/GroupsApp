import {
  Controller, Get, Post, Put, Delete,
  Param, Body, HttpCode, HttpStatus,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { HttpClientService } from '../http/http.service';
import { JwtAuthGuard } from '../guards/jwt.guard';

const GROUPS_URL = () => process.env.GROUPS_SERVICE_URL || 'http://localhost:3003';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsGatewayController {
  constructor(private readonly http: HttpClientService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Request() req: any) {
    return this.http.post(`${GROUPS_URL()}/groups`, { ...body, createdBy: req.user.sub });
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.http.get(`${GROUPS_URL()}/groups?requesterId=${req.user.sub}`);
  }

  @Get(':id')
  async findById(@Param('id') id: string) { return this.http.get(`${GROUPS_URL()}/groups/${id}`); }

  @Get(':id/settings')
  async getSettings(@Param('id') id: string) { return this.http.get(`${GROUPS_URL()}/groups/${id}/settings`); }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.http.put(`${GROUPS_URL()}/groups/${id}`, { ...body, requestedBy: req.user.sub });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) { return this.http.delete(`${GROUPS_URL()}/groups/${id}`); }

  // ── Miembros ───────────────────────────────────────────────────

  @Get(':id/members')
  async getMembers(@Param('id') id: string) { return this.http.get(`${GROUPS_URL()}/groups/${id}/members`); }

  @Post(':groupId/members/:userId')
  @HttpCode(HttpStatus.CREATED)
  async addMember(@Param('groupId') groupId: string, @Param('userId') userId: string, @Request() req: any) {
    return this.http.post(`${GROUPS_URL()}/groups/${groupId}/members/${userId}`, { requestedBy: req.user.sub });
  }

  /** Admin agrega directamente (sin respetar joinPolicy) */
  @Post(':groupId/members/:userId/direct')
  @HttpCode(HttpStatus.CREATED)
  async addMemberDirect(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.http.post(`${GROUPS_URL()}/groups/${groupId}/members/${userId}/direct`, body);
  }

  @Delete(':groupId/members/:userId')
  async removeMember(@Param('groupId') groupId: string, @Param('userId') userId: string) {
    return this.http.delete(`${GROUPS_URL()}/groups/${groupId}/members/${userId}`);
  }

  @Put(':groupId/members/:userId/promote')
  async promoteToAdmin(@Param('groupId') groupId: string, @Param('userId') userId: string) {
    return this.http.put(`${GROUPS_URL()}/groups/${groupId}/members/${userId}/promote`, {});
  }

  @Put(':groupId/members/:userId/demote')
  async demoteFromAdmin(@Param('groupId') groupId: string, @Param('userId') userId: string) {
    return this.http.put(`${GROUPS_URL()}/groups/${groupId}/members/${userId}/demote`, {});
  }

  // ── Solicitudes de membresía ───────────────────────────────────

  @Get(':groupId/join-requests')
  async getJoinRequests(@Param('groupId') groupId: string, @Query('status') status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.http.get(`${GROUPS_URL()}/groups/${groupId}/join-requests${qs}`);
  }

  @Post(':groupId/join-requests')
  @HttpCode(HttpStatus.CREATED)
  async createJoinRequest(@Param('groupId') groupId: string, @Body() body: any, @Request() req: any) {
    return this.http.post(`${GROUPS_URL()}/groups/${groupId}/join-requests`, {
      ...body, userId: req.user.sub,
    });
  }

  @Put('join-requests/:requestId/review')
  async reviewJoinRequest(
    @Param('requestId') requestId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.http.put(`${GROUPS_URL()}/groups/join-requests/${requestId}/review`, {
      ...body, reviewedBy: req.user.sub,
    });
  }
}