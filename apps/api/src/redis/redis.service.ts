import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.initClient();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.isConnected = false;
      this.logger.log('Redis client disconnected');
    }
  }

  private initClient() {
    const redisUrl = this.config.get<string>('REDIS_URL') || process.env.REDIS_URL;

    const options: RedisOptions = {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        const delay = Math.min(times * 1000, 15000);
        return delay;
      },
      enableReadyCheck: true,
      reconnectOnError: () => true,
    };

    try {
      if (redisUrl) {
        this.client = new Redis(redisUrl, options as any);
      } else {
        const host = this.config.get<string>('REDIS_HOST') || '127.0.0.1';
        const port = this.config.get<number>('REDIS_PORT') || 6379;
        const password = this.config.get<string>('REDIS_PASSWORD');
        const connConfig: any = {
          ...options,
          host,
          port,
        };
        if (password) {
          connConfig.password = password;
        }
        this.client = new Redis(connConfig);
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Connected to Redis server successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('Redis client is ready for operations');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}. Operating in fallback mode.`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Attempt initial connection asynchronously
      this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Could not establish initial Redis connection: ${err.message}. Fallback mode active.`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Redis initialization skipped: ${err.message}`);
    }
  }

  public isReady(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  public getClient(): Redis | null {
    return this.client;
  }

  public createDuplicateClient(): Redis | null {
    if (!this.client) return null;
    return this.client.duplicate();
  }

  async ping(): Promise<string | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      return await this.client.ping();
    } catch {
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady() || !this.client) return null;
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Redis GET failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (!this.isReady() || !this.client) return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Redis SET failed for key "${key}": ${err.message}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isReady() || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err: any) {
      this.logger.warn(`Redis DEL failed for key "${key}": ${err.message}`);
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.isReady() || !this.client) return 0;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(...keys);
      }
      return 0;
    } catch (err: any) {
      this.logger.warn(`Redis delPattern failed for pattern "${pattern}": ${err.message}`);
      return 0;
    }
  }
}
