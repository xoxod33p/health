import { describe, expect, it } from '@jest/globals';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

describe('StorageService', () => {
  const mockConfigService = {
    get: (_key: string) => undefined,
  } as unknown as ConfigService;

  it('initializes and saves a categorized file', async () => {
    const service = new StorageService(mockConfigService);
    const testBuffer = Buffer.from('test-content', 'utf-8');

    const result = await service.saveCategorizedFile({
      category: 'reports',
      companyId: 'test-company',
      subcategory: 'sensor-inventory',
      fileId: 'rep-001',
      filename: 'test_report.csv',
      buffer: testBuffer,
    });

    expect(result.storageKey).toContain('reports/test-company/sensor-inventory/rep-001/test_report.csv');
    expect(result.sizeBytes).toBe(testBuffer.length);

    const exists = await service.fileExists(result.storageKey);
    expect(exists).toBe(true);

    const retrieved = await service.getFile(result.storageKey);
    expect(retrieved?.toString()).toBe('test-content');

    // Cleanup
    await service.deleteFile(result.storageKey);
    const existsAfterDelete = await service.fileExists(result.storageKey);
    expect(existsAfterDelete).toBe(false);
  });
});
