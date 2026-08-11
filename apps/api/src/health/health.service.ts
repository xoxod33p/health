import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export interface HealthStatus {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getStatus(): HealthStatus {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }

  getReadiness(): HealthStatus & { database: 'connected' | 'disconnected' } {
    const connected = this.connection.readyState === 1;
    return { ...this.getStatus(), database: connected ? 'connected' : 'disconnected' };
  }
}
