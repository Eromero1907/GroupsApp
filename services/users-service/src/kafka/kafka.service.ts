import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private connected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'users-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { initialRetryTime: 3000, retries: 20 },
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    // Connect in background — don't crash app if Kafka isn't ready
    this.connectWithRetry();
  }

  private async connectWithRetry() {
    let attempt = 0;
    while (!this.connected) {
      try {
        await this.producer.connect();
        this.connected = true;
        this.logger.log('✅ Kafka Producer conectado');
      } catch (err) {
        attempt++;
        const wait = Math.min(5000 * attempt, 30000);
        this.logger.warn(`⚠️ Kafka Producer no disponible (intento ${attempt}), reintentando en ${wait / 1000}s…`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  async onModuleDestroy() {
    if (this.connected) await this.producer.disconnect();
  }

  async emit(topic: string, payload: any) {
    if (!this.connected) {
      this.logger.warn(`⚠️ Kafka no conectado, descartando evento [${topic}]`);
      return;
    }
    try {
      await this.producer.send({
        topic,
        messages: [{ key: null, value: JSON.stringify(payload) }],
      });
    } catch (error) {
      this.logger.error(`❌ Error publicando [${topic}]: ${error.message}`);
    }
  }
}