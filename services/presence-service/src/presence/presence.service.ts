// presence.service.ts — usa Redis como store primario para presencia en tiempo real.
// PostgreSQL se mantiene para lastSeen persistente (histórico).
// Redis TTL: si el socket se cae sin mandar offline, expira en 90s automáticamente.

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Presence, PresenceStatus } from './entities/presence.entity';
import { KafkaService } from '../kafka/kafka.service';
import { createClient, RedisClientType } from 'redis';

const PRESENCE_TTL = 90; // segundos — si no hay heartbeat, Redis expira

@Injectable()
export class PresenceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private redis: RedisClientType;
  private redisEnabled = false;

  constructor(
    @InjectRepository(Presence)
    private presenceRepository: Repository<Presence>,
    private readonly kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    this.kafkaService.registerPresenceService(this);
    await this.connectRedis();
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
  }

  private async connectRedis() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redis = createClient({
        url,
        socket: { connectTimeout: 3000, reconnectStrategy: false },
      }) as RedisClientType;
      // Silenciar errores de reconexión — el fallback a PG maneja la ausencia de Redis
      this.redis.on('error', () => {});
      await this.redis.connect();
      this.redisEnabled = true;
      this.logger.log(`✅ Redis conectado (${url})`);
    } catch {
      this.redisEnabled = false;
      this.logger.warn('⚠️  Redis no disponible — modo solo PostgreSQL');
    }
  }

  async setStatus(userId: string, status: PresenceStatus) {
    // 1. Redis (tiempo real, con TTL)
    if (this.redisEnabled) {
      const key = `presence:${userId}`;
      if (status === PresenceStatus.OFFLINE) {
        await this.redis.del(key);
      } else {
        await this.redis.setEx(key, PRESENCE_TTL, status);
      }
    }

    // 2. PostgreSQL (persistencia, lastSeen)
    let presence = await this.presenceRepository.findOne({ where: { userId } });
    if (!presence) presence = this.presenceRepository.create({ userId, status });
    else presence.status = status;

    if (status === PresenceStatus.OFFLINE || status === PresenceStatus.AWAY) {
      presence.lastSeen = new Date();
    }
    const saved = await this.presenceRepository.save(presence);
    const formatted = this.formatPresence(saved);

    const timestamp = new Date().toISOString();
    if (status === PresenceStatus.ONLINE) await this.kafkaService.emitUserOnline({ userId, timestamp });
    else if (status === PresenceStatus.OFFLINE) await this.kafkaService.emitUserOffline({ userId, timestamp });

    this.logger.log(`Presencia ${userId} → ${status}`);
    return formatted;
  }

  /** Heartbeat: renueva TTL en Redis sin tocar PG */
  async heartbeat(userId: string) {
    if (!this.redisEnabled) return;
    const key = `presence:${userId}`;
    const existing = await this.redis.get(key);
    if (existing) await this.redis.expire(key, PRESENCE_TTL);
  }

  async getUserPresence(userId: string) {
    // Redis primero (más fresco)
    if (this.redisEnabled) {
      const status = await this.redis.get(`presence:${userId}`);
      if (status) {
        const pg = await this.presenceRepository.findOne({ where: { userId } });
        return { userId, status: status as PresenceStatus, lastSeen: pg?.lastSeen || null };
      }
    }
    // Fallback a PG
    const presence = await this.presenceRepository.findOne({ where: { userId } });
    if (!presence) return { userId, status: PresenceStatus.OFFLINE, lastSeen: null };
    return this.formatPresence(presence);
  }

  async getAllPresence() {
    if (this.redisEnabled) {
      // Leer todas las claves presence:* de Redis
      const keys = await this.redis.keys('presence:*');
      if (keys.length > 0) {
        const values = await this.redis.mGet(keys);
        const pgRecords = await this.presenceRepository.find();
        const pgMap = new Map(pgRecords.map(p => [p.userId, p]));

        return keys.map((k, i) => {
          const userId = k.replace('presence:', '');
          const pg = pgMap.get(userId);
          return { userId, status: values[i] as PresenceStatus, lastSeen: pg?.lastSeen || null };
        });
      }
    }
    const presences = await this.presenceRepository.find();
    return presences.map(this.formatPresence);
  }

  async updateLastSeen(userId: string) {
    if (this.redisEnabled) {
      await this.redis.setEx(`presence:${userId}`, PRESENCE_TTL, PresenceStatus.ONLINE);
    }
    let presence = await this.presenceRepository.findOne({ where: { userId } });
    if (!presence) {
      presence = this.presenceRepository.create({
        userId, status: PresenceStatus.ONLINE, lastSeen: new Date(),
      });
    } else if (presence.status === PresenceStatus.OFFLINE) {
      presence.status = PresenceStatus.ONLINE;
      presence.lastSeen = new Date();
    }
    await this.presenceRepository.save(presence);
  }

  private formatPresence(p: Presence) {
    return { userId: p.userId, status: p.status, lastSeen: p.lastSeen, updatedAt: p.updatedAt };
  }
}