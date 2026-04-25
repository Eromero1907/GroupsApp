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
  private connected = false;

  constructor(private readonly messagesService: MessagesService) {
    this.kafka = new Kafka({
      clientId: 'messaging-service-events',
      brokers: (process.env.KAFKA_BROKER || 'localhost:9092')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
      retry: { initialRetryTime: 300, retries: 10 },
    });
    this.consumer = this.kafka.consumer({ groupId: 'messaging-service-group' });
  }

  async onModuleInit() {
    void this.runWithRetry();
  }

  private async runWithRetry() {
    const topics = ['group.member.removed', 'group.deleted'];
    for (;;) {
      try {
        await this.consumer.connect();
        this.connected = true;
        await this.consumer.subscribe({ topics, fromBeginning: false });
        this.logger.log('✅ Kafka consumer: group.member.removed, group.deleted');
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
      } catch (err) {
        this.connected = false;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Kafka consumer indisponible: ${msg} — reintento en 10s…`);
        try {
          await this.consumer.disconnect();
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }
  }

  async onModuleDestroy() {
    if (this.connected) await this.consumer.disconnect();
  }
}
