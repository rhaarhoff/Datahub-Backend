import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis'; // or 'cache-manager-redis-store'
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';

@Module({
  imports: [
    ConfigModule.forRoot(), // Ensure environment variables are loaded
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          ttl: parseInt(process.env.CACHE_TTL, 10) || 3600, // 1-hour default TTL
        }),
      }),
    }),
  ],
  providers: [CacheService, CacheManagerService],
  exports: [CacheService],
})
export class RedisCacheModule {}
