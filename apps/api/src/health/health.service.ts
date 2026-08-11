import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return { status: 'ok', service: 'api', timestamp: new Date().toISOString() };
  }
}
