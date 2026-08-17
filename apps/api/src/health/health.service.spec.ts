import { HealthService } from './health.service';
import type { Connection } from 'mongoose';
import { describe, expect, it } from '@jest/globals';

describe('HealthService', () => {
  const mockRedis: any = {
    isReady: () => true,
  };

  it('returns a healthy API status', () => {
    const status = new HealthService({ readyState: 1 } as Connection, mockRedis).getStatus();

    expect(status.status).toBe('ok');
    expect(status.service).toBe('api');
    expect(Number.isNaN(Date.parse(status.timestamp))).toBe(false);
  });

  it('returns readiness with database and redis', () => {
    const ready = new HealthService({ readyState: 1 } as Connection, mockRedis).getReadiness();
    expect(ready.database).toBe('connected');
    expect(ready.redis).toBe('connected');
  });
});
