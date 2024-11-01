import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';
import { Buffer } from 'buffer';

@Injectable()
export class CacheService {
  public logger = new Logger(CacheService.name);
  public defaultTTL: number;
  public maxAllowedTTL: number = 86400; // 24 hours

  constructor(
    @Inject(CACHE_MANAGER) public cacheManager: CacheStore, // Explicitly casting to CacheStore
    public configService: ConfigService,
  ) {
    this.defaultTTL = this.configService.get<number>('ttl.default', 3600);
  }

  // Cache Set Function with Conditional Compression
  async set(
    key: string,
    value: any,
    ttl?: number,
    compress: boolean = false,
  ): Promise<void> {
    const validTTL = this.validateTTL(ttl || this.defaultTTL);
    const dataToStore = compress ? await this.compressIfLarge(value) : value;

    try {
      // Cast cacheManager to the correct CacheStore type (e.g., Redis or in-memory)
      const cacheStore = this.cacheManager as unknown as CacheStore;

      // Now you can safely call the 'set' method
      await cacheStore.set(key, dataToStore, { ttl: validTTL });
      this.logger.log(`Cache set for key: ${key} with TTL: ${validTTL}`);
    } catch (error) {
      this.handleError(error, 'set cache', key);
    }
  }

  // Cache Get Function with Decompression Option and Graceful Fallback
  async get<T>(key: string, decompress: boolean = false): Promise<T | null> {
    try {
      const cacheStore = this.cacheManager as unknown as CacheStore;
      const cachedData = await cacheStore.get<Buffer | T>(key);

      if (cachedData && decompress) {
        try {
          return JSON.parse(await this.decompress(cachedData as Buffer)) as T;
        } catch (error) {
          this.logger.warn(
            `Decompression failed for key: ${key}. Returning raw data.`,
          );
          return cachedData as unknown as T;
        }
      }

      this.logger.log(
        cachedData ? `Cache hit for key: ${key}` : `Cache miss for key: ${key}`,
      );
      return cachedData ? (cachedData as T) : null;
    } catch (error) {
      this.handleError(error, 'get cache', key);
      return null;
    }
  }

  // Fallback mechanism to fetch data when cache miss occurs
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cachedData = await this.get<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Cache miss - fetch new data and cache it
    const newData = await fetchFn();
    await this.set(key, newData, ttl || this.defaultTTL);
    return newData;
  }

  // Conditional Compression for Larger Objects
  private async compressIfLarge(value: object): Promise<Buffer | object> {
    const jsonString = JSON.stringify(value);
    const size = Buffer.byteLength(jsonString);
    if (size > 1024) {
      // Compress only if the data size is larger than 1KB
      this.logger.log(`Compressing data for caching key. Size: ${size} bytes`);
      return await this.compress(value);
    }
    return value;
  }

  // Compression helper (converts object to gzip buffer)
  private async compress(value: any): Promise<Buffer> {
    const gzip = promisify(require('zlib').gzip);
    const jsonString = JSON.stringify(value);
    return gzip(jsonString); // Return buffer
  }

  // Decompression helper (converts gzip buffer to JSON string)
  private async decompress(data: Buffer): Promise<string> {
    const gunzip = promisify(require('zlib').gunzip);
    return (await gunzip(data)).toString(); // Convert buffer to string
  }

  // Cache Clear Function
  async clear(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.log(`Cache cleared for key: ${key}`);
    } catch (error) {
      this.handleError(error, 'clear cache', key);
    }
  }

  // Clear all cache entries
  async clearAll(): Promise<void> {
    const cacheManager = this.cacheManager as unknown as {
      reset: () => Promise<void>;
    };
    if (cacheManager.reset) {
      try {
        await cacheManager.reset();
        this.logger.log('Cache cleared completely.');
      } catch (error) {
        this.handleError(error, 'clear all cache');
      }
    } else {
      this.logger.warn(
        'Cache store does not support reset. Skipping clear all operation.',
      );
    }
  }

  // Cache Clear Many Function
  async clearMany(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.clear(key)));
      this.logger.log(`Cache cleared for multiple keys: ${keys.join(', ')}`);
    } catch (error) {
      this.handleError(error, 'clear cache for multiple keys');
    }
  }

  // Helper function to generate cache keys
  generateCacheKey(...segments: string[]): string {
    return segments.join(':');
  }

  // Method to get TTL for a specific feature
  getTTLForFeature(feature: string): number {
    const ttlMap = this.configService.get<{ [key: string]: number }>('ttl');
    return ttlMap?.[feature] || this.defaultTTL;
  }

  // Helper function to validate TTL
  private validateTTL(ttl: number): number {
    if (isNaN(ttl) || ttl <= 0) {
      this.logger.warn(
        `Invalid TTL value: ${ttl}. Using default TTL: ${this.defaultTTL}`,
      );
      return this.defaultTTL;
    }
    if (ttl > this.maxAllowedTTL) {
      this.logger.warn(
        `TTL value exceeds maximum allowed TTL: ${ttl}. Using max TTL: ${this.maxAllowedTTL}`,
      );
      return this.maxAllowedTTL;
    }
    return ttl;
  }

  // Log cache hit/miss statistics
  async logCacheStats(key: string): Promise<void> {
    const data = await this.get(key);
    if (data) {
      this.logger.log(`Cache hit: ${key}`);
    } else {
      this.logger.log(`Cache miss: ${key}`);
    }
  }

  // Centralized error handler
  private handleError(error: Error, operation: string, key?: string): void {
    const keyInfo = key ? ` for key: ${key}` : '';
    this.logger.error(
      `Failed to ${operation}${keyInfo}: ${error.message}`,
      error.stack,
    );
  }
}
