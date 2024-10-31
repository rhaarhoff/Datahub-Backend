import { SetMetadata, CallHandler, NestInterceptor, Injectable, ExecutionContext as ExecContext } from '@nestjs/common';
import { TenantService } from '@tenant-service/tenant.service';
import { PrismaService } from '@prisma-service/prisma.service';
import { Observable } from 'rxjs';

/**
 * Custom Decorator to set Tenant and User context.
 */
export const SetTenantContext = () => SetMetadata('tenant-context', true);

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantService: TenantService,
    private readonly prisma: PrismaService
  ) {}

  async intercept(context: ExecContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.tenantId && user?.id) {
      // Set the tenant and user context in the tenant service
      await this.tenantService.setTenantAndUser(user.tenantId, user.id);
    }

    return next.handle();
  }
}
