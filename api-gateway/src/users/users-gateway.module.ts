import { Module } from '@nestjs/common';
import { HttpModule } from '../http/http.module';
import { UsersGatewayController } from './users-gateway.controller';

@Module({
  imports: [HttpModule],
  controllers: [UsersGatewayController],
})
export class UsersGatewayModule {}
