import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class ServiceLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ServiceLog');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const serviceLogMessage = this.reflector.get<string>('serviceLog', context.getHandler());
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    if (serviceLogMessage) {
      const startTime = Date.now();
      this.logger.log(`Starting ${serviceLogMessage} in ${className}.${methodName}`);

      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - startTime;
          this.logger.log(`Completed ${serviceLogMessage} in ${className}.${methodName} (Execution Time: ${duration}ms)`);
        }),
        catchError((error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`Error in ${serviceLogMessage} in ${className}.${methodName} after ${duration}ms: ${error.message}`);
          throw error;
        }),
      );
    }

    return next.handle();
  }
}
