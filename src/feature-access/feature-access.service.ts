import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheManagerService } from '../cache/cache-manager.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AccessLevel } from '@prisma/client';
import { CacheClearException } from '../common/exceptions/cache-clear.exception';
import { UpdateFeatureAccessDto } from './dto/update-feature-access.dto';
import retry from 'async-retry';

@Injectable()
export class FeatureAccessService {
  private readonly logger = new Logger(FeatureAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly auditService: AuditService,
  ) {}

  // Helper function to determine access level based on role name
  private determineAccessLevel(roleName: string): AccessLevel {
    const accessLevelMap: { [key: string]: AccessLevel } = {
      ADMIN: AccessLevel.MANAGE,
      MEMBER: AccessLevel.EDIT,
      GUEST: AccessLevel.VIEW,
    };
    return accessLevelMap[roleName] || AccessLevel.VIEW;
  }

  // Helper function to find feature access or throw an exception
  private async findFeatureAccessOrThrow(featureId: number, tenantId: number, userRoleId: number) {
    const featureAccess = await this.prisma.featureAccess.findUnique({
      where: {
        FeatureAccessCompositeKey: {
          featureId,
          tenantId,
          userRoleId,
        },
      },
    });

    if (!featureAccess || featureAccess.deletedAt) {
      throw new NotFoundException(`Feature access not found or is deleted for feature ID ${featureId}, tenant ID ${tenantId}, and user role ID ${userRoleId}`);
    }

    return featureAccess;
  }

  // Method to retrieve a feature's access details, excluding soft-deleted records
  async getFeatureAccess(
    featureId: number,
    tenantId: number,
    userRoleId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Retrieving access for feature ID ${featureId} for tenant ${tenantId} and user role ${userRoleId}`);

    const featureAccess = await this.findFeatureAccessOrThrow(featureId, tenantId, userRoleId);

    // Log the feature access retrieval
    await this.logAuditAction({
      action: AuditAction.ACCESS_FEATURE,
      userId,
      tenantId,
      featureId,
      before: null,
      after: featureAccess,
      ipAddress,
      userAgent,
    });

    return featureAccess;
  }

  // Method to update feature access details with validation via DTO
  async updateFeatureAccess(
    featureId: number,
    tenantId: number,
    userRoleId: number,
    userId: number,
    accessData: UpdateFeatureAccessDto,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Updating access for feature ID ${featureId} for tenant ${tenantId} and user role ${userRoleId}`);

    const existingAccess = await this.findFeatureAccessOrThrow(featureId, tenantId, userRoleId);

    const updatedAccess = await this.prisma.featureAccess.update({
      where: {
        FeatureAccessCompositeKey: {
          featureId,
          tenantId,
          userRoleId,
        },
      },
      data: {
        accessLevel: accessData.accessLevel,
      },
    });

    // Log the update action with before/after state
    const modifiedFields = ['accessLevel'];

    await this.logAuditAction({
      action: AuditAction.UPDATE_FEATURE_ACCESS,
      userId,
      tenantId,
      featureId,
      before: existingAccess,
      after: updatedAccess,
      ipAddress,
      userAgent,
      modifiedFields,
    });

    return updatedAccess;
  }

  // Method to clear feature access (soft-delete style)
  async clearFeatureAccess(
    featureId: number,
    tenantId: number,
    userRoleId: number,
    userId: number,
    ipAddress: string,
    userAgent: string,
  ) {
    this.logger.log(`Clearing access for feature ID ${featureId} for tenant ${tenantId} and user role ${userRoleId}`);

    const existingAccess = await this.findFeatureAccessOrThrow(featureId, tenantId, userRoleId);

    await this.prisma.featureAccess.update({
      where: {
        FeatureAccessCompositeKey: {
          featureId,
          tenantId,
          userRoleId,
        },
      },
      data: { deletedAt: new Date() },
    });

    // Log the clear action (soft delete)
    await this.logAuditAction({
      action: AuditAction.CLEAR_FEATURE_ACCESS,
      userId,
      tenantId,
      featureId,
      before: existingAccess,
      after: null,
      ipAddress,
      userAgent,
    });

    // Retry cache invalidation if it fails, up to 3 attempts
    await retry(async () => {
      await this.invalidateFeatureAccessCache(tenantId, featureId);
    }, {
      retries: 3,
      onRetry: (err, attempt) =>
        this.logger.warn(`Retry attempt ${attempt} for cache invalidation: ${err.message}`),
    });
  }

  public async updateFeatureAccessForRoles(tenantId: number) {
    this.logger.log(`Starting feature access update for all roles of tenant ${tenantId}`);
  
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Step 1: Retrieve the subscription plan and associated features for the tenant
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { subscriptionPlan: { include: { features: true } } },
        });
  
        if (!tenant?.subscriptionPlan) {
          this.logger.warn(`No subscription plan found for tenant ID ${tenantId}`);
          return;
        }
  
        const availableFeatures = tenant.subscriptionPlan.features;
  
        // Step 2: Retrieve all roles associated with the tenant
        const roles = await prisma.userRole.findMany({
          where: {
            tenantId,
            deletedAt: null,
          },
          include: { role: true },
        });
  
        if (roles.length === 0) {
          this.logger.warn(`No roles found for tenant ID ${tenantId}`);
          return;
        }
  
        // Step 3: Prepare bulk upsert operations for feature access
        const featureAccessUpsertData = roles.flatMap((role) =>
          availableFeatures.map((feature) => ({
            where: {
              FeatureAccessCompositeKey: {
                featureId: feature.id,
                tenantId,
                userRoleId: role.id,
              },
            },
            update: {
              accessLevel: this.determineAccessLevel(role.role.name),
            },
            create: {
              featureId: feature.id,
              tenantId,
              userRoleId: role.id,
              accessLevel: this.determineAccessLevel(role.role.name),
            },
          }))
        );
  
        // Step 4: Execute bulk upserts for feature access
        await Promise.all(
          featureAccessUpsertData.map((upsertData) =>
            prisma.featureAccess.upsert(upsertData).catch((error) => {
              this.logger.error(
                `Failed to upsert feature access for feature ID ${upsertData.create.featureId}, role ID ${upsertData.create.userRoleId}: ${error.message}`
              );
            })
          )
        );
  
        // Step 5: Soft delete feature access for features no longer in the subscription plan
        const featureIdsToKeep = availableFeatures.map((feature) => feature.id);
        await prisma.featureAccess.updateMany({
          where: {
            tenantId,
            userRoleId: { in: roles.map((role) => role.id) },
            featureId: { notIn: featureIdsToKeep },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
  
        this.logger.log(`Successfully updated feature access for all roles of tenant ${tenantId}`);
      });
    } catch (error) {
      this.logger.error(`Failed to update feature access for tenant ${tenantId}: ${error.message}`);
      throw error;
    }
  }
  

  // Helper method to create or update feature access
  public async createOrUpdateFeatureAccess(
    userRoleId: number,
    featureId: number,
    tenantId: number,
    accessLevel: AccessLevel,
  ) {
    await this.prisma.featureAccess.upsert({
      where: {
        FeatureAccessCompositeKey: {
          featureId,
          tenantId,
          userRoleId,
        },
      },
      update: { accessLevel },
      create: {
        featureId,
        tenantId,
        userRoleId,
        accessLevel,
      },
    });

    // Log the creation or update of feature access for auditing purposes
    await this.auditService.logAction({
      action: AuditAction.UPDATE_FEATURE_ACCESS,
      userId: null,
      tenantId,
      featureId,
      after: { featureId, tenantId, userRoleId, accessLevel },
    });
  }

  // Helper function to log actions, with error handling for failed logs
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
    try {
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
    } catch (error) {
      this.logger.error(`Failed to log audit action for feature ${featureId}: ${error.message}`);
    }
  }

  // Helper method for invalidating cache
  public async invalidateFeatureAccessCache(tenantId: number, featureId: number) {
    try {
      await this.cacheManagerService.invalidateFeatureCache(tenantId, featureId);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate feature access cache for tenant ${tenantId} and feature ${featureId}: ${error.message}`,
      );
      throw new CacheClearException(`tenant_${tenantId}_feature_${featureId}`, error.message);
    }
  }
}
