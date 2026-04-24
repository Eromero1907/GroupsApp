import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { MessageStatus, MessageStatusEnum } from './entities/message-status.entity';
import { KafkaService } from '../kafka/kafka.service';
import { HttpClientService } from '../common/http-client.service';

const GROUPS_URL = () => process.env.GROUPS_SERVICE_URL || 'http://groups-service:3003';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(MessageStatus)
    private messageStatusRepository: Repository<MessageStatus>,
    private readonly kafkaService: KafkaService,
    private readonly http: HttpClientService,
  ) {}

  /** Verifica membresía via HTTP al groups-service */
  private async checkMembership(groupId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.http.get<{ isMember: boolean }>(
        `${GROUPS_URL()}/groups/${groupId}/members/${userId}/check`,
      );
      return result?.isMember === true;
    } catch (err) {
      this.logger.warn(`⚠️ checkMembership falló (${err.message}) — permitiendo por resiliencia`);
      return true;
    }
  }

  async create(
    content: string,
    senderId: string,
    groupId: string,
    mediaId?: string,
    mediaUrl?: string,
    mediaMimeType?: string,
  ) {
    if (!content?.trim() && !mediaId) {
      throw new BadRequestException('El mensaje debe tener contenido o archivo adjunto');
    }

    const isMember = await this.checkMembership(groupId, senderId);
    if (!isMember) {
      throw new ForbiddenException('No eres miembro de este grupo');
    }

    const message = this.messagesRepository.create({
      content: content || '',
      senderId,
      groupId,
      mediaId: mediaId || null,
      mediaUrl: mediaUrl || null,
      mediaMimeType: mediaMimeType || null,
    });
    const saved = await this.messagesRepository.save(message);

    await this.messageStatusRepository.save(
      this.messageStatusRepository.create({
        messageId: saved.id, userId: senderId, status: MessageStatusEnum.SENT,
      }),
    );

    await this.kafkaService.emitMessageCreated({
      messageId: saved.id, groupId, senderId, content,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Mensaje ${saved.id} en grupo ${groupId}`);
    return saved;
  }

  async getGroupMessages(groupId: string, limit = 50, offset = 0) {
    const [messages, total] = await this.messagesRepository.findAndCount({
      where: { groupId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
      skip: offset,
    });
    return { messages, total, limit, offset };
  }

  async findById(id: string) {
    const message = await this.messagesRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException(`Mensaje ${id} no encontrado`);
    return message;
  }

  async update(id: string, content: string, senderId: string) {
    const message = await this.findById(id);
    if (message.senderId !== senderId) throw new ForbiddenException('Solo puedes editar tus propios mensajes');
    if (!content?.trim()) throw new BadRequestException('El contenido no puede estar vacío');
    message.content = content;
    message.isEdited = true;
    return this.messagesRepository.save(message);
  }

  async delete(id: string, senderId: string) {
    const message = await this.findById(id);
    if (message.senderId !== senderId) throw new ForbiddenException('Solo puedes eliminar tus propios mensajes');
    await this.messagesRepository.remove(message);
    return { message: `Mensaje ${id} eliminado` };
  }

  /** Invocado al recibir group.deleted desde Kafka (grupo borrado en groups-service). */
  async deleteAllMessagesForGroup(groupId: string) {
    const rows = await this.messagesRepository.find({ where: { groupId }, select: ['id'] });
    const ids = rows.map((m) => m.id);
    if (ids.length === 0) {
      this.logger.log(`Sin mensajes que borrar para grupo ${groupId}`);
      return { deletedMessages: 0 };
    }
    await this.messageStatusRepository.delete({ messageId: In(ids) });
    const result = await this.messagesRepository.delete({ groupId });
    const n = result.affected ?? ids.length;
    this.logger.log(`Grupo ${groupId}: eliminados ${n} mensajes y sus estados`);
    return { deletedMessages: n };
  }

  async getMessageStatus(messageId: string) {
    await this.findById(messageId);
    return this.messageStatusRepository.find({ where: { messageId } });
  }

  async markAsRead(messageId: string, userId: string) {
    await this.findById(messageId);
    let status = await this.messageStatusRepository.findOne({ where: { messageId, userId } });
    if (!status) {
      status = this.messageStatusRepository.create({ messageId, userId, status: MessageStatusEnum.READ });
    } else {
      status.status = MessageStatusEnum.READ;
    }
    const saved = await this.messageStatusRepository.save(status);
    await this.kafkaService.emitMessageRead({ messageId, userId, timestamp: new Date().toISOString() });
    return saved;
  }
}