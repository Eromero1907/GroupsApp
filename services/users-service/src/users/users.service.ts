import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/user.dto';
import axios from 'axios';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async createUserProfile(userId: string, username: string, email: string) {
    // Upsert — si ya existe no falla
    const existing = await this.usersRepository.findOne({ where: { id: userId } });
    if (existing) return existing;

    const user = this.usersRepository.create({
      id: userId,
      username,
      email,
      displayName: username,
    });
    return this.usersRepository.save(user);
  }

  /** Si el usuario no existe localmente, lo busca en auth-service y lo sincroniza */
  async getUserById(id: string) {
    let user = await this.usersRepository.findOne({ where: { id } });
    if (user) return user;

    // Fallback: buscar en auth-service y crear el perfil localmente
    try {
      const { data } = await axios.get(`${this.authServiceUrl}/auth/user/${id}`);
      if (data?.id) {
        user = await this.createUserProfile(data.id, data.username, data.email);
        this.logger.log(`Perfil sincronizado desde auth-service: ${data.username}`);
        return user;
      }
    } catch (err) {
      this.logger.warn(`No se pudo sincronizar usuario ${id} desde auth-service`);
    }

    throw new BadRequestException('User not found');
  }

  async getUserByUsername(username: string) {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) throw new BadRequestException('User not found');
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new BadRequestException('User not found');
    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  /** Lista todos los usuarios locales + sincroniza los que falten desde auth-service */
  async listUsers() {
    const localUsers = await this.usersRepository.find();

    // Intentar traer todos los usuarios de auth-service para encontrar gaps
    try {
      const { data: authUsers } = await axios.get(`${this.authServiceUrl}/auth/users`);
      if (Array.isArray(authUsers) && authUsers.length > 0) {
        const localIds = new Set(localUsers.map(u => u.id));
        const missing = authUsers.filter((u: any) => !localIds.has(u.id));

        if (missing.length > 0) {
          this.logger.log(`Sincronizando ${missing.length} usuarios faltantes desde auth-service`);
          await Promise.all(
            missing.map((u: any) => this.createUserProfile(u.id, u.username, u.email).catch(() => null))
          );
          return this.usersRepository.find();
        }
      }
    } catch (err) {
      this.logger.warn('No se pudo sincronizar usuarios desde auth-service');
    }

    return localUsers;
  }
}