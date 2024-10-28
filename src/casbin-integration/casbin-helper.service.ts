import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { CasbinService } from './casbin.service';

@Injectable()
export class CasbinHelperService {
  private readonly logger = new Logger(CasbinHelperService.name);

  constructor(private readonly casbinService: CasbinService) {}

  // Enforce authorization using Casbin
  async enforceAuthorization(
    userId: number,
    resource: string,
    action: string,
    tenantId: number,
  ): Promise<void> {
    const isAuthorized = await this.casbinService.enforce(
      userId.toString(),
      resource,
      action,
      tenantId.toString(),
    );

    if (!isAuthorized) {
      this.logger.warn(
        `User ${userId} unauthorized to ${action} ${resource} for tenant ${tenantId}`,
      );
      throw new ForbiddenException(`Unauthorized to ${action} ${resource}`);
    }
  }

  // Check if a user has a specific role (RBAC) using hasGroupingPolicy
  async hasRole(userId: number, role: string, tenantId: number): Promise<void> {
    const hasRole = await this.casbinService.hasGroupingPolicy(
      userId.toString(),
      role,
      tenantId.toString(),
    );

    if (!hasRole) {
      this.logger.warn(
        `User ${userId} does not have role ${role} for tenant ${tenantId}`,
      );
      throw new ForbiddenException(`User does not have role: ${role}`);
    }
  }

  // Retrieve all roles for a user using getRolesForUser
  async getRolesForUser(userId: number): Promise<string[]> {
    const roles = await this.casbinService.getRolesForUser(userId.toString());
    this.logger.log(`User ${userId} has roles: ${roles.join(', ')}`);
    return roles;
  }
}
