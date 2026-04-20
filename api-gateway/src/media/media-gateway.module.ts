import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HttpModule } from '../http/http.module';
import { MediaGatewayController } from './media-gateway.controller';

@Module({
  imports: [
    HttpModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [MediaGatewayController],
})
export class MediaGatewayModule {}
