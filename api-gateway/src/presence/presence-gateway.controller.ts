// src/presence/presence-gateway.controller.ts
// Rutas de presencia protegidas con JWT → delega al presence-service en :3006

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HttpClientService } from '../http/http.service';
import { JwtAuthGuard } from '../guards/jwt.guard';

const PRESENCE_URL = () =>
  process.env.PRESENCE_SERVICE_URL || 'http://localhost:3006';

@Controller('presence')
@UseGuards(JwtAuthGuard)
export class PresenceGatewayController {
  constructor(private readonly http: HttpClientService) {}

  @Get()
  async getAllPresence() {
    return this.http.get(`${PRESENCE_URL()}/presence`);
  }

  @Get(':userId')
  async getUserPresence(@Param('userId') userId: string) {
    return this.http.get(`${PRESENCE_URL()}/presence/${userId}`);
  }

  @Post(':userId/status')
  @HttpCode(HttpStatus.OK)
  async setStatus(
    @Param('userId') userId: string,
    @Body() body: { status: string },
    @Request() req: any,
  ) {
    // Un usuario solo puede cambiar su propio status
    return this.http.post(
      `${PRESENCE_URL()}/presence/${req.user.sub}/status`,
      body,
    );
  }
}
