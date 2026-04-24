import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { MessagesService } from './messages.service';

/**
 * Consume eventos del groups-service sin crear dependencias circulares con KafkaService (producer).
 */
@Injectable()
export class GroupEventsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GroupEventsConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(private readonly messagesService: MessagesService) {
    this.kafka = new Kafka({
      clientId: 'messaging-service-events',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.consumer = this.kafka.consumer({ groupId: 'messaging-service-group' });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: ['group.member.removed', 'group.deleted'],
      fromBeginning: false,
    });
    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString() || '{}';
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(raw);
        } catch {
          this.logger.warn(`Payload inválido en [${topic}]`);
          return;
        }
        this.logger.log(`📥 [${topic}] ${raw}`);

        if (topic === 'group.deleted') {
          const groupId = payload.groupId as string | undefined;
          if (groupId) {
            try {
              await this.messagesService.deleteAllMessagesForGroup(groupId);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              this.logger.error(`deleteAllMessagesForGroup(${groupId}): ${msg}`);
            }
          }
        }
      },
    });
    this.logger.log('✅ Kafka consumer: group.member.removed, group.deleted');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
