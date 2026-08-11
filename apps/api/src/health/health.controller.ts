import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthStatus } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getStatus(): HealthStatus {
    return this.healthService.getStatus();
  }

  @Get('live')
  getLiveness(): HealthStatus {
    return this.healthService.getStatus();
  }

  @Get('ready')
  getReadiness(): HealthStatus & { database: 'connected' | 'disconnected' } {
    return this.healthService.getReadiness();
  }
}
