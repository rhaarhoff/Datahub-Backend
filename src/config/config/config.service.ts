import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  getRetryAttempts(queueName: string): number {
    const key = `RETRY_ATTEMPTS_${queueName.toUpperCase()}`;
    const value = this.configService.get<number>(key, this.getGlobalRetryAttempts());
    this.logConfigAccess(key, value);
    return value;
  }

  getGlobalRetryAttempts(): number {
    return this.configService.get<number>('RETRY_ATTEMPTS_DEFAULT', 3);
  }

  getBackoffStrategy(queueName: string): { type: string, delay: number, maxDelay?: number } {
    const type = this.configService.get<string>(`BACKOFF_TYPE_${queueName.toUpperCase()}`, 'exponential');
    const delay = this.configService.get<number>(`BACKOFF_DELAY_${queueName.toUpperCase()}`, 1000);
    const maxDelay = this.configService.get<number>(`BACKOFF_MAX_DELAY_${queueName.toUpperCase()}`, 10000); // default 10 seconds max
    return { type, delay, maxDelay };
  }

  getDeadLetterQueueName(queueName: string): string {
    return this.configService.get<string>(`DEAD_LETTER_QUEUE_${queueName.toUpperCase()}`, this.getGlobalDeadLetterQueueName());
  }

  getGlobalDeadLetterQueueName(): string {
    return this.configService.get<string>('DEAD_LETTER_QUEUE_DEFAULT', 'global-dead-letter-queue');
  }

  getRateLimit(queueName: string): number {
    return this.configService.get<number>(`RATE_LIMIT_${queueName.toUpperCase()}`, this.getGlobalRateLimit());
  }

  getBurstRate(queueName: string): number {
    return this.configService.get<number>(`BURST_RATE_${queueName.toUpperCase()}`, this.getGlobalBurstRate());
  }

  getGlobalRateLimit(): number {
    return this.configService.get<number>('RATE_LIMIT_DEFAULT', 60); // default 60 requests per minute
  }

  getGlobalBurstRate(): number {
    return this.configService.get<number>('BURST_RATE_DEFAULT', 10); // default burst rate of 10
  }

  getEnvironment(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  private logConfigAccess(key: string, value: any) {
    console.log(`Config Access - Key: ${key}, Value: ${value}`);
  }
}
