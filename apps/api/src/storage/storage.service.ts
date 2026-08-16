import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export interface StoredFileResult {
  storageKey: string;
  fullPath: string;
  sizeBytes: number;
  category: string;
  filename: string;
}

export interface SaveFileOptions {
  category: 'reports' | 'customers' | 'sensors' | 'exports' | 'temp' | string;
  companyId: string;
  fileId: string;
  filename: string;
  buffer: Buffer;
  subcategory?: string | undefined;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseStorageDir: string;

  constructor(private readonly config: ConfigService) {
    const configuredPath = this.config.get<string>('STORAGE_PATH');
    if (configuredPath) {
      this.baseStorageDir = resolve(configuredPath);
    } else {
      
      this.baseStorageDir = resolve(process.cwd(), '../../storage');
    }
    void this.initCategories();
  }

  private async initCategories() {
    const defaultCategories = ['reports', 'customers', 'sensors', 'exports', 'temp'];
    try {
      await fs.mkdir(this.baseStorageDir, { recursive: true });
      for (const cat of defaultCategories) {
        await fs.mkdir(join(this.baseStorageDir, cat), { recursive: true });
      }
      this.logger.log(`Storage initialized at: ${this.baseStorageDir}`);
    } catch (err) {
      this.logger.error(`Failed to initialize storage categories at ${this.baseStorageDir}:`, err);
    }
  }

  
  async saveCategorizedFile(options: SaveFileOptions): Promise<StoredFileResult> {
    const { category, companyId, subcategory, fileId, filename, buffer } = options;
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedCompany = companyId.replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedFileId = fileId.replace(/[^a-zA-Z0-9._-]/g, '_');

    let storageKey: string;
    if (subcategory) {
      const sanitizedSubcat = subcategory.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
      storageKey = join(category, sanitizedCompany, sanitizedSubcat, sanitizedFileId, sanitizedFilename).replace(/\\/g, '/');
    } else {
      storageKey = join(category, sanitizedCompany, sanitizedFileId, sanitizedFilename).replace(/\\/g, '/');
    }

    const fullPath = resolve(this.baseStorageDir, storageKey);

    await fs.mkdir(dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return {
      storageKey,
      fullPath,
      sizeBytes: buffer.length,
      category,
      filename: sanitizedFilename,
    };
  }

  
  async saveFile(
    companyId: string,
    category: string,
    fileId: string,
    filename: string,
    buffer: Buffer,
    subcategory?: string,
  ): Promise<StoredFileResult> {
    return this.saveCategorizedFile({
      category,
      companyId,
      fileId,
      filename,
      buffer,
      subcategory,
    });
  }

  async getFile(storageKey: string): Promise<Buffer | null> {
    const fullPath = resolve(this.baseStorageDir, storageKey);
    try {
      return await fs.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    const fullPath = resolve(this.baseStorageDir, storageKey);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteFile(storageKey: string): Promise<boolean> {
    const fullPath = resolve(this.baseStorageDir, storageKey);
    try {
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getBaseStorageDir(): string {
    return this.baseStorageDir;
  }

  async clearAllStorage(): Promise<void> {
    const defaultCategories = ['reports', 'customers', 'sensors', 'exports', 'temp'];
    for (const cat of defaultCategories) {
      const catPath = join(this.baseStorageDir, cat);
      try {
        await fs.rm(catPath, { recursive: true, force: true });
        await fs.mkdir(catPath, { recursive: true });
      } catch (err) {
        this.logger.warn(`Failed to clear storage directory for category ${cat}:`, err);
      }
    }
  }
}
