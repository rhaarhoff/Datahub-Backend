import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { CACHE_MANAGER, CacheStore as OriginalCacheStore } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Buffer } from 'buffer';

interface CacheStore extends OriginalCacheStore {
  reset?: jest.Mock;
}

describe('CacheService', () => {
  let cacheService: CacheService;
  let cacheManager: Partial<Record<keyof CacheStore, jest.Mock>>;
  let configService: ConfigService;

  beforeEach(async () => {
    cacheManager = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const defaultTTL = 3600;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'ttl.default' ? defaultTTL : null)),
          },
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should set cache with TTL', async () => {
      const key = 'testKey';
      const value = { test: 'value' };
      const ttl = 1000;

      await cacheService.set(key, value, ttl);
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, { ttl });
    });

    it('should use default TTL if no TTL is provided', async () => {
      const key = 'testKey';
      const value = { test: 'value' };
      const defaultTTL = 3600;
      jest.spyOn(configService, 'get').mockReturnValue(defaultTTL);

      await cacheService.set(key, value);
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, { ttl: defaultTTL });
    });

    it('should handle errors when setting cache', async () => {
      const key = 'testKey';
      const value = { test: 'value' };
      cacheManager.set.mockRejectedValueOnce(new Error('Set failed'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await cacheService.set(key, value);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to set cache'), expect.anything());
    });

    describe('with compression', () => {
      it('should compress large objects before caching', async () => {
        const key = 'testKey';
        const largeValue = { test: 'a'.repeat(1025) }; // Larger than 1KB
        const compressSpy = jest.spyOn(cacheService as any, 'compress').mockResolvedValue(Buffer.from('compressed data'));

        await cacheService.set(key, largeValue, undefined, true);

        expect(compressSpy).toHaveBeenCalled();
        expect(cacheManager.set).toHaveBeenCalledWith(key, expect.any(Buffer), { ttl: 3600 });
      });

      it('should not compress small objects', async () => {
        const key = 'testKey';
        const smallValue = { test: 'a'.repeat(100) }; // Smaller than 1KB
        const compressSpy = jest.spyOn(cacheService as any, 'compress');

        await cacheService.set(key, smallValue, undefined, true);

        expect(compressSpy).not.toHaveBeenCalled();
        expect(cacheManager.set).toHaveBeenCalledWith(key, smallValue, { ttl: 3600 });
      });
    });
  });

  describe('get', () => {
    it('should return cached data without decompression', async () => {
      const key = 'testKey';
      const value = { test: 'value' };
      cacheManager.get.mockResolvedValueOnce(value);

      const result = await cacheService.get(key);
      expect(result).toEqual(value);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return cached data with decompression', async () => {
      const key = 'testKey';
      const compressedValue = Buffer.from('compressed data');
      cacheManager.get.mockResolvedValueOnce(compressedValue);
      const decompressSpy = jest.spyOn(cacheService as any, 'decompress').mockResolvedValue('{"test":"value"}');

      const result = await cacheService.get(key, true);
      expect(decompressSpy).toHaveBeenCalledWith(compressedValue);
      expect(result).toEqual({ test: 'value' });
    });

    it('should handle errors during get', async () => {
      const key = 'testKey';
      cacheManager.get.mockRejectedValueOnce(new Error('Get failed'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      const result = await cacheService.get(key);
      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to get cache'), expect.anything());
    });

    it('should handle cache miss gracefully', async () => {
      const key = 'testKey';
      cacheManager.get.mockResolvedValueOnce(null);

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('getOrFetch', () => {
    it('should return cached data if available', async () => {
      const key = 'testKey';
      const value = { test: 'value' };
      cacheManager.get.mockResolvedValueOnce(value);

      const fetchFn = jest.fn().mockResolvedValue({ newValue: 'new' });
      const result = await cacheService.getOrFetch(key, fetchFn);

      expect(result).toEqual(value);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch data and cache it if not available', async () => {
      const key = 'testKey';
      const value = { newValue: 'new' };
      cacheManager.get.mockResolvedValueOnce(null);
      const fetchFn = jest.fn().mockResolvedValue(value);

      const result = await cacheService.getOrFetch(key, fetchFn);
      expect(result).toEqual(value);
      expect(fetchFn).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, { ttl: 3600 });
    });
  });

  describe('clear', () => {
    it('should clear the cache for a specific key', async () => {
      const key = 'testKey';
      await cacheService.clear(key);
      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should handle errors during clear', async () => {
      const key = 'testKey';
      cacheManager.del.mockRejectedValueOnce(new Error('Del failed'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');

      await cacheService.clear(key);
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to clear cache'), expect.anything());
    });
  });

  describe('clearMany', () => {
    it('should clear multiple cache keys', async () => {
      const keys = ['key1', 'key2'];
      await cacheService.clearMany(keys);
      expect(cacheManager.del).toHaveBeenCalledWith('key1');
      expect(cacheManager.del).toHaveBeenCalledWith('key2');
    });
  
    it('should handle errors during clearing multiple keys', async () => {
      const keys = ['key1', 'key2'];
  
      // Mock del to fail for both keys
      cacheManager.del.mockRejectedValueOnce(new Error('Del failed for key1'));
      cacheManager.del.mockRejectedValueOnce(new Error('Del failed for key2'));
  
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
  
      await cacheService.clearMany(keys);
  
      // We expect the logger to be called twice (once for each failed key)
      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear cache for key: key1'),
        expect.anything() // The error stack and full message
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear cache for key: key2'),
        expect.anything() // The error stack and full message
      );
    });
  });
  
  
  

  describe('clearAll', () => {
    it('should clear all cache entries when reset is supported', async () => {
      await cacheService.clearAll();
      expect(cacheManager.reset).toHaveBeenCalled();
    });

    it('should log a warning if reset is not supported', async () => {
      const cacheManagerWithoutReset = {
        ...cacheManager,
        reset: undefined, // Simulate store without reset support
      } as Partial<Record<keyof CacheStore, jest.Mock>>;
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      cacheService = new CacheService(
        cacheManagerWithoutReset as unknown as CacheStore,
        configService,
      );

      await cacheService.clearAll();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Cache store does not support reset. Skipping clear all operation.',
      );
    });
  });

  describe('generateCacheKey', () => {
    it('should generate cache keys by joining segments', () => {
      const segments = ['segment1', 'segment2', 'segment3'];
      const result = cacheService.generateCacheKey(...segments);
      expect(result).toEqual('segment1:segment2:segment3');
    });
  });

  describe('validateTTL', () => {
    it('should return valid TTL', () => {
      const ttl = 500;
      const result = (cacheService as any).validateTTL(ttl);
      expect(result).toEqual(ttl);
    });

    it('should return default TTL for invalid TTL', () => {
      const ttl = -10;
      const result = (cacheService as any).validateTTL(ttl);
      expect(result).toEqual(cacheService['defaultTTL']);
    });

    it('should return max TTL if provided TTL exceeds maximum allowed', () => {
      const ttl = 90000;
      const result = (cacheService as any).validateTTL(ttl);
      expect(result).toEqual(cacheService['maxAllowedTTL']);
    });
  });

  describe('logCacheStats', () => {
    it('should log cache hit', async () => {
      const key = 'testKey';
      const value = { test: 'value' };
      cacheManager.get.mockResolvedValueOnce(value);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await cacheService.logCacheStats(key);
      expect(loggerSpy).toHaveBeenCalledWith(`Cache hit: ${key}`);
    });

    it('should log cache miss', async () => {
      const key = 'testKey';
      cacheManager.get.mockResolvedValueOnce(null);
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      await cacheService.logCacheStats(key);
      expect(loggerSpy).toHaveBeenCalledWith(`Cache miss: ${key}`);
    });
  });

  it('should return raw data if decompression fails', async () => {
    const key = 'testKey';
    const compressedValue = Buffer.from('compressed data');
    cacheManager.get.mockResolvedValueOnce(compressedValue);
    const decompressSpy = jest.spyOn(cacheService as any, 'decompress').mockRejectedValueOnce(new Error('Decompression failed'));
  
    const result = await cacheService.get(key, true);
    expect(decompressSpy).toHaveBeenCalledWith(compressedValue);
    expect(result).toEqual(compressedValue); // Fallback to raw data
  });
  
  it('should continue clearing other keys if one key fails', async () => {
    const keys = ['key1', 'key2'];
    
    // Mock del to succeed for key1 and fail for key2
    cacheManager.del.mockResolvedValueOnce(undefined); // key1 succeeds with resolved value of undefined
    cacheManager.del.mockRejectedValueOnce(new Error('Del failed for key2')); // key2 fails
    
    const loggerSpy = jest.spyOn(Logger.prototype, 'error');
  
    await cacheService.clearMany(keys);
  
    expect(cacheManager.del).toHaveBeenCalledWith('key1');
    expect(cacheManager.del).toHaveBeenCalledWith('key2');
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to clear cache for key: key2'),
      expect.anything()
    );
  });
  
  
  
});
