// src/queue/queue.module.ts
import { Module } from '@nestjs/common';
import { BullConfigModule } from './bull-config/bull-config.module';
import { RetryModule } from './retry/retry.module';
import { DeadLetterModule } from './dead-letter/dead-letter.module';
import { FailedJobHandlerModule } from './failed-job-handler/failed-job-handler.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullConfigModule,
    RetryModule,
    DeadLetterModule,
    FailedJobHandlerModule,
    MonitoringModule,
  ],
  providers: [
    {
      provide: 'NOTIFICATION_QUEUE',
      useFactory: async (configService: ConfigService) => {
        const redisOptions = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
        };
        const redisClient = new Redis(redisOptions);
        return new Queue('notification-queue', { connection: redisClient });
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    BullConfigModule,
    RetryModule,
    DeadLetterModule,
    FailedJobHandlerModule,
    MonitoringModule,
    'NOTIFICATION_QUEUE',
  ],
})
export class QueueModule {}
