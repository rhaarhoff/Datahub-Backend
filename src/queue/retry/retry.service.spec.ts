import { Test, TestingModule } from '@nestjs/testing';
import { RetryService } from './retry.service';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import axios from 'axios';

// Mock the axios module
jest.mock('axios');

describe('RTS-RS-01 - RetryService', () => {
  let retryService: RetryService;
  let mockConfigService: ConfigService;
  let mockQueue: Queue;

  const mockJob: Job = {
    id: '1',
    name: 'test-job',
    data: { jobType: 'default' },
    attemptsMade: 1,
    opts: { priority: 1 },
  } as unknown as Job;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        switch (key) {
          case 'RETRY_ATTEMPTS_DEFAULT':
          case 'RETRY_ATTEMPTS_CRITICAL':
            return 3;
          case 'BACKOFF_TYPE_DEFAULT':
          case 'BACKOFF_TYPE_CRITICAL':
            return 'exponential';
          case 'BACKOFF_DELAY_DEFAULT':
          case 'BACKOFF_DELAY_CRITICAL':
            return 1000;
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    retryService = module.get<RetryService>(RetryService);
  });

  describe('RTS-RS-02 - applyRetryStrategy', () => {
    beforeEach(() => {
      mockQueue = {
        add: jest.fn(),
      } as unknown as Queue;
    });

    it('RTS-RS-02-01 - should retry job with default jobType on error', async () => {
      const mockError = new Error('Test error');

      await retryService.applyRetryStrategy(mockQueue, mockJob, mockError);

      expect(mockQueue.add).toHaveBeenCalledWith(
        mockJob.name,
        mockJob.data,
        expect.objectContaining({
          attempts: 3,
          backoff: expect.objectContaining({
            type: 'exponential',
            delay: 2000,
          }),
          priority: mockJob.opts.priority,
        }),
      );
    });

    it('RTS-RS-02-02 - should not retry when max attempts are reached', async () => {
      mockJob.attemptsMade = 3;

      const mockError = new Error('Test error');

      await retryService.applyRetryStrategy(mockQueue, mockJob, mockError);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalled(); // Check for alert notification
    });

    it('RTS-RS-02-03 - should send an alert when retries are exhausted', async () => {
      mockJob.attemptsMade = 3;

      const mockError = new Error('Test error');

      await retryService.applyRetryStrategy(mockQueue, mockJob, mockError);

      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
        text: expect.any(String),
        jobData: mockJob.data,
      });
    });
  });
});
