// src/queue/bull-config/bull-config.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModuleOptions, SharedBullConfigurationFactory } from '@nestjs/bull';
import { Queue, Job, QueueEvents, Worker } from 'bullmq';
import axios from 'axios';
import { Gauge } from 'prom-client';
import { DeadLetterService } from '../dead-letter/dead-letter.service';
import { RetryService } from '../retry/retry.service';

@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory, OnModuleDestroy {
  private readonly logger = new Logger(BullConfigService.name);
  private readonly redisConnection;
  private readonly queues: Queue[] = [];
  private readonly workers: Worker[] = [];

  // Prometheus Gauges for metrics with added jobType label
  private readonly jobProcessingTime = new Gauge({
    name: 'job_processing_time',
    help: 'Time taken to process jobs in milliseconds',
    labelNames: ['queueName', 'jobType'],
  });

  private readonly jobFailureCount = new Gauge({
    name: 'job_failure_count',
    help: 'Total failed jobs',
    labelNames: ['queueName', 'jobType'],
  });

  private readonly jobSuccessCount = new Gauge({
    name: 'job_success_count',
    help: 'Total successful jobs',
    labelNames: ['queueName', 'jobType'],
  });

  constructor(
    private readonly configService: ConfigService,
    private readonly deadLetterService: DeadLetterService,
    private readonly retryService: RetryService  // Inject RetryService
  ) {
    this.redisConnection = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      connectTimeout: this.configService.get<number>('REDIS_CONNECT_TIMEOUT', 5000),
      db: this.configService.get<number>('REDIS_DB', 0),
    };
  }

  // Core configuration for BullMQ
  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: this.redisConnection,
      defaultJobOptions: {
        attempts: this.configService.get<number>('BULL_ATTEMPTS', 5),
        backoff: {
          type: this.configService.get<string>('BULL_BACKOFF_TYPE', 'exponential'),
          delay: this.configService.get<number>('BULL_BACKOFF_DELAY', 1000),
        },
        removeOnComplete: true,
        removeOnFail: this.configService.get<boolean>('BULL_REMOVE_ON_FAIL', false),
      },
      limiter: {
        max: this.configService.get<number>('BULL_RATE_LIMIT_MAX', 10),
        duration: this.configService.get<number>('BULL_RATE_LIMIT_DURATION', 1000),
      },
    };
  }

  // Custom job addition with dynamic retry options and backoff strategies
  async addJobWithAdvancedRetry(queue: Queue, data: any, options: any, jobType = 'default') {
    return queue.add('process', { ...data, jobType }, {
      attempts: options?.attempts || this.configService.get<number>('DEFAULT_ATTEMPTS', 3),
      backoff: options?.backoff || { type: 'exponential', delay: 1000 },
      priority: options?.priority || 1,
    });
  }

  // Queue event logging setup for tracking completed and failed jobs
  logQueueEvents(queueName: string) {
    const queueEvents = new QueueEvents(queueName, { connection: this.redisConnection });
    const queue = this.queues.find(q => q.name === queueName);

    queueEvents.on('completed', async ({ jobId }) => {
      const job = await queue.getJob(jobId);
      const jobType = job?.data?.jobType || 'default';
      this.logger.log(`Job ${jobId} of type ${jobType} completed in ${queueName} queue`);
      this.jobSuccessCount.inc({ queueName, jobType });
    });

    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      const job = await queue.getJob(jobId);
      const jobType = job?.data?.jobType || 'default';
      this.logger.error(`Job ${jobId} of type ${jobType} failed in ${queueName} due to: ${failedReason}`);
      this.sendSlackAlert(`Job ${jobId} of type ${jobType} failed: ${failedReason}`);
      this.jobFailureCount.inc({ queueName, jobType });

      // Check if job should be retried using RetryService
      if (job && this.retryService.shouldRetry(job, new Error(failedReason))) {
        await this.retryService.applyRetryStrategy(queue, job, new Error(failedReason));
      } else if (job) {
        // Move to dead-letter queue if max retries are reached
        await this.deadLetterService.moveToDeadLetterQueue(job);
      }
    });
  }

  // Slack alert integration for critical job failures
  private async sendSlackAlert(message: string) {
    const slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (!slackWebhookUrl) {
      this.logger.warn('SLACK_WEBHOOK_URL is not defined');
      return;
    }
    try {
      await axios.post(slackWebhookUrl, { text: message });
      this.logger.log('Alert sent to Slack');
    } catch (error) {
      this.logger.error('Failed to send alert to Slack:', error.message);
    }
  }

  // Structured logging for job status
  async logJobStatus(queueName: string, jobId: string, status: string, metadata = {}) {
    const logData = {
      queue: queueName,
      jobId,
      status,
      timestamp: new Date().toISOString(),
      ...metadata,
    };
    this.logger.log(`Job Status: ${JSON.stringify(logData)}`);
  }

  // Graceful shutdown to allow active jobs to complete
  async onModuleDestroy() {
    this.logger.log('Shutting down queues and workers gracefully...');
    try {
      await Promise.all(this.queues.map(queue => queue.close()));
      await Promise.all(this.workers.map(worker => worker.close()));
      this.logger.log('All queues and workers shut down gracefully.');
    } catch (err) {
      this.logger.error('Error during shutdown:', err);
    }
  }

  // Initializing a queue with event logging, batch job handling, and custom metrics
  initializeQueue(queueName: string) {
    try {
      const queue = new Queue(queueName, { connection: this.redisConnection });
      this.queues.push(queue);

      const worker = new Worker(
        queueName,
        async (job: Job) => {
          const start = Date.now();
          const jobType = job.data.jobType || 'default';
          this.logger.log(`Processing job ${job.id} in ${queueName} queue with type: ${jobType}`);
          
          // Job processing logic here
          const duration = Date.now() - start;
          this.jobProcessingTime.set({ queueName, jobType }, duration);
        },
        { connection: this.redisConnection }
      );

      // Listen for failed events and handle retry logic
      worker.on('failed', async (job: Job, err: Error) => {
        const jobType = job.data.jobType || 'default';
        this.logger.warn(`Job ${job.id} of type ${jobType} failed due to error: ${err.message}`, {
          jobData: job.data,
          jobId: job.id,
          attemptsMade: job.attemptsMade,
        });

        // Use RetryService to determine if the job should be retried
        if (this.retryService.shouldRetry(job, err)) {
          await this.retryService.applyRetryStrategy(queue, job, err);
        } else {
          // Move to dead-letter queue if max retries are reached
          await this.deadLetterService.moveToDeadLetterQueue(job);
        }
      });

      this.workers.push(worker);
      this.logQueueEvents(queueName);
      return queue;
    } catch (error) {
      this.logger.error(`Failed to initialize queue ${queueName}: ${error.message}`);
      throw new Error(`Queue initialization failed for ${queueName}`);
    }
  }
}
