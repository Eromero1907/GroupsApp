import { Module, OnModuleDestroy } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [KafkaService, KafkaConsumerService],
  exports: [KafkaService],
})
export class KafkaModule implements OnModuleDestroy {
  constructor(private consumerService: KafkaConsumerService) {}

  onModuleDestroy() {
    this.consumerService.onModuleDestroy();
  }
}
