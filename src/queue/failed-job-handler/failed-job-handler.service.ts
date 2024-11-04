// src/queue/failed-job-handler/failed-job-handler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DeadLetterService } from '../dead-letter/dead-letter.service';
import { RetryService } from '../retry/retry.service';
import { NotificationService } from '../../notification-hub/notification/notification/notification.service';

@Injectable()
export class FailedJobHandlerService {
  private readonly logger = new Logger(FailedJobHandlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly retryService: RetryService,
    private readonly deadLetterService: DeadLetterService,
    private readonly notificationService: NotificationService, // Correct NotificationService import
  ) {}

  async handleFailedJob(queue: Queue, job: Job, err: Error): Promise<void> {
    const jobType = job.data.jobType || 'default';
    const maxAttempts = this.getMaxRetryAttempts(jobType);

    this.logger.error(`Job ${job.id} of type ${jobType} failed. Attempt ${job.attemptsMade + 1}. Error: ${err.message}`);

    if (this.retryService.shouldRetry(job, err) && job.attemptsMade < maxAttempts) {
      this.logger.warn(`Retrying job ${job.id}...`);
      await this.retryService.applyRetryStrategy(queue, job, err);
    } else {
      this.logger.error(`Job ${job.id} has reached max retry attempts and will be moved to dead-letter queue.`);
      await this.handleMaxRetryExceeded(job, err);
    }
  }

  private getMaxRetryAttempts(jobType: string): number {
    return this.configService.get<number>(`RETRY_ATTEMPTS_${jobType.toUpperCase()}`, 3);
  }

  private async handleMaxRetryExceeded(job: Job, err: Error): Promise<void> {
    await this.deadLetterService.moveToDeadLetterQueue(job);
    await this.notifyFailure(job, err);
  }

  private async notifyFailure(job: Job, err: Error): Promise<void> {
    const message = `Job ${job.id} failed after maximum retries. Error: ${err.message}`;
    try {
      await this.notificationService.sendNotification(job.data.userId, 'jobFailureNotification', { message, jobData: job.data });
    } catch (notificationError) {
      this.logger.error(`Failed to send job failure notification for job ${job.id}: ${notificationError.message}`);
    }
  }
}
