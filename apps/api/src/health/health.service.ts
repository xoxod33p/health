import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';

export interface HealthStatus {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
  ) {}

  getStatus(): HealthStatus {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }

  getReadiness(): HealthStatus & { database: 'connected' | 'disconnected'; redis: 'connected' | 'offline_fallback' } {
    const connected = this.connection.readyState === 1;
    const redisReady = this.redis.isReady();
    return {
      ...this.getStatus(),
      database: connected ? 'connected' : 'disconnected',
      redis: redisReady ? 'connected' : 'offline_fallback',
    };
  }
}
