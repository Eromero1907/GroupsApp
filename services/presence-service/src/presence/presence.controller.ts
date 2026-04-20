import {
  Controller, Get, Post, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { PresenceService } from './presence.service';
import { SetPresenceDto } from './dto/presence.dto';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Get()
  async getAllPresence() { return this.presenceService.getAllPresence(); }

  @Get(':userId')
  async getUserPresence(@Param('userId') userId: string) {
    return this.presenceService.getUserPresence(userId);
  }

  @Post(':userId/status')
  @HttpCode(HttpStatus.OK)
  async setStatus(@Param('userId') userId: string, @Body() dto: SetPresenceDto) {
    return this.presenceService.setStatus(userId, dto.status);
  }

  /** Heartbeat: el cliente lo llama cada ~30s para renovar TTL en Redis */
  @Post(':userId/heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  async heartbeat(@Param('userId') userId: string) {
    await this.presenceService.heartbeat(userId);
  }
}
