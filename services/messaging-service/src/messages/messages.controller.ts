import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/messages.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(
      dto.content, dto.senderId, dto.groupId,
      dto.mediaId, dto.mediaUrl, dto.mediaMimeType,
    );
  }

  @Get('group/:groupId')
  async getGroupMessages(
    @Param('groupId') groupId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.messagesService.getGroupMessages(groupId, Number(limit), Number(offset));
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.messagesService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messagesService.update(id, dto.content, dto.senderId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: { senderId: string }) {
    return this.messagesService.delete(id, body.senderId);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.messagesService.getMessageStatus(id);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.messagesService.markAsRead(id, body.userId);
  }
}