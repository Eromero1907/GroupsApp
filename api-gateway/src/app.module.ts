import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HttpModule } from './http/http.module';
import { AuthGatewayModule } from './auth/auth-gateway.module';
import { UsersGatewayModule } from './users/users-gateway.module';
import { GroupsGatewayModule } from './groups/groups-gateway.module';
import { MessagingGatewayModule } from './messaging/messaging-gateway.module';
import { MediaGatewayModule } from './media/media-gateway.module';
import { PresenceGatewayModule } from './presence/presence-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
      signOptions: { expiresIn: '24h' },
    }),
    MulterModule.register({ storage: memoryStorage() }),
    HttpModule,
    AuthGatewayModule,
    UsersGatewayModule,
    GroupsGatewayModule,
    MessagingGatewayModule,
    MediaGatewayModule,
    PresenceGatewayModule,
  ],
})
export class AppModule {}
