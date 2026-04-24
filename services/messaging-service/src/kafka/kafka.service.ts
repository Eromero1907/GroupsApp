import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

/** Solo producer; el consumer de eventos de grupo vive en GroupEventsConsumerService. */
@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'messaging-service',
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

  // ── Mensajes grupales ─────────────────────────────────────────
  async emitMessageCreated(payload: {
    messageId: string; groupId: string; senderId: string; content: string; timestamp: string;
  }) { await this.emit('message.created', payload); }

  async emitMessageRead(payload: {
    messageId: string; userId: string; timestamp: string;
  }) { await this.emit('message.read', payload); }

  // ── Mensajes directos 1-1 ─────────────────────────────────────
  async emitDirectMessageCreated(payload: {
    messageId: string; senderId: string; receiverId: string; content: string; timestamp: string;
  }) { await this.emit('direct.message.created', payload); }

  async emitDirectMessageRead(payload: {
    messageId: string; userId: string; timestamp: string;
  }) { await this.emit('direct.message.read', payload); }

  private async emit(topic: string, payload: any) {
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: payload.messageId || payload.groupId || payload.senderId || 'default',
          value: JSON.stringify({ event: topic, ...payload }),
        }],
      });
      this.logger.log(`📤 Evento publicado → [${topic}]`);
    } catch (error) {
      this.logger.error(`❌ Error publicando [${topic}]: ${error.message}`);
    }
  }
}
