import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { UsersService } from '../users/users.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private connected = false;

  constructor(private usersService: UsersService) {
    this.kafka = new Kafka({
      clientId: 'users-service-consumer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { initialRetryTime: 3000, retries: 20 },
    });
    this.consumer = this.kafka.consumer({ groupId: 'users-service-group' });
  }

  async onModuleInit() {
    // Connect in background — don't block app startup if Kafka isn't ready
    this.connectWithRetry();
  }

  private async connectWithRetry() {
    let attempt = 0;
    while (!this.connected) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'user.registered', fromBeginning: false });
        await this.consumer.run({
          eachMessage: async ({ topic, message }) => {
            try {
              const payload = JSON.parse(message.value.toString());
              if (topic === 'user.registered' && payload.userId) {
                await this.usersService.createUserProfile(
                  payload.userId, payload.username, payload.email,
                );
                this.logger.log(`✅ Perfil creado para ${payload.username}`);
              }
            } catch (err) {
              this.logger.error(`Error procesando mensaje: ${err.message}`);
            }
          },
        });
        this.connected = true;
        this.logger.log('✅ Kafka Consumer conectado a user.registered');
      } catch (err) {
        attempt++;
        const wait = Math.min(5000 * attempt, 30000);
        this.logger.warn(`⚠️ Kafka no disponible (intento ${attempt}), reintentando en ${wait / 1000}s…`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.consumer.disconnect();
    }
  }
}