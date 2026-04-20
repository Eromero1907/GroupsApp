import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GroupsService } from './groups.service';

@Controller()
export class GroupsGrpcController {
  constructor(private readonly groupsService: GroupsService) {}

  @GrpcMethod('GroupsService', 'CheckMembership')
  async checkMembership({ group_id, user_id }: { group_id: string; user_id: string }) {
    const isMember = await this.groupsService.isMember(group_id, user_id);
    const isAdmin  = await this.groupsService.isAdmin(group_id, user_id);
    return { is_member: isMember, is_admin: isAdmin };
  }

  @GrpcMethod('GroupsService', 'GetGroup')
  async getGroup({ group_id }: { group_id: string }) {
    try {
      const g = await this.groupsService.findById(group_id);
      return { id: g.id, name: g.name, description: g.description || '',
               created_by: g.createdBy || '', visibility: g.visibility,
               join_policy: g.joinPolicy, found: true };
    } catch {
      return { id: group_id, name: '', description: '', created_by: '',
               visibility: '', join_policy: '', found: false };
    }
  }

  @GrpcMethod('GroupsService', 'GetGroupMembers')
  async getGroupMembers({ group_id }: { group_id: string }) {
    try {
      const members = await this.groupsService.getMembers(group_id);
      return {
        members: members.map(m => ({
          user_id:   m.userId,
          role:      m.role,
          joined_at: m.joinedAt?.toISOString() || '',
        })),
      };
    } catch {
      return { members: [] };
    }
  }
}
