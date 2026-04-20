import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { GroupJoinRequest } from './entities/join-request.entity';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { GroupsGrpcController } from './groups.grpc.controller';
import { KafkaModule } from '../kafka/kafka.module';
import { HttpClientService } from '../common/http-client.service';
import { GrpcUsersClient } from '../grpc/grpc-users.client';

@Module({
  imports: [TypeOrmModule.forFeature([Group, GroupMember, GroupJoinRequest]), KafkaModule],
  controllers: [GroupsController, GroupsGrpcController],
  providers: [GroupsService, HttpClientService, GrpcUsersClient],
})
export class GroupsModule {}
