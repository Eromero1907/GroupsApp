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
  private connected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'media-service',
      brokers: (process.env.KAFKA_BROKER || 'localhost:9092')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    this.connectWithRetry();
  }

  private connectWithRetry() {
    const loop = async () => {
      let attempt = 0;
      while (!this.connected) {
        try {
          await this.producer.connect();
          this.connected = true;
          this.logger.log('✅ Kafka Producer conectado');
        } catch (err) {
          attempt++;
          const wait = Math.min(5000 * attempt, 30000);
          this.logger.warn(
            `Kafka no disponible (intento ${attempt}), reintento en ${wait / 1000}s…`,
          );
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    };
    void loop();
  }

  async onModuleDestroy() {
    if (this.connected) await this.producer.disconnect();
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
    if (!this.connected) {
      this.logger.warn(`Kafka no conectado, descartando [${topic}]`);
      return;
    }
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