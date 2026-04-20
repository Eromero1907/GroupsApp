import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { MessagesService } from './messages.service';

@Controller()
export class MessagesGrpcController {
  constructor(private readonly messagesService: MessagesService) {}

  @GrpcMethod('MessagingService', 'GetMessage')
  async getMessage({ id }: { id: string }) {
    try {
      const m = await this.messagesService.findById(id);
      return { id: m.id, content: m.content, sender_id: m.senderId,
               group_id: m.groupId, created_at: m.createdAt.toISOString(),
               is_edited: m.isEdited, found: true };
    } catch {
      return { id, content: '', sender_id: '', group_id: '',
               created_at: '', is_edited: false, found: false };
    }
  }

  @GrpcMethod('MessagingService', 'GetGroupMessages')
  async getGroupMessages({ group_id, limit, offset }: { group_id: string; limit: number; offset: number }) {
    const { messages, total } = await this.messagesService.getGroupMessages(
      group_id, limit || 50, offset || 0,
    );
    return {
      messages: messages.map(m => ({
        id: m.id, content: m.content, sender_id: m.senderId,
        group_id: m.groupId, created_at: m.createdAt.toISOString(),
        is_edited: m.isEdited, found: true,
      })),
      total,
    };
  }

  // Streaming: emite mensajes uno a uno (útil para cargar historial en tiempo real)
  @GrpcMethod('MessagingService', 'StreamGroupMessages')
  async streamGroupMessages(
    { group_id, limit, offset }: { group_id: string; limit: number; offset: number },
  ): Promise<Observable<any>> {
    const { messages } = await this.messagesService.getGroupMessages(group_id, limit || 50, offset || 0);
    const subject = new Subject<any>();
    (async () => {
      for (const m of messages) {
        subject.next({
          id: m.id, content: m.content, sender_id: m.senderId,
          group_id: m.groupId, created_at: m.createdAt.toISOString(),
          is_edited: m.isEdited, found: true,
        });
        await new Promise(r => setTimeout(r, 5)); // pequeña pausa entre mensajes
      }
      subject.complete();
    })();
    return subject.asObservable();
  }
}
