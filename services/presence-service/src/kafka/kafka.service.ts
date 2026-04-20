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

  constructor() {
    this.kafka = new Kafka({
      clientId: 'presence-service',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'presence-service-group' });
  }

  registerPresenceService(svc: any) { presenceServiceRef = svc; }
  registerPresenceGateway(gw: any) { presenceGatewayRef = gw; }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('✅ Kafka Producer conectado');

    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: [
        'message.created',
        'file.uploaded',
        'message.read',
        'direct.message.created',
        'direct.message.read',
      ],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const payload = JSON.parse(message.value?.toString() || '{}');
          this.logger.debug(`📥 [${topic}]`);

          if (topic === 'message.created' && payload.senderId) {
            await presenceServiceRef?.updateLastSeen(payload.senderId);
            // Broadcast nuevo mensaje a la room del grupo
            presenceGatewayRef?.broadcastGroupMessage(payload.groupId, payload);
          }

          if (topic === 'file.uploaded' && payload.userId) {
            await presenceServiceRef?.updateLastSeen(payload.userId);
          }

          if (topic === 'message.read') {
            // Notificar lectura a la sala del grupo
            if (payload.groupId) {
              presenceGatewayRef?.broadcastMessageRead(payload.groupId, {
                messageId: payload.messageId,
                userId: payload.userId,
                timestamp: payload.timestamp,
              });
            }
          }

          if (topic === 'direct.message.created') {
            // Notificar al receiver del DM
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

    this.logger.log('✅ Kafka Consumer suscrito (5 topics)');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  async emitUserOnline(payload: { userId: string; timestamp: string }) {
    await this.emit('user.online', { ...payload, status: 'online' });
  }

  async emitUserOffline(payload: { userId: string; timestamp: string }) {
    await this.emit('user.offline', { ...payload, status: 'offline' });
  }

  private async emit(topic: string, payload: any) {
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
