import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { KafkaService } from '../kafka/kafka.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let kafkaService: { emitUserRegistered: jest.Mock };

  beforeEach(async () => {
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn((u) => u),
      save: jest.fn(),
      find: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('test-jwt'),
      verify: jest.fn(),
    };
    kafkaService = {
      emitUserRegistered: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: KafkaService, useValue: kafkaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('lanza BadRequestException si el usuario ya existe', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          username: 'u',
          email: 'a@a.com',
          password: '12345678',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('crea usuario, emite evento Kafka y devuelve token', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const saved = {
        id: 'new-id',
        username: 'newu',
        email: 'n@e.com',
        password: 'hashed-password',
      };
      usersRepository.save.mockResolvedValue(saved);

      const result = await service.register({
        username: 'newu',
        email: 'n@e.com',
        password: '12345678',
        displayName: 'New',
      });

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(kafkaService.emitUserRegistered).toHaveBeenCalledWith(
        'new-id',
        'newu',
        'n@e.com',
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(result.access_token).toBe('test-jwt');
      expect(result.user).toEqual({
        id: 'new-id',
        username: 'newu',
        email: 'n@e.com',
      });
    });
  });

  describe('login', () => {
    it('lanza UnauthorizedException si no hay usuario', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'a@a.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        username: 'u',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'a@a.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('devuelve token cuando las credenciales son válidas', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        username: 'u',
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'a@a.com',
        password: 'secret12',
      });

      expect(result.access_token).toBe('test-jwt');
      expect(result.user.email).toBe('a@a.com');
    });
  });
});
