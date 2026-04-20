import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit,
  MessageBody, ConnectedSocket, WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PresenceService } from './presence.service';
import { PresenceStatus } from './entities/presence.entity';
import { KafkaService } from '../kafka/kafka.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/presence',
  transports: ['websocket', 'polling'],
})
export class PresenceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);
  private userSockets = new Map<string, Set<string>>();
  private socketUser  = new Map<string, string>();

  constructor(
    private readonly presenceService: PresenceService,
    private readonly kafkaService: KafkaService,
  ) {}

  afterInit() {
    // Registrar este gateway en KafkaService para recibir callbacks de eventos Kafka
    this.kafkaService.registerPresenceGateway(this);
    this.logger.log('✅ PresenceGateway inicializado y registrado en KafkaService');
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) { client.disconnect(); return; }

    if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
    this.userSockets.get(userId).add(client.id);
    this.socketUser.set(client.id, userId);

    const presence = await this.presenceService.setStatus(userId, PresenceStatus.ONLINE);
    this.server.emit('presence.update', presence);
    this.logger.log(`🟢 Conectado: ${userId} (socket ${client.id})`);
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUser.get(client.id);
    if (!userId) return;

    this.socketUser.delete(client.id);
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        const presence = await this.presenceService.setStatus(userId, PresenceStatus.OFFLINE);
        this.server.emit('presence.update', presence);
        this.logger.log(`🔴 Desconectado: ${userId}`);
      }
    }
  }

  @SubscribeMessage('presence.set')
  async handleSetPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: PresenceStatus },
  ) {
    const userId = this.socketUser.get(client.id);
    if (!userId) throw new WsException('No autenticado');
    const presence = await this.presenceService.setStatus(userId, data.status);
    this.server.emit('presence.update', presence);
    return presence;
  }

  @SubscribeMessage('join.room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
    client.join(`group:${data.groupId}`);
    return { joined: data.groupId };
  }

  @SubscribeMessage('leave.room')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
    client.leave(`group:${data.groupId}`);
    return { left: data.groupId };
  }

  @SubscribeMessage('typing.start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
    const userId = this.socketUser.get(client.id);
    client.to(`group:${data.groupId}`).emit('typing', { userId, groupId: data.groupId, typing: true });
  }

  @SubscribeMessage('typing.stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string }) {
    const userId = this.socketUser.get(client.id);
    client.to(`group:${data.groupId}`).emit('typing', { userId, groupId: data.groupId, typing: false });
  }

  // ── Llamados desde KafkaService ───────────────────────────────

  broadcastPresence(presence: { userId: string; status: string; lastSeen: Date | null }) {
    this.server.emit('presence.update', presence);
  }

  broadcastMessageRead(groupId: string, payload: { messageId: string; userId: string; timestamp: string }) {
    this.server.to(`group:${groupId}`).emit('message.read', payload);
  }

  broadcastDmRead(receiverId: string, payload: { messageId: string; userId: string; timestamp: string }) {
    const sockets = this.userSockets.get(receiverId);
    if (sockets) sockets.forEach(sid => this.server.to(sid).emit('dm.read', payload));
  }

  broadcastGroupMessage(groupId: string, message: any) {
    this.server.to(`group:${groupId}`).emit('message.new', message);
  }

  broadcastDirectMessage(receiverId: string, message: any) {
    const sockets = this.userSockets.get(receiverId);
    if (sockets) sockets.forEach(sid => this.server.to(sid).emit('dm.new', message));
  }
}
