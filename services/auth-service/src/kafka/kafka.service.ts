import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'auth-service',
      brokers: (process.env.KAFKA_BROKER || 'localhost:9092')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.producer = this.kafka.producer();
  }

  private connected = false;

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

  async emit(topic: string, payload: any) {
    if (!this.connected) {
      this.logger.warn(`Kafka no conectado, descartando [${topic}]`);
      return;
    }
    try {
      await this.producer.send({
        topic,
        messages: [{ key: null, value: JSON.stringify(payload) }],
      });
      this.logger.log(`📤 Evento publicado → [${topic}]`);
    } catch (error) {
      this.logger.error(`❌ Error publicando [${topic}]: ${error.message}`);
    }
  }

  async emitUserRegistered(userId: string, username: string, email: string) {
    await this.emit('user.registered', {
      userId,
      username,
      email,
      timestamp: new Date().toISOString(),
    });
  }
}
