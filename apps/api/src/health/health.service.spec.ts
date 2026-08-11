import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns a healthy API status', () => {
    const status = new HealthService().getStatus();

    expect(status.status).toBe('ok');
    expect(status.service).toBe('api');
    expect(Number.isNaN(Date.parse(status.timestamp))).toBe(false);
  });
});
