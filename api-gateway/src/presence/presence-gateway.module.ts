// src/presence/presence-gateway.module.ts
import { Module } from '@nestjs/common';
import { PresenceGatewayController } from './presence-gateway.controller';
import { HttpModule } from '../http/http.module';

@Module({
  imports: [HttpModule],
  controllers: [PresenceGatewayController],
})
export class PresenceGatewayModule {}
