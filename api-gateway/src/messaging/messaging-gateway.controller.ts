import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  UseGuards, Request,
} from '@nestjs/common';
import { HttpClientService } from '../http/http.service';
import { JwtAuthGuard } from '../guards/jwt.guard';

const MSG_URL = () => process.env.MESSAGING_SERVICE_URL || 'http://localhost:3005';

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagingGatewayController {
  constructor(private readonly http: HttpClientService) {}

  // ── Mensajes grupales ──────────────────────────────────────────

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Request() req: any) {
    return this.http.post(`${MSG_URL()}/messages`, {
      ...body,
      senderId: req.user.sub,
    });
  }

  @Get('messages/group/:groupId')
  async getGroupMessages(
    @Param('groupId') groupId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.http.get(`${MSG_URL()}/messages/group/${groupId}?limit=${limit}&offset=${offset}`);
  }

  @Get('messages/:id')
  async findById(@Param('id') id: string) {
    return this.http.get(`${MSG_URL()}/messages/${id}`);
  }

  @Put('messages/:id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.http.put(`${MSG_URL()}/messages/${id}`, { ...body, senderId: req.user.sub });
  }

  @Delete('messages/:id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.http.delete(`${MSG_URL()}/messages/${id}`, { data: { senderId: req.user.sub } });
  }

  @Get('messages/:id/status')
  async getStatus(@Param('id') id: string) {
    return this.http.get(`${MSG_URL()}/messages/${id}/status`);
  }

  @Post('messages/:id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.http.post(`${MSG_URL()}/messages/${id}/read`, { userId: req.user.sub });
  }

  // ── Mensajes directos 1-1 ──────────────────────────────────────

  @Post('direct-messages')
  @HttpCode(HttpStatus.CREATED)
  async sendDm(@Body() body: any, @Request() req: any) {
    return this.http.post(`${MSG_URL()}/direct-messages`, { ...body, senderId: req.user.sub });
  }

  @Get('direct-messages/with/:partnerId')
  async getConversation(
    @Param('partnerId') partnerId: string,
    @Request() req: any,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.http.get(
      `${MSG_URL()}/direct-messages/conversation/${req.user.sub}/${partnerId}?limit=${limit}&offset=${offset}`,
    );
  }

  @Get('direct-messages/conversations')
  async getConversationList(@Request() req: any) {
    return this.http.get(`${MSG_URL()}/direct-messages/conversations/${req.user.sub}`);
  }

  @Put('direct-messages/:id')
  async updateDm(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.http.put(`${MSG_URL()}/direct-messages/${id}`, { ...body, senderId: req.user.sub });
  }

  @Delete('direct-messages/:id')
  async deleteDm(@Param('id') id: string, @Request() req: any) {
    return this.http.delete(`${MSG_URL()}/direct-messages/${id}`, { data: { senderId: req.user.sub } });
  }

  @Post('direct-messages/:id/read')
  @HttpCode(HttpStatus.OK)
  async markDmAsRead(@Param('id') id: string, @Request() req: any) {
    return this.http.post(`${MSG_URL()}/direct-messages/${id}/read`, { userId: req.user.sub });
  }

  @Post('direct-messages/with/:senderId/read')
  @HttpCode(HttpStatus.OK)
  async markConversationAsRead(@Param('senderId') senderId: string, @Request() req: any) {
    return this.http.post(
      `${MSG_URL()}/direct-messages/conversation/${senderId}/${req.user.sub}/read`, {},
    );
  }
}