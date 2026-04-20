// Mensajería directa 1-1
// Valida (opcionalmente) que los dos usuarios sean contactos via users-service
// Publica eventos direct.message.created y direct.message.read a Kafka

import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectMessage, DirectMessageStatus } from './entities/direct-message.entity';
import { KafkaService } from '../kafka/kafka.service';
import { HttpClientService } from '../common/http-client.service';

@Injectable()
export class DirectMessagesService {
  private readonly logger = new Logger(DirectMessagesService.name);
  private readonly usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3002';

  constructor(
    @InjectRepository(DirectMessage)
    private dmRepository: Repository<DirectMessage>,
    private readonly kafkaService: KafkaService,
    private readonly httpClient: HttpClientService,
  ) {}

  async send(content: string, senderId: string, receiverId: string, mediaId?: string) {
    const dm = this.dmRepository.create({
      content,
      senderId,
      receiverId,
      mediaId: mediaId || null,
      status: DirectMessageStatus.SENT,
    });
    const saved = await this.dmRepository.save(dm);

    await this.kafkaService.emitDirectMessageCreated({
      messageId: saved.id,
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`DM ${saved.id}: ${senderId} → ${receiverId}`);
    return saved;
  }

  /** Conversación entre dos usuarios (mensajes de ambos lados) */
  async getConversation(userA: string, userB: string, limit = 50, offset = 0) {
    const [messages, total] = await this.dmRepository
      .createQueryBuilder('dm')
      .where(
        '(dm.senderId = :a AND dm.receiverId = :b) OR (dm.senderId = :b AND dm.receiverId = :a)',
        { a: userA, b: userB },
      )
      .orderBy('dm.createdAt', 'DESC')
      .take(Math.min(limit, 100))
      .skip(offset)
      .getManyAndCount();

    return { messages, total, limit, offset };
  }

  /** Lista de conversaciones activas del usuario (último mensaje de cada interlocutor) */
  async getConversationList(userId: string) {
    // Obtenemos todos los IDs de personas con quienes el usuario ha hablado
    const sent = await this.dmRepository
      .createQueryBuilder('dm')
      .select('dm.receiverId', 'partnerId')
      .addSelect('MAX(dm.createdAt)', 'lastAt')
      .where('dm.senderId = :userId', { userId })
      .groupBy('dm.receiverId')
      .getRawMany();

    const received = await this.dmRepository
      .createQueryBuilder('dm')
      .select('dm.senderId', 'partnerId')
      .addSelect('MAX(dm.createdAt)', 'lastAt')
      .where('dm.receiverId = :userId', { userId })
      .groupBy('dm.senderId')
      .getRawMany();

    // Combinar y deduplicar
    const partnerMap = new Map<string, Date>();
    [...sent, ...received].forEach(({ partnerId, lastAt }) => {
      const existing = partnerMap.get(partnerId);
      const date = new Date(lastAt);
      if (!existing || date > existing) partnerMap.set(partnerId, date);
    });

    const conversations = await Promise.all(
      Array.from(partnerMap.entries()).map(async ([partnerId, lastAt]) => {
        const lastMessage = await this.dmRepository.findOne({
          where: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
          order: { createdAt: 'DESC' },
        });
        const unreadCount = await this.dmRepository.count({
          where: { senderId: partnerId, receiverId: userId, status: DirectMessageStatus.SENT },
        });
        return { partnerId, lastMessage, unreadCount, lastAt };
      }),
    );

    return conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }

  async findById(id: string) {
    const dm = await this.dmRepository.findOne({ where: { id } });
    if (!dm) throw new NotFoundException(`Mensaje ${id} no encontrado`);
    return dm;
  }

  async update(id: string, content: string, senderId: string) {
    const dm = await this.findById(id);
    if (dm.senderId !== senderId) throw new ForbiddenException('Solo puedes editar tus propios mensajes');
    dm.content = content;
    dm.isEdited = true;
    return this.dmRepository.save(dm);
  }

  async delete(id: string, senderId: string) {
    const dm = await this.findById(id);
    if (dm.senderId !== senderId) throw new ForbiddenException('Solo puedes eliminar tus propios mensajes');
    await this.dmRepository.remove(dm);
    return { message: `Mensaje ${id} eliminado` };
  }

  async markAsRead(messageId: string, userId: string) {
    const dm = await this.findById(messageId);
    if (dm.receiverId !== userId) throw new ForbiddenException('Solo el destinatario puede marcar como leído');
    dm.status = DirectMessageStatus.READ;
    const saved = await this.dmRepository.save(dm);

    await this.kafkaService.emitDirectMessageRead({
      messageId,
      userId,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }

  async markConversationAsRead(senderId: string, receiverId: string) {
    await this.dmRepository
      .createQueryBuilder()
      .update(DirectMessage)
      .set({ status: DirectMessageStatus.READ })
      .where('senderId = :senderId AND receiverId = :receiverId AND status = :status', {
        senderId,
        receiverId,
        status: DirectMessageStatus.SENT,
      })
      .execute();
    return { message: 'Conversación marcada como leída' };
  }
}
