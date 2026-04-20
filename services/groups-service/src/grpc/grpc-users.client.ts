import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, ClientGrpc, Transport } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

interface UsersGrpcService {
  GetUser(data: { id: string }): Observable<{ id: string; username: string; found: boolean }>;
}

@Injectable()
export class GrpcUsersClient implements OnModuleInit {
  private readonly logger = new Logger(GrpcUsersClient.name);
  private usersGrpc: UsersGrpcService;

  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'users',
      protoPath: process.env.USERS_PROTO_PATH || '/proto/users.proto',
      url: process.env.USERS_GRPC_URL || 'users-service:50052',
    },
  })
  private client: ClientGrpc;

  onModuleInit() {
    this.usersGrpc = this.client.getService<UsersGrpcService>('UsersService');
    this.logger.log('✅ gRPC Users client inicializado');
  }

  async userExists(userId: string): Promise<boolean> {
    try {
      const result = await lastValueFrom(this.usersGrpc.GetUser({ id: userId }));
      return result.found;
    } catch (err) {
      this.logger.warn(`⚠️ gRPC GetUser falló (${err.message}) — asumiendo existente`);
      return true;
    }
  }
}