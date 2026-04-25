// Publisher : user.online, user.offline
// Consumer  : message.created, file.uploaded → actualiza lastSeen
//             message.read                   → broadcast ws
//             direct.message.created         → broadcast ws al receiver
//             direct.message.read            → broadcast ws

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

let presenceServiceRef: any = null;
let presenceGatewayRef: any = null;

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private producerConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'presence-service',
      brokers: (process.env.KAFKA_BROKER || 'localhost:9092')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'presence-service-group' });
  }

  registerPresenceService(svc: any) { presenceServiceRef = svc; }
  registerPresenceGateway(gw: any) { presenceGatewayRef = gw; }

  async onModuleInit() {
    this.startProducerInBackground();
    this.startConsumerInBackground();
  }

  private startProducerInBackground() {
    const loop = async () => {
      let attempt = 0;
      while (!this.producerConnected) {
        try {
          await this.producer.connect();
          this.producerConnected = true;
          this.logger.log('✅ Kafka Producer conectado');
        } catch (err) {
          attempt++;
          const wait = Math.min(5000 * attempt, 30000);
          this.logger.warn(
            `Kafka producer no disponible (intento ${attempt}), reintento en ${wait / 1000}s…`,
          );
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    };
    void loop();
  }

  private startConsumerInBackground() {
    const topics = [
      'message.created',
      'file.uploaded',
      'message.read',
      'direct.message.created',
      'direct.message.read',
    ];
    const run = async () => {
      let attempt = 0;
      for (;;) {
        try {
          await this.consumer.connect();
          await this.consumer.subscribe({ topics, fromBeginning: false });
          this.logger.log('✅ Kafka Consumer suscrito (5 topics)');
          await this.consumer.run({
            eachMessage: async ({ topic, message }) => {
              try {
                const payload = JSON.parse(message.value?.toString() || '{}');
                this.logger.debug(`📥 [${topic}]`);

                if (topic === 'message.created' && payload.senderId) {
                  await presenceServiceRef?.updateLastSeen(payload.senderId);
                  presenceGatewayRef?.broadcastGroupMessage(payload.groupId, payload);
                }

                if (topic === 'file.uploaded' && payload.userId) {
                  await presenceServiceRef?.updateLastSeen(payload.userId);
                }

                if (topic === 'message.read') {
                  if (payload.groupId) {
                    presenceGatewayRef?.broadcastMessageRead(payload.groupId, {
                      messageId: payload.messageId,
                      userId: payload.userId,
                      timestamp: payload.timestamp,
                    });
                  }
                }

                if (topic === 'direct.message.created') {
                  presenceGatewayRef?.broadcastDirectMessage(payload.receiverId, payload);
                  await presenceServiceRef?.updateLastSeen(payload.senderId);
                }

                if (topic === 'direct.message.read') {
                  presenceGatewayRef?.broadcastDmRead(payload.userId, {
                    messageId: payload.messageId,
                    userId: payload.userId,
                    timestamp: payload.timestamp,
                  });
                }
              } catch (err) {
                this.logger.error(`Error procesando evento [${topic}]: ${err.message}`);
              }
            },
          });
        } catch (err) {
          attempt++;
          const wait = Math.min(5000 * attempt, 30000);
          this.logger.warn(
            `Kafka consumer error: ${(err as Error).message} — reintento en ${wait / 1000}s…`,
          );
          try {
            await this.consumer.disconnect();
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    };
    void run();
  }

  async onModuleDestroy() {
    if (this.producerConnected) await this.producer.disconnect();
    try {
      await this.consumer.disconnect();
    } catch {
      // ignore
    }
  }

  async emitUserOnline(payload: { userId: string; timestamp: string }) {
    await this.emit('user.online', { ...payload, status: 'online' });
  }

  async emitUserOffline(payload: { userId: string; timestamp: string }) {
    await this.emit('user.offline', { ...payload, status: 'offline' });
  }

  private async emit(topic: string, payload: any) {
    if (!this.producerConnected) {
      this.logger.warn(`Kafka no conectado, descartando [${topic}]`);
      return;
    }
    try {
      await this.producer.send({
        topic,
        messages: [{
          key: payload.userId || 'default',
          value: JSON.stringify({ event: topic, ...payload }),
        }],
      });
      this.logger.log(`📤 Evento publicado → [${topic}]`);
    } catch (error) {
      this.logger.error(`❌ Error publicando [${topic}]: ${error.message}`);
    }
  }
}
