import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class NotificationLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NotificationLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const request = context.switchToHttp().getRequest();
    const { notificationType, recipient, provider } = request.body;

    this.logger.log(
      `Processing notification - Type: ${notificationType}, Recipient: ${recipient}, Provider: ${provider}`
    );

    return next.handle().pipe(
      tap({
        next: (response) => {
          const elapsedTime = Date.now() - now;
          this.logger.log(
            `Notification processed successfully in ${elapsedTime}ms - Response: ${JSON.stringify(response)}`
          );
        },
        error: (error) => {
          this.logger.error(
            `Notification failed - Error: ${error.message} - Type: ${notificationType}, Recipient: ${recipient}`
          );
        },
      })
    );
  }
}
