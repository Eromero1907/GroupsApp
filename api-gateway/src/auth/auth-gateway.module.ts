// src/auth/auth-gateway.module.ts
import { Module } from '@nestjs/common';
import { AuthGatewayController } from './auth-gateway.controller';
import { HttpModule } from '../http/http.module';

@Module({
  imports: [HttpModule],
  controllers: [AuthGatewayController],
})
export class AuthGatewayModule {}
