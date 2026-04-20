// src/groups/groups-gateway.module.ts
import { Module } from '@nestjs/common';
import { GroupsGatewayController } from './groups-gateway.controller';
import { HttpModule } from '../http/http.module';

@Module({
  imports: [HttpModule],
  controllers: [GroupsGatewayController],
})
export class GroupsGatewayModule {}
