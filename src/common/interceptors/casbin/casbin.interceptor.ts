import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CasbinInterceptor implements NestInterceptor {
  constructor(
    private readonly casbinHelperService: CasbinHelperService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const { resource, action } = this.reflector.get('authorize', context.getHandler());

    if (!resource || !action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const tenantId = request.user?.tenantId;

    if (!userId || !tenantId) {
      throw new ForbiddenException('Unauthorized access');
    }

    // Enforce authorization using Casbin
    const hasPermission = await this.casbinHelperService.enforceAuthorization(userId, resource, action, tenantId);
    if (!hasPermission) {
      throw new ForbiddenException(`Access denied: You do not have permission to ${action} ${resource} for tenant ${tenantId}`);
    }

    return next.handle();
  }
}
