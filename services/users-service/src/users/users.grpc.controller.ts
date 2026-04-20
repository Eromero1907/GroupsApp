// gRPC server handler for the users.proto UsersService
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { ContactsService } from '../contacts/contacts.service';

@Controller()
export class UsersGrpcController {
  constructor(
    private readonly usersService: UsersService,
    private readonly contactsService: ContactsService,
  ) {}

  @GrpcMethod('UsersService', 'GetUser')
  async getUser({ id }: { id: string }) {
    try {
      const u = await this.usersService.getUserById(id);
      return { id: u.id, username: u.username, email: u.email,
               displayName: u.displayName || '', avatar: u.avatar || '', found: true };
    } catch {
      return { id, username: '', email: '', displayName: '', avatar: '', found: false };
    }
  }

  @GrpcMethod('UsersService', 'GetUsers')
  async getUsers({ ids }: { ids: string[] }) {
    const users = await Promise.all(
      ids.map(id => this.usersService.getUserById(id).catch(() => null)),
    );
    return {
      users: users
        .filter(Boolean)
        .map(u => ({ id: u.id, username: u.username, email: u.email,
                     displayName: u.displayName || '', avatar: u.avatar || '', found: true })),
    };
  }

  @GrpcMethod('UsersService', 'CheckContacts')
  async checkContacts({ user_a, user_b }: { user_a: string; user_b: string }) {
    const areContacts = await this.contactsService.areContacts(user_a, user_b);
    return { are_contacts: areContacts };
  }
}
