import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheSetException } from '../common/exceptions/cache-set.exception';
import { CacheClearException } from '../common/exceptions/cache-clear.exception';

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);

  constructor(private readonly cacheService: CacheService) {}

  // Set cache data with error handling
  async set(
    cacheKey: string,
    data: {
      id: number;
      name: string;
      description: string | null;
      tierId: number | null;
      isPremium: boolean;
      enabled: boolean;
      deletedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    ttl?: number,  // Optionally specify TTL
  ): Promise<void> {
    try {
      // Call cacheService to set the data
      await this.cacheService.set(cacheKey, data, ttl);
    } catch (error) {
      // Log and throw a custom CacheSetException
      this.logger.error(`Failed to set cache for key: ${cacheKey}`, error);
      throw new CacheSetException(cacheKey, `Failed to cache data`);
    }
  }
  
  // Generic cache data method with error handling
  async cacheData(cacheSegments: string[], data: any, ttlFeatureKey: string) {
    const cacheKey = this.generateCacheKey(...cacheSegments);
    const ttl = this.cacheService.getTTLForFeature(ttlFeatureKey);
    try {
      await this.cacheService.set(cacheKey, data, ttl);
    } catch (error) {
      this.logger.error(`Error caching data for key: ${cacheKey}`, error);
      throw new CacheSetException(cacheKey, `Failed to cache data`);
    }
  }

  // Invalidate cache for features related to a tenant with error handling
  async invalidateFeatureCache(tenantId: number, featureId?: number) {
    try {
      await this.cacheService.clear(`features:${tenantId}`);
      if (featureId !== undefined) {
        await this.cacheService.clear(`feature:${tenantId}:${featureId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating feature cache for tenant ${tenantId} and feature ${featureId}`,
        error,
      );
      throw new CacheClearException(
        `features:${tenantId}`,
        `Failed to invalidate feature cache`,
      );
    }
  }

  // Invalidate cache for a tenant's specific resource
  async invalidateTenantCache(tenantId: number, resource: string) {
    try {
      await this.cacheService.clear(`${resource}:${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for tenant ${tenantId} and resource ${resource}`,
        error,
      );
      throw new CacheClearException(
        `${resource}:${tenantId}`,
        `Failed to invalidate tenant cache`,
      );
    }
  }

  // Clear multiple cache keys with error handling
  async invalidateMultiple(keys: string[]) {
    try {
      await this.cacheService.clearMany(keys);
    } catch (error) {
      this.logger.error(
        `Error invalidating multiple cache keys: ${keys.join(', ')}`,
        error,
      );
      throw new CacheClearException(
        keys.join(', '),
        `Failed to invalidate multiple cache keys`,
      );
    }
  }

  // General method to clear any specific cache key with error handling
  async clearCacheKey(key: string) {
    try {
      await this.cacheService.clear(key);
    } catch (error) {
      this.logger.error(`Error invalidating cache key: ${key}`, error);
      throw new CacheClearException(key, `Failed to invalidate cache key`);
    }
  }

  // Generate cache key helper function
  generateCacheKey(...segments: string[]): string {
    return segments.join(':');
  }
}
