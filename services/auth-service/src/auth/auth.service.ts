import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { KafkaService } from '../kafka/kafka.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private kafkaService: KafkaService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existing = await this.usersRepository.findOne({
      where: [
        { email: dto.email },
        { username: dto.username }
      ]
    });

    if (existing) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = this.usersRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      displayName: dto.displayName || dto.username,
      isActive: true,
    });

    const savedUser = await this.usersRepository.save(user);

    // Emit user.registered event
    await this.kafkaService.emitUserRegistered(
      savedUser.id,
      savedUser.username,
      savedUser.email,
    );

    // Generate token
    const token = this.jwtService.sign({
      sub: savedUser.id,
      username: savedUser.username,
    });

    return {
      access_token: token,
      user: {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  async listUsers() {
    const users = await this.usersRepository.find();
    return users.map(({ password, ...u }) => u);
  }

  async getUserById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }
}