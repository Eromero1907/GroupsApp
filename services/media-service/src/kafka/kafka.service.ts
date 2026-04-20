// src/kafka/kafka.service.ts
// Publica: file.uploaded, file.deleted
// Consume: (sin consumidores en esta fase)

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'media-service',
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

  async emitFileUploaded(payload: {
    fileId: string;
    userId: string;
    url: string;
    filename: string;
    groupId?: string;
    messageId?: string;
    timestamp: string;
  }) {
    await this.emit('file.uploaded', payload);
  }

  async emitFileDeleted(payload: {
    fileId: string;
    userId: string;
    timestamp: string;
  }) {
    await this.emit('file.deleted', payload);
  }

  private async emit(topic: string, payload: any) {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: payload.fileId || 'default',
            value: JSON.stringify({ event: topic, ...payload }),
          },
        ],
      });
      this.logger.log(`📤 Evento publicado → [${topic}]`);
    } catch (error) {
      this.logger.error(`❌ Error publicando [${topic}]: ${error.message}`);
    }
  }
}