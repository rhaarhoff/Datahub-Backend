import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TenantService } from '@tenant-service/tenant.service';
import { PrismaService } from '@prisma-service/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenantService: TenantService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Assume user is set by your authentication mechanism

    if (user?.tenantId && user?.id) {
      // Set the tenant and user context
      await this.tenantService.setTenantAndUser(user.tenantId, user.id);
    }

    return true;
  }
}
