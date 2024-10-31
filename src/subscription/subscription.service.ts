import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { TenantFeatureService } from '../tenant/tenant-feature/tenant-feature.service';
import { FeatureAccessService } from '../feature-access/feature-access.service';
import { UserRoleService } from '../user/user-role/user-role.service';  // Import UserRoleService
import { CacheService } from '../cache/cache.service';  // Import CacheService
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import retry from 'async-retry';  // Utility for retrying cache invalidation

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name); // Define logger

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantFeatureService: TenantFeatureService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly userRoleService: UserRoleService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  // Handle subscription change for a tenant
  async updateSubscription(tenantId: number, newPlanId: number, userId: number) {
    this.logger.log(`Updating subscription for tenant ID ${tenantId} to new plan ID ${newPlanId}`);

    // Start transaction to ensure atomicity
    await this.prisma.$transaction(async (prisma) => {
      // Fetch the new subscription plan
      const subscriptionPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: newPlanId },
      });

      if (!subscriptionPlan) {
        throw new NotFoundException(`Subscription plan with ID ${newPlanId} not found`);
      }

      // Update tenant's subscription plan
      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlanId: newPlanId,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: this.calculateSubscriptionEndDate(subscriptionPlan),
        },
      });

      // Log the subscription update for audit
      await this.auditService.logAction({
        action: AuditAction.UPDATE_SUBSCRIPTION,
        userId,
        tenantId,
        before: { subscriptionPlanId: updatedTenant.subscriptionPlanId },
        after: { subscriptionPlanId: newPlanId },
      });

      // Step 1: Update the tenant features based on the new subscription plan
      await this.tenantFeatureService.updateTenantFeatures(tenantId, newPlanId, userId);

      // Step 2: Update feature access for the tenant's roles
      await this.featureAccessService.updateFeatureAccessForRoles(tenantId);

      // Step 3: Update feature access for the tenant's roles
      await this.featureAccessService.updateFeatureAccessForRoles(tenantId);

      // Step 4: Update user roles to reflect the updated subscription features
      await this.userRoleService.updateRolesForSubscriptionChange(tenantId);

      // Cache Invalidation Step: Invalidate cache for tenant's feature access and features
      await this.invalidateTenantCache(tenantId);
    });

    this.logger.log(`Subscription updated for tenant ${tenantId} to plan ${newPlanId}`);
    return `Subscription updated successfully for tenant ${tenantId} to plan ${newPlanId}`;
  }

  // Helper method to calculate the subscription end date
  private calculateSubscriptionEndDate(subscriptionPlan: any): Date {
    const currentDate = new Date();
    switch (subscriptionPlan.billingCycle) {
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'ANNUAL':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      // Handle other billing cycles if needed
      default:
        throw new Error(`Unsupported billing cycle: ${subscriptionPlan.billingCycle}`);
    }
    return currentDate;
  }

  // Cache invalidation method with retry mechanism
  private async invalidateTenantCache(tenantId: number): Promise<void> {
    const featureAccessCacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'feature-access');
    const tenantFeaturesCacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'features');

    // Retry cache invalidation if it fails, up to 3 attempts
    await retry(
      async () => {
        // Clear cache entries
        await this.cacheService.clear(featureAccessCacheKey);
        await this.cacheService.clear(tenantFeaturesCacheKey);

        this.logger.log(`Cache invalidated for tenant ${tenantId} (features and feature access).`);
      },
      {
        retries: 3,
        onRetry: (err, attempt) =>
          this.logger.warn(`Retry attempt ${attempt} for cache invalidation: ${err.message}`),
      }
    );
  }
}
