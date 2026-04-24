import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'groups-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('✅ Kafka Producer conectado');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async emitGroupCreated(payload: {
    groupId: string; name: string; createdBy: string;
    visibility: string; joinPolicy: string; timestamp: string;
  }) { await this.emit('group.created', payload); }

  async emitMemberAdded(payload: {
    groupId: string; userId: string; role: string; timestamp: string;
  }) { await this.emit('group.member.added', payload); }

  async emitMemberRemoved(payload: {
    groupId: string; userId: string; timestamp: string;
  }) { await this.emit('group.member.removed', payload); }

  async emitGroupDeleted(payload: {
    groupId: string; deletedBy: string; timestamp: string;
  }) { await this.emit('group.deleted', payload); }

  private async emit(topic: string, payload: any) {
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: payload.groupId || payload.userId || 'default',
          value: JSON.stringify({ event: topic, ...payload }),
        }],
      });
      this.logger.log(`📤 Evento publicado → [${topic}]`);
    } catch (error) {
      this.logger.error(`❌ Error publicando evento [${topic}]: ${error.message}`);
    }
  }
}
