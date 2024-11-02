// src/queue/retry/retry.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    constructor(private readonly configService: ConfigService) {}

    /**
     * Applies retry strategy based on job type, error message, or custom conditions.
     */
    async applyRetryStrategy(queue: Queue, job: Job, err: Error): Promise<void> {
        const jobType = job.data.jobType || 'default';
        const maxAttempts = this.getMaxAttempts(jobType);
        const backoff = this.getBackoffStrategy(jobType, job.attemptsMade);

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
     * Fetches maximum retry attempts for a job type from configuration.
     */
    private getMaxAttempts(jobType: string): number {
        return this.configService.get<number>(`RETRY_ATTEMPTS_${jobType.toUpperCase()}`, 3);
    }

    /**
     * Configures backoff strategy based on job type and current attempt count.
     */
    private getBackoffStrategy(jobType: string, attemptsMade: number) {
        const backoffType = this.configService.get<string>(`BACKOFF_TYPE_${jobType.toUpperCase()}`, 'exponential');
        const backoffDelay = this.configService.get<number>(`BACKOFF_DELAY_${jobType.toUpperCase()}`, 1000);

        return {
            type: backoffType,
            delay: backoffType === 'exponential' ? backoffDelay * Math.pow(2, attemptsMade) : backoffDelay,
        };
    }

    /**
     * Determines if a job should be retried based on error type or priority.
     */
    public shouldRetry(job: Job, err: Error): boolean {
        const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT'];
        const jobType = job.data.jobType || 'default';

        if (networkErrors.includes(err.message) && jobType === 'critical') {
            return true;
        }
        if (job.opts.priority > 5 && job.attemptsMade < this.getMaxAttempts(jobType)) {
            return true;
        }
        return false;
    }

    /**
     * Handles jobs that have exhausted all retry attempts, potentially notifying or moving to a dead-letter queue.
     */
    private async handleExhaustedRetries(job: Job): Promise<void> {
        this.logger.error(`Job ${job.id} of type ${job.data.jobType || 'default'} has exhausted retries.`);
        await this.sendFailureAlert(`Job ${job.id} failed after max retries.`, job.data);

        // Optionally move the job to a dead-letter queue or other final state
        // await this.deadLetterService.moveToDeadLetterQueue(job);
    }

    /**
     * Sends failure alert for critical job failures.
     */
    private async sendFailureAlert(message: string, jobData: any) {
        const slackWebhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
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
                const maxAttempts = this.getMaxAttempts(job.data.jobType || 'default');
                if (job.attemptsMade < maxAttempts) {
                    await queue.add(
                        job.name,
                        job.data,
                        { attempts: maxAttempts, backoff: this.getBackoffStrategy(job.data.jobType, job.attemptsMade) }
                    );
                } else {
                    this.logger.error(`Job ${job.id} already reached max attempts, skipping retry.`);
                }
            } else {
                this.logger.warn(`Job ${jobId} not found in queue.`);
            }
        }
    }
}
