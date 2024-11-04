// src/queue/bull-config/bull-config.service.ts
import { Injectable, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModuleOptions, SharedBullConfigurationFactory } from '@nestjs/bull';
import { Queue, Job, Worker, QueueOptions } from 'bullmq';
import Redis, { RedisOptions } from 'ioredis';

import { DeadLetterService } from '../dead-letter/dead-letter.service';
import { RetryService } from '../retry/retry.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { TenantFeatureNotificationChannel } from '@prisma/client';

@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory, OnModuleDestroy {
  private readonly logger = new Logger(BullConfigService.name);
  private readonly queues: Queue[] = [];
  private readonly workers: Worker[] = [];
  private readonly redisClient: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly deadLetterService: DeadLetterService,
    private readonly retryService: RetryService,
    private readonly prisma: PrismaService,
    private readonly monitoringService: MonitoringService,
    @Inject('REDIS_OPTIONS') private readonly redisOptions: RedisOptions // Inject Redis options
  ) {
    this.redisClient = new Redis(this.redisOptions); // Initialize a shared Redis client
  }

  // Core BullMQ configuration
  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: this.redisOptions, // Use Redis options directly
      defaultJobOptions: {
        attempts: this.configService.get<number>('BULL_ATTEMPTS', 5),
        backoff: {
          type: this.configService.get<string>('BULL_BACKOFF_TYPE', 'exponential'),
          delay: this.configService.get<number>('BULL_BACKOFF_DELAY', 1000),
        },
        removeOnComplete: true,
        removeOnFail: this.configService.get<boolean>('BULL_REMOVE_ON_FAIL', false),
      },
    };
  }

  // Queue initialization with monitoring and error handling
  initializeQueue(queueName: string, tenantId: number, featureId: number) {
    try {
      const queueOptions: QueueOptions = {
        connection: this.redisClient, // Use the shared Redis client
      };
      const queue = new Queue(queueName, queueOptions);
      this.queues.push(queue);

      const worker = new Worker(
        queueName,
        async (job: Job) => {
          this.logger.log(`Processing job ${job.id} in ${queueName} queue`);
          // Insert job processing logic here
        },
        { connection: this.redisClient } // Use the shared Redis client for the worker
      );

      this.monitoringService.initializeQueueMonitoring(queue, worker);
      this.registerQueueEvents(queue, worker, tenantId, featureId);
      return queue;
    } catch (error) {
      this.logger.error(`Failed to initialize queue ${queueName}: ${error.message}`);
      throw new Error(`Queue initialization failed for ${queueName}`);
    }
  }

  // Registers queue events with retry and monitoring
  private registerQueueEvents(queue: Queue, worker: Worker, tenantId: number, featureId: number) {
    worker.on('failed', async (job: Job, err: Error) => {
      this.logger.warn(`Job ${job.id} failed: ${err.message}`);
      if (this.retryService.shouldRetry(job, err)) {
        await this.retryService.applyRetryStrategy(queue, job, err);
      } else {
        await this.deadLetterService.moveToDeadLetterQueue(job);
      }
    });
    this.monitoringService.initializeQueueMonitoring(queue, worker);
  }

  // Fetches channel configuration
  private async fetchTenantFeatureChannel(
    tenantId: number,
    featureId: number,
    channelType: string
  ): Promise<TenantFeatureNotificationChannel | null> {
    return await this.prisma.tenantFeatureNotificationChannel.findFirst({
      where: {
        tenantId,
        featureId,
        channelType,
        isEnabled: true,
      },
    });
  }

  // Graceful shutdown with monitoring service cleanup
  async onModuleDestroy() {
    this.logger.log('Shutting down queues and workers gracefully...');
    await this.monitoringService.shutdown();
    await Promise.all(this.queues.map((queue) => queue.close()));
    await Promise.all(this.workers.map((worker) => worker.close()));
    await this.redisClient.quit(); // Close the shared Redis client connection
  }
}
