// src/queue/retry/retry.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import axios from 'axios';
import { TenantFeatureNotificationChannel } from '@prisma/client';
import { AppConfigService } from '../../config/config/config.service';
import { NotificationService } from '../../notification-hub/notification/notification/notification.service';

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    constructor(
        private readonly appConfigService: AppConfigService, // Inject AppConfigService
        private readonly notificationService: NotificationService // Inject NotificationService
    ) {}

    /**
     * Applies retry strategy based on job type, error message, or custom conditions.
     */
    async applyRetryStrategy(queue: Queue, job: Job, err: Error): Promise<void> {
        const jobType = job.data.jobType || 'default';
        const maxAttempts = this.appConfigService.getRetryAttempts(jobType);
        const backoff = this.appConfigService.getBackoffStrategy(jobType);

        if (this.shouldRetry(job, err)) {
            this.logger.warn(`Retrying job ${job.id} of type ${jobType}, attempt ${job.attemptsMade + 1}`);

            // Re-add job to queue with updated retry options
            await queue.add(job.name, job.data, {
                attempts: maxAttempts,
                backoff,
                priority: job.opts.priority,
            });
        } else {
            this.logger.error(`Job ${job.id} of type ${jobType} reached max retry attempts and will not retry.`);
            await this.handleExhaustedRetries(job);
        }
    }

    /**
     * Determines if a job should be retried based on error type or priority.
     */
    public shouldRetry(job: Job, err: Error): boolean {
        const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT'];
        const jobType = job.data.jobType || 'default';
        const maxAttempts = this.appConfigService.getRetryAttempts(jobType);

        if (networkErrors.includes(err.message) && jobType === 'critical') {
            return true;
        }
        return job.opts.priority > 5 && job.attemptsMade < maxAttempts;
    }

    /**
     * Handles jobs that have exhausted all retry attempts, potentially notifying or moving to a dead-letter queue.
     */
    private async handleExhaustedRetries(job: Job): Promise<void> {
        this.logger.error(`Job ${job.id} of type ${job.data.jobType || 'default'} has exhausted retries.`);
        await this.sendFailureAlert(`Job ${job.id} failed after max retries.`, job.data);
    }

    /**
     * Sends failure alert for critical job failures.
     */
    private async sendFailureAlert(message: string, jobData: any) {
        const slackWebhookUrl = this.appConfigService.get('SLACK_WEBHOOK_URL');
        if (!slackWebhookUrl) {
            this.logger.warn('SLACK_WEBHOOK_URL is not defined, skipping alert.');
            return;
        }

        try {
            await axios.post(slackWebhookUrl, { text: message, jobData });
            this.logger.log('Sent alert to Slack.');
        } catch (error) {
            this.logger.error(`Failed to send alert: ${error.message}`);
        }
    }

    /**
     * Retries a batch of jobs in the queue under specified conditions.
     */
    async retryBatch(queue: Queue, jobIds: string[]): Promise<void> {
        this.logger.log(`Retrying batch of jobs: ${jobIds.join(', ')}`);
        for (const jobId of jobIds) {
            const job = await queue.getJob(jobId);
            if (job) {
                const maxAttempts = this.appConfigService.getRetryAttempts(job.data.jobType || 'default');
                const backoff = this.appConfigService.getBackoffStrategy(job.data.jobType || 'default', job.attemptsMade);
                if (job.attemptsMade < maxAttempts) {
                    await queue.add(job.name, job.data, { attempts: maxAttempts, backoff });
                } else {
                    this.logger.error(`Job ${job.id} already reached max attempts, skipping retry.`);
                }
            } else {
                this.logger.warn(`Job ${jobId} not found in queue.`);
            }
        }
    }

    /**
     * Determines if a fallback should be used based on error conditions and channel configuration.
     */
    public shouldFallback(error: Error, channelConfig: TenantFeatureNotificationChannel): boolean {
        const rateLimitErrors = ['rate limit', '429'];
        const shouldUseFallback = rateLimitErrors.some(msg => error.message.includes(msg)) && !!channelConfig.providerId;

        if (shouldUseFallback) {
            this.logger.warn(`Fallback triggered due to rate limit error for channel ${channelConfig.channelType}`);
        }

        return shouldUseFallback;
    }

    /**
     * Retries a job using a fallback provider when rate limit is exceeded or on specific failure conditions.
     */
    async retryWithFallback(queue: Queue, job: Job, fallbackProviderId: number | null): Promise<void> {
        if (!fallbackProviderId) {
            this.logger.warn(`No fallback provider specified for job ${job.id}. Cannot retry with fallback.`);
            return;
        }

        try {
            this.logger.log(`Retrying job ${job.id} with fallback provider ${fallbackProviderId}`);

            // Update job data to use the fallback provider
            const fallbackJobData = {
                ...job.data,
                providerId: fallbackProviderId,
                jobType: `${job.data.jobType}-fallback`,
            };

            // Add the job back to the provided queue with modified data and retry options
            await queue.add(job.name, fallbackJobData, {
                attempts: job.opts.attempts,
                backoff: job.opts.backoff,
                priority: job.opts.priority,
            });
        } catch (error) {
            this.logger.error(`Failed to retry job ${job.id} with fallback provider ${fallbackProviderId}: ${error.message}`);
        }
    }
}
