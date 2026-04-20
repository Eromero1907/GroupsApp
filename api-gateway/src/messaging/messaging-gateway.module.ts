import { Module } from '@nestjs/common';
import { HttpModule } from '../http/http.module';
import { MessagingGatewayController } from './messaging-gateway.controller';

@Module({
  imports: [HttpModule],
  controllers: [MessagingGatewayController],
})
export class MessagingGatewayModule {}
