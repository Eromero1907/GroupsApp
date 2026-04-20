import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessageStatus } from './entities/message-status.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGrpcController } from './messages.grpc.controller';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessagesController } from './direct-messages.controller';
import { KafkaModule } from '../kafka/kafka.module';
import { HttpClientService } from '../common/http-client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageStatus, DirectMessage]),
    KafkaModule,
  ],
  controllers: [MessagesController, MessagesGrpcController, DirectMessagesController],
  providers: [MessagesService, DirectMessagesService, HttpClientService],
})
export class MessagesModule {}