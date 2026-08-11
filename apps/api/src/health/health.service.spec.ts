import { HealthService } from './health.service';
import type { Connection } from 'mongoose';
import { describe, expect, it } from '@jest/globals';

describe('HealthService', () => {
  it('returns a healthy API status', () => {
    const status = new HealthService({ readyState: 1 } as Connection).getStatus();

    expect(status.status).toBe('ok');
    expect(status.service).toBe('api');
    expect(Number.isNaN(Date.parse(status.timestamp))).toBe(false);
  });
});
