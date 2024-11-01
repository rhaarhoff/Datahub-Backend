import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from '../../../audit/audit.service';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditAction } from '../../../audit/interfaces/audit-action.enum';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { userId, tenantId, featureId } = request.body;
    const action = this.determineAuditAction(context);

    return next.handle().pipe(
      tap(async (response) => {
        await this.auditService.logAction({
          action,
          userId,
          tenantId,
          featureId,
          before: null,
          after: response,
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        });
      }),
      catchError((error) => {
        this.auditService.logAction({
          action,
          userId,
          tenantId,
          featureId,
          before: null,
          after: null,
          ipAddress: request.ip,
          userAgent: request.get('user-agent'),
        });
        throw error;
      }),
    );
  }

  private determineAuditAction(context: ExecutionContext): AuditAction {
    return this.reflector.get<AuditAction>('auditAction', context.getHandler()) || AuditAction.DEFAULT;
  }
}
