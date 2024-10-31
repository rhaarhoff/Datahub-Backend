import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { CreateTenantPermissionDto } from './dto/create-tenant-permission.dto';
import { UpdateTenantPermissionDto } from './dto/update-tenant-permission.dto';
import { TenantPermission } from './models/tenant-permission.model';
import { plainToInstance } from 'class-transformer';
import retry from 'async-retry';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class TenantPermissionService {
  create(create: any) {
    throw new Error('Method not implemented.');
  }
  findPermissionsForTenant(findPermissionsForTenant: any) {
    throw new Error('Method not implemented.');
  }
  clearRecycleBin(clearRecycleBin: any) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(TenantPermissionService.name);

  // Prisma include configuration for related data
  private readonly tenantPermissionWithRelations = {
    tenant: {
      include: {
        users: { select: { id: true, tenantId: true, createdAt: true, updatedAt: true, userId: true } },
        tenantFeatures: { select: { id: true, tenantId: true, featureId: true, enabled: true, subscribedAt: true } },
        userRoles: { select: { id: true, roleName: true, tenantId: true } },
      },
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) { }

  // Unified method for retryable operations with error handling
  private async handleOperation<T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
    retries = 3
  ): Promise<T> {
    return retry(
      async () => {
        try {
          const result = await operation();
          this.logger.log(successMessage);
          return result;
        } catch (error) {
          // Handle error and decide whether to retry
          const handledError = this.handleError(error);
          if (handledError instanceof BadRequestException || handledError instanceof NotFoundException) {
            throw handledError; // Do not retry on client errors
          }
          // For other errors, log and rethrow to retry
          this.logger.error(`${errorMessage}: ${handledError.message}`, handledError.stack);
          throw handledError;
        }
      },
      {
        retries,
        onRetry: (err: Error, attempt: number) => {
          this.logger.warn(`Retry attempt ${attempt} for ${errorMessage}: ${err.message}`);
        },
      }
    );
  }

  // Common error handling method
  private handleError(error: any): Error {
    console.log('Handling error in handleError:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new BadRequestException('Unique constraint violation');
    }
    if (error instanceof Prisma.PrismaClientValidationError) {
      const isMissingFields = error.message.includes('Missing required fields'); // Adjust check if needed
      return new BadRequestException(isMissingFields ? 'Missing required fields' : 'Invalid data provided');
    }
    if (error.message.includes('Network error') || error.message.includes('could not connect to database')) {
      return new Error('Retryable network error');
    }
    return error instanceof Error ? error : new Error(String(error));
  }


  // Reusable cache updater for permission caching
  private async updateCache(tenantId: number, permission: TenantPermission, invalidate = false): Promise<void> {
    const cacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), `permission-${permission.id}`);
    if (invalidate) {
      await this.cacheService.clear(cacheKey);
      this.logger.log(`Cache invalidated for permission ID ${permission.id} of tenant ${tenantId}`);
    } else {
      await this.cacheService.set(cacheKey, permission);
      this.logger.log(`Cache updated for permission ID ${permission.id} of tenant ${tenantId}`);
    }
  }

  // Helper for audit logging
  private async auditAction(action: AuditAction, userId: number, tenantId: number, before: any, after: any): Promise<void> {
    try {
      await this.auditService.logAction({ action, userId, tenantId, before, after });
    } catch (error) {
      this.logger.error(`Failed to log action ${action} for user ${userId}: ${error.message}`);
    }
  }

  // Fetch a permission by ID, including tenant data, or throw NotFoundException
  private async findPermissionOrFail(id: number): Promise<TenantPermission> {
    const tenantPermission = await this.prisma.tenantPermission.findUnique({
      where: { id },
      include: this.tenantPermissionWithRelations,
    });
    if (!tenantPermission) {
      throw new NotFoundException(`Tenant permission with ID ${id} not found`);
    }
    return tenantPermission;
  }

  // Create a new tenant permission
  async createTenantPermission(
    createTenantPermissionDto: CreateTenantPermissionDto,
    userId: number,
    tenantId: number,
  ): Promise<TenantPermission> {
    return this.handleOperation(
      async () => {
        try {
          const tenantPermission = await this.prisma.tenantPermission.create({
            data: { ...createTenantPermissionDto, tenantId },
            include: this.tenantPermissionWithRelations,
          });
          await this.auditAction(AuditAction.CREATE_TENANT_PERMISSION, userId, tenantId, null, tenantPermission);
          await this.cacheService.clear(this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'permissions'));
          await this.updateCache(tenantId, tenantPermission);
          return plainToInstance(TenantPermission, tenantPermission);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new BadRequestException('Unique constraint violation');
          }
          throw error;
        }
      },
      `Tenant permission created with ID: ${tenantId}`,
      `Failed to create tenant permission for userId: ${userId}, tenantId: ${tenantId}`,
    );
  }

  // Get all permissions for a specific tenant with caching logic
  async getPermissionsForTenant(tenantId: number, userId: number): Promise<TenantPermission[]> {
    // Generate a cache key for tenant permissions
    const cacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'permissions');

    // Attempt to retrieve permissions from the cache
    let permissions = await this.cacheService.get<TenantPermission[]>(cacheKey);
    if (permissions) {
      return permissions;
    }

    // If not in cache, fetch from the database
    permissions = await this.prisma.tenantPermission.findMany({
      where: { tenantId },
      include: this.tenantPermissionWithRelations,
    });

    if (permissions.length === 0) throw new NotFoundException(`No permissions found for tenant with ID ${tenantId}`);

    // Log the access action
    await this.auditAction(AuditAction.ACCESS_TENANT_PERMISSION, userId, tenantId, null, permissions);

    // Store the permissions in the cache
    await this.cacheService.set(cacheKey, permissions);

    return permissions.map(permission => plainToInstance(TenantPermission, permission));
  }

  // Update an existing tenant permission
  async updateTenantPermission(id: number, updateTenantPermissionDto: UpdateTenantPermissionDto, userId: number, tenantId: number): Promise<TenantPermission> {
    return this.handleOperation(
      async () => {
        const tenantPermission = await this.findPermissionOrFail(id);
        const updatedPermission = await this.prisma.tenantPermission.update({
          where: { id },
          data: updateTenantPermissionDto,
          include: this.tenantPermissionWithRelations,
        });
        await this.auditAction(AuditAction.UPDATE_TENANT_PERMISSION, userId, tenantId, tenantPermission, updatedPermission);
        await this.updateCache(tenantId, updatedPermission, true);
        return plainToInstance(TenantPermission, updatedPermission);
      },
      `Updated tenant permission with ID: ${id}`,
      `Failed to update tenant permission with ID ${id}`
    );
  }

  // Soft delete a tenant permission by ID
  async deleteTenantPermission(id: number, userId: number, tenantId: number): Promise<void> {
    await this.handleOperation(
      async () => {
        const tenantPermission = await this.findPermissionOrFail(id);
        await this.prisma.tenantPermission.update({
          where: { id },
          data: { deletedAt: new Date() },
          include: this.tenantPermissionWithRelations,
        });
        await this.auditAction(AuditAction.DELETE_TENANT_PERMISSION, userId, tenantId, tenantPermission, null);
        await this.updateCache(tenantId, tenantPermission, true);
      },
      `Soft deleted tenant permission with ID: ${id}`,
      `Failed to delete tenant permission with ID ${id}`
    );
  }

  // Restore a soft-deleted permission
  async restorePermission(id: number, userId: number, tenantId: number): Promise<TenantPermission> {
    return this.handleOperation(
      async () => {
        const tenantPermission = await this.findPermissionOrFail(id);
        if (!tenantPermission.deletedAt) throw new NotFoundException(`Permission with ID ${id} is not in recycle bin or not found.`);
        const restoredPermission = await this.prisma.tenantPermission.update({
          where: { id },
          data: { deletedAt: null },
          include: this.tenantPermissionWithRelations,
        });
        await this.auditAction(AuditAction.RESTORE_TENANT_PERMISSION, userId, tenantId, tenantPermission, restoredPermission);
        await this.updateCache(tenantId, restoredPermission);
        return plainToInstance(TenantPermission, restoredPermission);
      },
      `Restored tenant permission with ID: ${id}`,
      `Failed to restore tenant permission with ID ${id}`
    );
  }

  /**
     * Retrieves all soft-deleted permissions for a tenant.
     * This is essentially the "recycle bin" for permissions.
     * 
     * @param tenantId The ID of the tenant whose soft-deleted permissions are to be retrieved.
     * @returns A list of soft-deleted permissions for the tenant.
     */
  async getDeletedPermissionsForTenant(tenantId: number) {
    const deletedPermissions = await this.prisma.tenantPermission.findMany({
      where: {
        tenantId,
        deletedAt: { not: null },
      },
    });
    return deletedPermissions;
  }

  /**
   * Permanently clears the recycle bin for a tenant by deleting all soft-deleted permissions.
   * 
   * @param tenantId The ID of the tenant whose recycle bin is to be cleared.
   * @returns The count of permanently deleted permissions.
   */
  async clearRecycleBinForTenant(tenantId: number): Promise<number> {
    const deleteResult = await this.prisma.tenantPermission.deleteMany({
      where: {
        tenantId,
        deletedAt: { not: null },
      },
    });

    // Log the recycle bin clearing action with modified fields for details
    await this.auditService.logAction({
      action: AuditAction.CLEAR_RECYCLE_BIN_TENANT_PERMISSION,
      tenantId,
      userId: null,
      modifiedFields: [`Permanently deleted ${deleteResult.count} permissions from recycle bin`],
    });

    return deleteResult.count;
  }

}
