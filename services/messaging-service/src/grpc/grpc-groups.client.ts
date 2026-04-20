import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, ClientGrpc, Transport } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

interface GroupsGrpcService {
  CheckMembership(data: { group_id: string; user_id: string }): Observable<{ is_member: boolean; is_admin: boolean }>;
}

@Injectable()
export class GrpcGroupsClient implements OnModuleInit {
  private readonly logger = new Logger(GrpcGroupsClient.name);
  private groupsGrpc: GroupsGrpcService;

  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'groups',
      protoPath: process.env.GROUPS_PROTO_PATH || '/proto/groups.proto',
      url: process.env.GROUPS_GRPC_URL || 'groups-service:50053',
    },
  })
  private client: ClientGrpc;

  onModuleInit() {
    this.groupsGrpc = this.client.getService<GroupsGrpcService>('GroupsService');
    this.logger.log('✅ gRPC Groups client inicializado');
  }

  async checkMembership(groupId: string, userId: string): Promise<{ is_member: boolean; is_admin: boolean }> {
    try {
      return await lastValueFrom(
        this.groupsGrpc.CheckMembership({ group_id: groupId, user_id: userId }),
      );
    } catch (err) {
      this.logger.warn(`⚠️ gRPC checkMembership falló (${err.message}) — permitiendo por resiliencia`);
      return { is_member: true, is_admin: false };
    }
  }
}