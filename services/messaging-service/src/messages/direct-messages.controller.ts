import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { DirectMessagesService } from './direct-messages.service';
import { CreateDirectMessageDto, UpdateDirectMessageDto } from './dto/direct-message.dto';

@Controller('direct-messages')
export class DirectMessagesController {
  constructor(private readonly dmService: DirectMessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async send(@Body() dto: CreateDirectMessageDto) {
    return this.dmService.send(dto.content, dto.senderId, dto.receiverId, dto.mediaId);
  }

  /** Conversación entre dos usuarios */
  @Get('conversation/:userA/:userB')
  async getConversation(
    @Param('userA') userA: string,
    @Param('userB') userB: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.dmService.getConversation(userA, userB, Number(limit), Number(offset));
  }

  /** Lista de conversaciones activas del usuario */
  @Get('conversations/:userId')
  async getConversationList(@Param('userId') userId: string) {
    return this.dmService.getConversationList(userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.dmService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDirectMessageDto) {
    return this.dmService.update(id, dto.content, dto.senderId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: { senderId: string }) {
    return this.dmService.delete(id, body.senderId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.dmService.markAsRead(id, body.userId);
  }

  /** Marcar todos los mensajes de una conversación como leídos */
  @Post('conversation/:senderId/:receiverId/read')
  @HttpCode(HttpStatus.OK)
  async markConversationAsRead(
    @Param('senderId') senderId: string,
    @Param('receiverId') receiverId: string,
  ) {
    return this.dmService.markConversationAsRead(senderId, receiverId);
  }
}
