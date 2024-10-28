import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { TenantRoleService } from './tenant-role/tenant-role.service'; // Import TenantRoleService
import { SubscriptionService } from '../subscription/subscription.service'; // Import SubscriptionService
import { FeatureAccessService } from '../feature-access/feature-access.service'; // Import FeatureAccessService
import { UserRoleService } from '../user-role/user-role.service'; // Import UserRoleService
import { CacheService } from '../cache/cache.service'; // Import CacheService
import retry from 'async-retry';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantRoleService: TenantRoleService,
    private readonly subscriptionService: SubscriptionService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly userRoleService: UserRoleService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Set tenant and user context in PostgreSQL for RLS
   */
  async setTenantAndUser(tenantId: number, userId: number): Promise<void> {
    try {
      await this.prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;
      await this.prisma.$executeRaw`SET app.current_user_id = ${userId}`;
      this.logger.log(`Set tenant and user context for tenant ID: ${tenantId}, user ID: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to set tenant and user context: ${error.message}`);
      throw new Error('Failed to set tenant and user context');
    }
  }

  async create(createTenantDto: any) {
    // Step 1: Create the tenant
    const tenant = await this.prisma.tenant.create({ data: createTenantDto });
    this.logger.log(`Tenant created with ID: ${tenant.id}`);

    // Step 2: Assign default roles to tenant
    try {
      await this.tenantRoleService.assignDefaultRoles(tenant.id);
      this.logger.log(`Default roles assigned for tenant ID: ${tenant.id}`);
    } catch (error) {
      this.logger.error(`Failed to assign default roles for tenant ID ${tenant.id}: ${error.message}`);
    }

    // Step 3: Set up default subscription plan for the new tenant
    try {
      await this.subscriptionService.setupDefaultSubscriptionForTenant(tenant.id);
      this.logger.log(`Default subscription plan set up for tenant ID: ${tenant.id}`);
    } catch (error) {
      this.logger.error(`Failed to set up default subscription plan for tenant ID ${tenant.id}: ${error.message}`);
    }

    // Step 4: Initialize feature access for roles
    try {
      await this.featureAccessService.updateFeatureAccessForRoles(tenant.id);
      this.logger.log(`Initialized feature access for roles of tenant ID: ${tenant.id}`);
    } catch (error) {
      this.logger.error(`Failed to initialize feature access for tenant ID ${tenant.id}: ${error.message}`);
    }

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async update(id: number, updateTenantDto: any) {
    const updatedTenant = await this.prisma.tenant.update({ where: { id }, data: updateTenantDto });
    this.logger.log(`Tenant updated with ID: ${id}`);

    // Update feature access or subscriptions if needed
    await this.updateFeatureAccessForTenant(id);
    return updatedTenant;
  }

  async remove(id: number) {
    const deletedTenant = await this.prisma.tenant.delete({ where: { id } });
    this.logger.log(`Tenant removed with ID: ${id}`);

    // Handle cleanup (e.g., deleting roles, feature access, or subscriptions)
    await this.cleanupTenantRelatedData(id);
    return deletedTenant;
  }

  /**
   * Update feature access for tenant's roles and subscriptions.
   */
  private async updateFeatureAccessForTenant(tenantId: number): Promise<void> {
    try {
      await this.subscriptionService.updateFeatureAccessForTenant(tenantId);
      this.logger.log(`Feature access updated for tenant ID: ${tenantId}`);
      
      // Invalidate Cache after update
      await this.invalidateTenantCache(tenantId);
    } catch (error) {
      this.logger.error(`Failed to update feature access for tenant ID ${tenantId}: ${error.message}`);
    }
  }

  /**
   * Cleanup tenant-related data after tenant removal.
   */
  private async cleanupTenantRelatedData(tenantId: number): Promise<void> {
    try {
      await this.tenantRoleService.deleteRolesForTenant(tenantId);
      await this.subscriptionService.cleanupSubscriptionForTenant(tenantId);
      await this.featureAccessService.clearFeatureAccessForTenant(tenantId); // Clear feature access for all roles
      this.logger.log(`Cleaned up related data for tenant ID: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to clean up related data for tenant ID ${tenantId}: ${error.message}`);
    }
  }

  /**
   * Helper to invalidate cache for tenant roles and feature access
   */
  private async invalidateTenantCache(tenantId: number): Promise<void> {
    const tenantCacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'roles');
    const tenantFeaturesCacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'features');

    await retry(async () => {
      await Promise.all([
        this.cacheService.clear(tenantCacheKey),
        this.cacheService.clear(tenantFeaturesCacheKey),
      ]);
      this.logger.log(`Cache invalidated for tenant ID: ${tenantId}`);
    }, {
      retries: 3,
      onRetry: (err, attempt) => this.logger.warn(`Retry attempt ${attempt} for cache invalidation: ${err.message}`),
    });
  }
}
