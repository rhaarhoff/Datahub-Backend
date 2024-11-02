// src/queue/dead-letter/dead-letter.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeadLetterService implements OnModuleInit {
  private readonly logger = new Logger(DeadLetterService.name);
  private deadLetterQueue: Queue;
  private deadLetterWorker: Worker;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeDeadLetterQueue();
    await this.initializeDeadLetterWorker();
  }

  // Initialize the Dead Letter Queue
  private async initializeDeadLetterQueue() {
    this.deadLetterQueue = new Queue('dead-letter-queue', {
      connection: {
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD', ''),
      },
    });

    this.logger.log('Dead Letter Queue initialized');
  }

  // Initialize the worker to process dead-letter jobs if required
  private async initializeDeadLetterWorker() {
    this.deadLetterWorker = new Worker(
      'dead-letter-queue',
      async (job: Job) => {
        this.logger.warn(`Processing job ${job.id} from dead-letter queue`);
        // Retry or process the job as needed
        // Example: You might implement custom processing logic here
      },
      {
        connection: {
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD', ''),
        },
      }
    );

    this.deadLetterWorker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} successfully processed from dead-letter queue`);
    });

    this.deadLetterWorker.on('failed', (job, err) => {
      this.logger.error(`Failed to process job ${job.id} in dead-letter queue: ${err.message}`);
    });
  }

  // Move failed jobs to the dead-letter queue
  async moveToDeadLetterQueue(failedJob: Job) {
    this.logger.warn(`Moving job ${failedJob.id} to dead-letter queue`);

    // Copy data and opts for re-processing if necessary
    await this.deadLetterQueue.add('dead-letter-job', {
      ...failedJob.data,
      originalQueue: failedJob.queueName,
      failedReason: failedJob.failedReason,
    });
  }

  // Retry all jobs in the dead-letter queue
  async retryAllDeadLetterJobs() {
    const jobs = await this.deadLetterQueue.getJobs(['failed', 'waiting', 'delayed']);
    for (const job of jobs) {
      this.logger.log(`Retrying job ${job.id} from dead-letter queue`);
      await job.retry();
    }
  }

  // Get statistics of dead-letter queue for monitoring purposes
  async getDeadLetterQueueStats() {
    const failedCount = await this.deadLetterQueue.getJobCountByTypes('failed');
    const waitingCount = await this.deadLetterQueue.getJobCountByTypes('waiting');
    const delayedCount = await this.deadLetterQueue.getJobCountByTypes('delayed');
    
    this.logger.log(`Dead-letter queue stats - Failed: ${failedCount}, Waiting: ${waitingCount}, Delayed: ${delayedCount}`);
    return {
      failedCount,
      waitingCount,
      delayedCount,
    };
  }
}
