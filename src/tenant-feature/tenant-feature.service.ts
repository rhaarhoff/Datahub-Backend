import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma-service/prisma.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { SubscriptionPlanInvalidException } from '../common/exceptions/subscription-plan-invalid.exception';
import { TenantFeatureUpdateException } from '../common/exceptions/tenant-feature-update.exception';
import { TenantFeatureInsertException } from '../common/exceptions/tenant-feature-insert.exception';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';

@Injectable()
export class TenantFeatureService {
  private readonly logger = new Logger(TenantFeatureService.name);
  private readonly bulkInsertChunkSize = 500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManager: CacheManagerService,
    private readonly casbinHelper: CasbinHelperService,
  ) {}

  // Update tenant features with authorization and caching logic
  async updateTenantFeatures(
    tenantId: number,
    newPlanId: number,
    userId: number,
  ): Promise<string> {
    // Authorization check
    await this.casbinHelper.enforceAuthorization(
      userId,
      `/tenant-features/update`,
      'update',
      tenantId,
    );

    try {
      // Invalidate feature cache
      await this.cacheManager.invalidateFeatureCache(tenantId);

      // Fetch and validate subscription plan
      const newPlan = await this.getSubscriptionPlan(newPlanId);

      // Update the database with the new plan's features
      const tenantFeaturesData = await this.updateDatabaseWithNewFeatures(
        tenantId,
        newPlan,
      );

      // Cache tenant features using the CacheManagerService
      await this.cacheManager.cacheData(
        ['tenant', tenantId.toString(), 'features'],
        tenantFeaturesData,
        'features',
      );

      return `Tenant features updated for tenant ${tenantId} with plan ${newPlanId}`;
    } catch (error) {
      return this.handleUpdateError(tenantId, error);
    }
  }

  // Fetch tenant features from the database
  async getTenantFeatures(tenantId: number): Promise<any[]> {
    return await this.prisma.tenantFeature.findMany({
      where: { tenantId },
    });
  }

  // Handle subscription plan fetch and validation
  private async getSubscriptionPlan(planId: number) {
    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { features: true },
    });

    if (!newPlan || newPlan.features.length === 0) {
      throw new SubscriptionPlanInvalidException(
        `Subscription plan ${planId} has no features or is invalid`,
      );
    }

    return newPlan;
  }

  // Update database features in transaction
  private async updateDatabaseWithNewFeatures(
    tenantId: number,
    newPlan: any,
  ): Promise<any[]> {
    const tenantFeaturesData = this.mapTenantFeatures(tenantId, newPlan);

    try {
      await this.prisma.$transaction(
        async (txPrisma: Prisma.TransactionClient) => {
          await txPrisma.tenantFeature.deleteMany({ where: { tenantId } });

          if (tenantFeaturesData.length > 0) {
            await this.bulkInsertTenantFeatures(tenantFeaturesData, txPrisma);
          }
        },
      );
    } catch (error) {
      this.handleDatabaseError(tenantId, error);
    }

    return tenantFeaturesData;
  }

  // Map subscription plan features to tenant feature data
  private mapTenantFeatures(tenantId: number, newPlan: any): any[] {
    return newPlan.features.map((feature) => ({
      tenantId,
      featureId: feature.id,
      enabled: true,
    }));
  }

  // Bulk insert tenant features in chunks
  private async bulkInsertTenantFeatures(
    tenantFeaturesData: any[],
    prisma: Prisma.TransactionClient,
  ): Promise<void> {
    const chunks = this.chunkArray(
      tenantFeaturesData,
      this.bulkInsertChunkSize,
    );

    for (const chunk of chunks) {
      try {
        await prisma.tenantFeature.createMany({ data: chunk });
      } catch (error) {
        this.logger.error(
          `Failed to insert tenant features for chunk: ${error.message}`,
        );
        throw new TenantFeatureInsertException(
          'Failed to bulk insert tenant features.',
        );
      }
    }
  }

  // Handle errors related to database operations
  private handleDatabaseError(tenantId: number, error: Error) {
    if (!(error instanceof TenantFeatureInsertException)) {
      this.logger.error(
        `Error updating features in the database for tenant ${tenantId}: ${error.message}`,
      );
      throw new TenantFeatureUpdateException(
        tenantId,
        `Failed to update tenant features for tenant ${tenantId}`,
      );
    }

    throw error;
  }

  // Handle errors during the update process
  private handleUpdateError(tenantId: number, error: Error): never {
    if (
      error instanceof SubscriptionPlanInvalidException ||
      error instanceof TenantFeatureInsertException
    ) {
      throw error;
    }

    this.logger.error(
      `Error updating tenant features for tenant ${tenantId}: ${error.message}`,
    );
    throw new TenantFeatureUpdateException(
      tenantId,
      `Failed to update tenant features for tenant ${tenantId}`,
    );
  }

  // Utility to chunk arrays for bulk operations
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
