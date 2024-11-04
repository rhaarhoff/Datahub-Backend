import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Gauge, Counter } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  // Prometheus gauges for measuring notification processing time
  private readonly processingTimeGauge = new Gauge({
    name: 'notification_processing_time',
    help: 'Time taken to process notifications',
    labelNames: ['notificationType', 'provider'],
  });

  // Counters to track success and failure rates
  private readonly successCounter = new Counter({
    name: 'notification_success_count',
    help: 'Count of successful notifications',
    labelNames: ['notificationType', 'provider'],
  });

  private readonly failureCounter = new Counter({
    name: 'notification_failure_count',
    help: 'Count of failed notifications',
    labelNames: ['notificationType', 'provider'],
  });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { notificationType, provider } = request.body;

    return next.handle().pipe(
      tap({
        next: () => {
          // Calculate processing time
          const elapsedTime = Date.now() - now;
          this.processingTimeGauge.set({ notificationType, provider }, elapsedTime);
          this.successCounter.inc({ notificationType, provider });
          this.logger.log(
            `Notification processed successfully - Type: ${notificationType}, Provider: ${provider}, Time: ${elapsedTime}ms`
          );
        },
        error: (error) => {
          this.failureCounter.inc({ notificationType, provider });
          this.logger.error(
            `Notification processing failed - Type: ${notificationType}, Provider: ${provider}, Error: ${error.message}`
          );
        },
      })
    );
  }
}
