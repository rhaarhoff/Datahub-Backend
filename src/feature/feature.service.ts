import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeatureInput } from '@feature-dto/create-feature.input';
import { UpdateFeatureInput } from '@feature-dto/update-feature.input';
import { CacheManagerService } from '../cache/cache-manager.service';
import { CasbinHelperService } from '../casbin-integration/casbin-helper.service';
import { AuditService } from '../audit/audit.service';
import { FeatureNotFoundException } from '../common/exceptions/feature-not-found.exception';
import { InvalidFeatureTierException } from '../common/exceptions/invalid-feature-tier.exception';
import { CacheClearException } from '../common/exceptions/cache-clear.exception';
import { CacheSetException } from '../common/exceptions/cache-set.exception';
import { AuditAction } from '@prisma/client';

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly casbinHelperService: CasbinHelperService,
    private readonly auditService: AuditService,
  ) {}

  // List all features for a tenant
  async listFeatures(tenantId: number, skip = 0, take = 10) {
    this.logger.log(`Listing all features for tenant ${tenantId}`);

    // Limit the maximum value of 'take' to 1000
    take = Math.min(take, 1000);

    const features = await this.prisma.feature.findMany({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
      },
      skip,
      take,
    });

    return features;
  }

  // Soft delete a feature
  async remove(
    id: number,
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(
      `Soft deleting feature with ID ${id} for tenant ${tenantId}`,
    );
    const existingFeature = await this.getFeatureById(id, tenantId);

    if (!existingFeature) {
      throw new FeatureNotFoundException(id, tenantId);
    }

    const softDeletedFeature = await this.prisma.feature.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.invalidateFeatureCache(tenantId, id);

    await this.logAuditAction({
      action: AuditAction.SOFT_DELETE_FEATURE,
      userId,
      tenantId,
      featureId: id,
      before: existingFeature,
      after: softDeletedFeature,
      ipAddress,
      userAgent,
    });

    return softDeletedFeature;
  }

  // Bulk soft delete features
  async bulkRemove(
    featureIds: number[],
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Bulk soft deleting features for tenant ${tenantId}`);

    const results = await Promise.allSettled(
      featureIds.map((id) =>
        this.remove(id, tenantId, userId, ipAddress, userAgent),
      ),
    );

    const success = results.filter((result) => result.status === 'fulfilled');
    const errors = results.filter((result) => result.status === 'rejected');

    return { success, errors };
  }

  // Restore a soft-deleted feature
  async restore(
    id: number,
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Restoring feature with ID ${id} for tenant ${tenantId}`);

    const feature = await this.prisma.feature.findFirst({
      where: {
        id,
        deletedAt: { not: null },
        TenantFeature: { some: { tenantId } },
      },
    });

    if (!feature) {
      throw new NotFoundException(
        `Feature with ID ${id} is not in the recycle bin.`,
      );
    }

    const restoredFeature = await this.prisma.feature.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.setCache(`tenant_${tenantId}_feature_${id}`, restoredFeature);

    await this.logAuditAction({
      action: AuditAction.RESTORE_FEATURE,
      userId,
      tenantId,
      featureId: id,
      before: feature,
      after: restoredFeature,
      ipAddress,
      userAgent,
    });

    return restoredFeature;
  }

  // Bulk restore features
  async bulkRestore(
    featureIds: number[],
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Bulk restoring features for tenant ${tenantId}`);
    return await Promise.all(
      featureIds.map((id) =>
        this.restore(id, tenantId, userId, ipAddress, userAgent),
      ),
    );
  }

  // Permanently delete a feature
  async hardRemove(
    id: number,
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(
      `Permanently deleting feature with ID ${id} for tenant ${tenantId}`,
    );

    const feature = await this.prisma.feature.findFirst({
      where: { id, TenantFeature: { some: { tenantId } } },
    });

    if (!feature) {
      throw new FeatureNotFoundException(id, tenantId);
    }

    await this.prisma.feature.delete({ where: { id } });

    await this.logAuditAction({
      action: AuditAction.DELETE_FEATURE,
      userId,
      tenantId,
      featureId: id,
      before: feature,
      after: null,
      ipAddress,
      userAgent,
    });

    await this.invalidateFeatureCache(tenantId, id);

    this.logger.log(
      `Feature with ID ${id} permanently deleted for tenant ${tenantId}`,
    );
  }

  // Bulk permanently delete features
  async bulkHardRemove(
    featureIds: number[],
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(
      `Bulk permanently deleting features for tenant ${tenantId}`,
    );
    return await Promise.all(
      featureIds.map((id) =>
        this.hardRemove(id, tenantId, userId, ipAddress, userAgent),
      ),
    );
  }

  // Create a feature with authorization, audit logging, cache set, and cache invalidation
  async create(
    createFeatureInput: CreateFeatureInput,
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(
      `Tenant ${tenantId} creating feature: ${createFeatureInput.name}`,
    );

    await this.casbinHelperService.enforceAuthorization(
      userId,
      '/features/create',
      'create',
      tenantId,
    );

    await this.validateFeatureTier(createFeatureInput.tierId);

    return this.prisma.$transaction(async (txPrisma) => {
      const newFeature = await txPrisma.feature.create({
        data: {
          name: createFeatureInput.name,
          description: createFeatureInput.description,
          isPremium: createFeatureInput.isPremium,
          enabled: createFeatureInput.enabled,
          TenantFeature: { create: { tenantId } },
          tier: { connect: { id: createFeatureInput.tierId } },
        },
      });

      await this.setCache(
        `tenant_${tenantId}_feature_${newFeature.id}`,
        newFeature,
      );

      await this.logAuditAction({
        action: AuditAction.CREATE_FEATURE,
        userId,
        tenantId,
        featureId: newFeature.id,
        before: null,
        after: newFeature,
        ipAddress,
        userAgent,
      });

      await this.cacheManagerService.invalidateFeatureCache(tenantId);

      return newFeature;
    });
  }

  // Update feature
  async update(
    id: number,
    updateFeatureInput: UpdateFeatureInput,
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(
      `Tenant ${tenantId} attempting to update feature with ID ${id}`,
    );

    await this.authorizeAction(userId, tenantId, 'update', '/features/update');

    const existingFeature = await this.getFeatureById(id, tenantId);

    const updatedFeature = await this.prisma.feature.update({
      where: { id },
      data: updateFeatureInput,
    });

    await this.setCache(`tenant_${tenantId}_feature_${id}`, updatedFeature);

    // Find modified fields
    const modifiedFields = Object.keys(updateFeatureInput).filter(
      (key) => existingFeature[key] !== updatedFeature[key],
    );

    await this.logAuditAction({
      action: AuditAction.UPDATE_FEATURE,
      userId,
      tenantId,
      featureId: id,
      before: existingFeature,
      after: updatedFeature,
      ipAddress,
      userAgent,
      modifiedFields,
    });

    await this.invalidateFeatureCache(tenantId, id);

    return updatedFeature;
  }

  // Toggle feature status (enable/disable)
  async toggleFeatureStatus(id: number, tenantId: number) {
    const feature = await this.getFeatureById(id, tenantId);

    const updatedFeature = await this.prisma.feature.update({
      where: { id },
      data: { enabled: !feature.enabled },
    });

    await this.invalidateFeatureCache(tenantId, id);

    this.logger.log(
      `Feature with ID ${id} has been ${updatedFeature.enabled ? 'enabled' : 'disabled'}`,
    );

    return updatedFeature;
  }

  // Helper methods

  public async authorizeAction(
    userId: number,
    tenantId: number,
    action: string,
    resource: string,
  ) {
    return this.casbinHelperService.enforceAuthorization(
      userId,
      resource,
      action,
      tenantId,
    );
  }

  public async setCache(key: string, value: any) {
    try {
      await this.cacheManagerService.set(key, value);
    } catch (err) {
      this.logger.error(`Failed to set cache for ${key}: ${err.message}`);
      throw new CacheSetException(key, err.message);
    }
  }

  public async invalidateFeatureCache(tenantId: number, featureId?: number) {
    try {
      if (featureId) {
        await this.cacheManagerService.invalidateFeatureCache(
          tenantId,
          featureId,
        );
      } else {
        await this.cacheManagerService.invalidateFeatureCache(tenantId); // fallback for all features if necessary
      }
    } catch (err) {
      const cacheKey = featureId
        ? `${tenantId}-${featureId}`
        : tenantId.toString();
      this.logger.error(
        `Failed to invalidate cache for ${cacheKey}: ${err.message}`,
      );
      throw new CacheClearException(cacheKey, err.message);
    }
  }

  public async logAuditAction({
    action,
    userId,
    tenantId,
    featureId,
    before,
    after,
    ipAddress,
    userAgent,
    modifiedFields,
  }: {
    action: AuditAction;
    userId: number;
    tenantId: number;
    featureId: number;
    before: any;
    after: any;
    ipAddress: string;
    userAgent: string;
    modifiedFields?: string[];
  }) {
    await this.auditService.logAction({
      action,
      userId,
      tenantId,
      featureId,
      before,
      after,
      ipAddress,
      userAgent,
      modifiedFields,
    });
  }

  public async getFeatureById(
    id: number,
    tenantId: number,
    includeDeleted = false,
  ) {
    const feature = await this.prisma.feature.findFirst({
      where: {
        id,
        TenantFeature: { some: { tenantId } },
        deletedAt: includeDeleted ? undefined : null,
      },
    });

    if (!feature) {
      this.logger.warn(
        `Feature with ID ${id} not found for tenant ${tenantId}`,
      );
      throw new FeatureNotFoundException(id, tenantId);
    }

    return feature;
  }

  public async validateFeatureTier(tierId: number) {
    const tier = await this.prisma.featureTier.findUnique({
      where: { id: tierId },
    });
    if (!tier) {
      this.logger.warn(`Invalid tierId ${tierId}`);
      throw new InvalidFeatureTierException(tierId);
    }
  }

  public chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  // List all soft-deleted features (recycle bin)
  async findAllDeleted(tenantId: number, skip = 0, take = 10) {
    this.logger.log(
      `Retrieving all soft-deleted features for tenant ${tenantId}`,
    );

    // Limit the maximum value of 'take' to 1000
    take = Math.min(take, 1000);

    const deletedFeatures = await this.prisma.feature.findMany({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: { not: null },
      },
      skip,
      take,
    });

    return deletedFeatures;
  }

  // List all active (non-soft-deleted) features for a tenant
  async findAll(
    tenantId: number,
    name?: string,
    tierId?: number,
    isPremium?: boolean,
  ) {
    this.logger.log(`Listing all active features for tenant ${tenantId}`);

    const features = await this.prisma.feature.findMany({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
        ...(name && { name: { contains: name } }),
        ...(tierId && { tierId }),
        ...(isPremium !== undefined && { isPremium }),
      },
    });

    return features;
  }

  async bulkCreate(
    createFeatureInputs: CreateFeatureInput[],
    tenantId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Bulk creating features for tenant ${tenantId}`);

    // Validate feature tiers for each feature before creating
    for (const featureInput of createFeatureInputs) {
      await this.validateFeatureTier(featureInput.tierId);
    }

    // Create all features within a transaction
    return this.prisma.$transaction(async (txPrisma) => {
      const createdFeatures = await Promise.all(
        createFeatureInputs.map(async (input) => {
          const newFeature = await txPrisma.feature.create({
            data: {
              name: input.name,
              description: input.description,
              isPremium: input.isPremium,
              enabled: input.enabled,
              TenantFeature: { create: { tenantId } },
              tier: { connect: { id: input.tierId } },
            },
          });

          // Set cache for the new feature
          await this.setCache(
            `tenant_${tenantId}_feature_${newFeature.id}`,
            newFeature,
          );

          // Log audit for feature creation
          await this.logAuditAction({
            action: AuditAction.BULK_CREATE_FEATURE,
            userId,
            tenantId,
            featureId: newFeature.id,
            before: null,
            after: newFeature,
            ipAddress,
            userAgent,
          });

          return newFeature;
        }),
      );

      // Invalidate the tenant's feature cache (non-blocking)
      await this.cacheManagerService.invalidateFeatureCache(tenantId);

      return createdFeatures;
    });
  }

  async findAllWithPagination(
    tenantId: number,
    filters: { name?: string; tierId?: number; isPremium?: boolean },
    skip: number,
    take: number,
  ) {
    this.logger.log(`Retrieving features for tenant ${tenantId} with pagination`);
  
    const features = await this.prisma.feature.findMany({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null, // only non-deleted features
        ...(filters.name && { name: { contains: filters.name } }),
        ...(filters.tierId && { tierId: filters.tierId }),
        ...(filters.isPremium !== undefined && { isPremium: filters.isPremium }),
      },
      skip,
      take,
    });
  
    const total = await this.prisma.feature.count({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: null,
        ...(filters.name && { name: { contains: filters.name } }),
        ...(filters.tierId && { tierId: filters.tierId }),
        ...(filters.isPremium !== undefined && { isPremium: filters.isPremium }),
      },
    });
  
    return { total, features };
  }
  
  async findAllDeletedWithPagination(
    tenantId: number,
    skip = 0,
    take = 10,
  ): Promise<{ total: number; features: any[] }> {
    this.logger.log(
      `Retrieving all soft-deleted features for tenant ${tenantId} with pagination`,
    );
  
    // Limit the maximum value of 'take' to 1000
    take = Math.min(take, 1000);
  
    // Fetch soft-deleted features with pagination
    const features = await this.prisma.feature.findMany({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: { not: null }, // Only fetch soft-deleted features
      },
      skip,
      take,
    });
  
    // Count total number of soft-deleted features for the tenant
    const total = await this.prisma.feature.count({
      where: {
        TenantFeature: { some: { tenantId } },
        deletedAt: { not: null },
      },
    });
  
    return { total, features };
  }
  
}
