import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagerService } from './cache-manager.service';
import { CacheService } from './cache.service';
import { Logger } from '@nestjs/common';
import { CacheSetException } from '../common/exceptions/cache-set.exception';
import { CacheClearException } from '../common/exceptions/cache-clear.exception';

describe('CacheManagerService', () => {
  let service: CacheManagerService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheManagerService,
        {
          provide: CacheService,
          useValue: {
            set: jest.fn(),
            clear: jest.fn(),
            clearMany: jest.fn(),
            getTTLForFeature: jest.fn().mockReturnValue(300),
          },
        },
      ],
    }).compile();

    service = module.get<CacheManagerService>(CacheManagerService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    const mockData = {
      id: 1,
      name: 'Feature 1',
      description: 'Test feature',
      tierId: 2,
      isPremium: true,
      enabled: true,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call cacheService.set with correct data', async () => {
      await service.set('testKey', mockData, 500);
      expect(cacheService.set).toHaveBeenCalledWith('testKey', mockData, 500);
    });

    it('should log and throw CacheSetException if setting cache fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      jest.spyOn(cacheService, 'set').mockRejectedValue(new Error('Cache set error'));

      await expect(service.set('testKey', mockData)).rejects.toThrow(CacheSetException);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to set cache for key: testKey',
        expect.any(Error),
      );
    });
  });

  describe('cacheData', () => {
    it('should generate cache key and call cacheService.set', async () => {
      const data = { some: 'data' };
      await service.cacheData(['segment1', 'segment2'], data, 'feature-ttl-key');
      expect(cacheService.set).toHaveBeenCalledWith('segment1:segment2', data, 300); // ttl is mocked to return 300
    });

    it('should log and throw CacheSetException if caching data fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      jest.spyOn(cacheService, 'set').mockRejectedValue(new Error('Cache set error'));

      await expect(service.cacheData(['segment1'], { data: 'value' }, 'feature-ttl-key')).rejects.toThrow(CacheSetException);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error caching data for key: segment1',
        expect.any(Error),
      );
    });
  });

  describe('invalidateFeatureCache', () => {
    it('should clear tenant feature cache when featureId is not provided', async () => {
      await service.invalidateFeatureCache(1);
      expect(cacheService.clear).toHaveBeenCalledWith('features:1');
    });

    it('should clear both tenant and specific feature cache when featureId is provided', async () => {
      await service.invalidateFeatureCache(1, 100);
      expect(cacheService.clear).toHaveBeenCalledWith('features:1');
      expect(cacheService.clear).toHaveBeenCalledWith('feature:1:100');
    });

    it('should log and throw CacheClearException if clearing cache fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      jest.spyOn(cacheService, 'clear').mockRejectedValue(new Error('Cache clear error'));

      await expect(service.invalidateFeatureCache(1)).rejects.toThrow(CacheClearException);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error invalidating feature cache for tenant 1 and feature undefined',
        expect.any(Error),
      );
    });
  });

  describe('invalidateTenantCache', () => {
    it('should clear tenant resource cache', async () => {
      await service.invalidateTenantCache(2, 'resource');
      expect(cacheService.clear).toHaveBeenCalledWith('resource:2');
    });

    it('should log and throw CacheClearException if clearing tenant cache fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      jest.spyOn(cacheService, 'clear').mockRejectedValue(new Error('Cache clear error'));

      await expect(service.invalidateTenantCache(2, 'resource')).rejects.toThrow(CacheClearException);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error invalidating cache for tenant 2 and resource resource',
        expect.any(Error),
      );
    });
  });

  describe('invalidateMultiple', () => {
    it('should clear multiple cache keys', async () => {
      await service.invalidateMultiple(['key1', 'key2']);
      expect(cacheService.clearMany).toHaveBeenCalledWith(['key1', 'key2']);
    });

    it('should log and throw CacheClearException if clearing multiple keys fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      jest.spyOn(cacheService, 'clearMany').mockRejectedValue(new Error('Cache clear error'));

      await expect(service.invalidateMultiple(['key1', 'key2'])).rejects.toThrow(CacheClearException);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error invalidating multiple cache keys: key1, key2',
        expect.any(Error),
      );
    });
  });

  describe('clearCacheKey', () => {
    it('should clear specific cache key', async () => {
      await service.clearCacheKey('testKey');
      expect(cacheService.clear).toHaveBeenCalledWith('testKey');
    });

    it('should log and throw CacheClearException if clearing specific cache key fails', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      jest.spyOn(cacheService, 'clear').mockRejectedValue(new Error('Cache clear error'));

      await expect(service.clearCacheKey('testKey')).rejects.toThrow(CacheClearException);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Error invalidating cache key: testKey',
        expect.any(Error),
      );
    });
  });
});
