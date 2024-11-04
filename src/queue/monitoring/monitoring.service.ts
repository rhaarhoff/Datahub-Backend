// src/queue/monitoring/monitoring.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Queue, QueueEvents, Worker, Job } from 'bullmq';
import { Gauge, Counter } from 'prom-client';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  // Prometheus metrics
  private readonly jobProcessingTime = new Gauge({
    name: 'job_processing_time',
    help: 'Time taken to process jobs in milliseconds',
    labelNames: ['queueName', 'jobType'],
  });

  private readonly jobFailureCount = new Counter({
    name: 'job_failure_count',
    help: 'Total failed jobs',
    labelNames: ['queueName', 'jobType'],
  });

  private readonly jobSuccessCount = new Counter({
    name: 'job_success_count',
    help: 'Total successful jobs',
    labelNames: ['queueName', 'jobType'],
  });

  // This will track each queue and its events
  private readonly queueEventsMap: Map<string, QueueEvents> = new Map();

  /**
   * Initialize monitoring for a specific queue and worker.
   */
  initializeQueueMonitoring(queue: Queue, worker: Worker) {
    const queueName = queue.name;

    // Initialize Queue Events
    const queueEvents = new QueueEvents(queueName, { connection: queue.opts.connection });
    this.queueEventsMap.set(queueName, queueEvents);

    // Track completed jobs
    queueEvents.on('completed', async ({ jobId }) => {
      const job = await queue.getJob(jobId);
      const jobType = job?.data?.jobType || 'default';
      const processingTime = job?.finishedOn ? job.finishedOn - job.processedOn : 0;
      
      this.jobSuccessCount.inc({ queueName, jobType });
      this.jobProcessingTime.set({ queueName, jobType }, processingTime);
      
      this.logger.log(`Job ${jobId} of type ${jobType} completed in ${queueName}`);
    });

    // Track failed jobs
    queueEvents.on('failed', async ({ jobId, failedReason }) => {
      const job = await queue.getJob(jobId);
      const jobType = job?.data?.jobType || 'default';
      
      this.jobFailureCount.inc({ queueName, jobType });
      this.logger.error(`Job ${jobId} of type ${jobType} failed in ${queueName} due to: ${failedReason}`);
    });

    // Monitor active jobs on worker
    worker.on('active', (job: Job) => {
      const jobType = job.data.jobType || 'default';
      this.logger.log(`Job ${job.id} of type ${jobType} is now active in ${queueName}`);
    });

    // Monitor stalled jobs on worker
    worker.on('stalled', async (jobId: string, prev: string) => {
      const job = await queue.getJob(jobId);
      const jobType = job?.data?.jobType || 'default';
      this.logger.warn(`Job ${jobId} of type ${jobType} stalled in ${queueName}`);
    });
  }

  /**
   * Shutdown monitoring for all queues and cleanup.
   */
  async shutdown() {
    this.logger.log('Shutting down monitoring services...');
    for (const [queueName, queueEvents] of this.queueEventsMap.entries()) {
      await queueEvents.close();
      this.logger.log(`Closed monitoring for queue ${queueName}`);
    }
    this.queueEventsMap.clear();
  }
}
