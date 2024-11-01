import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { TenantPermissionService } from './tenant-permission.service';
import { CreateTenantPermissionInput } from './input/create-tenant-permission.input';
import { UpdateTenantPermissionInput } from './input/update-tenant-permission.input';
import { TenantPermission } from './models/tenant-permission.model';
import { Int } from 'type-graphql';
import { UseGuards, ForbiddenException, Logger, UseInterceptors } from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles/roles.decorator';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';
import { Authorize } from '../../common/decorators/authorize/authorize.decorator';
import { CasbinInterceptor } from '../../common/interceptors/casbin/casbin.interceptor';

@Resolver(() => TenantPermission)
@UseGuards(TenantGuard, RolesGuard)
export class TenantPermissionResolver {
  findAllPermissions(tenantId: number): any {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(TenantPermissionResolver.name);

  constructor(
    private readonly tenantPermissionService: TenantPermissionService,
    private readonly casbinHelperService: CasbinHelperService,
  ) {}

  // Utility method to check permissions via CasbinHelperService
  private async checkPermission(userId: number, tenantId: number, obj: string, act: string) {
    try {
      await this.casbinHelperService.enforceAuthorization(userId, obj, act, tenantId);
      this.logger.log(`Permission granted for user ${userId} to ${act} ${obj} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Access denied for user ${userId} to ${act} ${obj} for tenant ${tenantId}: ${error.message}`);
      throw new ForbiddenException(`Access denied: ${error.message}`);
    }
  }

  @Mutation(() => TenantPermission)
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'create')
  async createTenantPermission(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('createTenantPermissionInput') createTenantPermissionInput: CreateTenantPermissionInput,
  ): Promise<TenantPermission> {
    return this.tenantPermissionService.createTenantPermission(createTenantPermissionInput, userId, tenantId);
  }

  @Query(() => [TenantPermission])
  @Roles('ADMIN', 'MEMBER', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'view')
  async getPermissionsForTenant(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<TenantPermission[]> {
    return this.tenantPermissionService.getPermissionsForTenant(tenantId, userId);
  }

  @Mutation(() => TenantPermission)
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'update')
  async updateTenantPermission(
    @Args('id', { type: () => Int }) id: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('updateTenantPermissionInput') updateTenantPermissionInput: UpdateTenantPermissionInput,
  ): Promise<TenantPermission> {
    return this.tenantPermissionService.updateTenantPermission(id, updateTenantPermissionInput, userId, tenantId);
  }

  @Mutation(() => Boolean)
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'delete')
  async deleteTenantPermission(
    @Args('id', { type: () => Int }) id: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
  ): Promise<boolean> {
    await this.tenantPermissionService.deleteTenantPermission(id, userId, tenantId);
    return true;
  }

  @Query(() => [TenantPermission])
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'view')
  async getDeletedPermissions(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<TenantPermission[]> {
    const deletedPermissions = await this.tenantPermissionService.getDeletedPermissionsForTenant(tenantId);
    return deletedPermissions.map(permission => ({
      ...permission,
      tenant: {
        id: tenantId,
        users: [], // Add appropriate default or fetched values
        tenantFeatures: [], // Add appropriate default or fetched values
        userRoles: [] // Add appropriate default or fetched values
      }
    }));
  }

  @Mutation(() => TenantPermission)
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'restore')
  async restorePermission(
    @Args('id', { type: () => Int }) id: number,
    @Args('userId', { type: () => Int }) userId: number,
    @Args('tenantId', { type: () => Int }) tenantId: number,
  ): Promise<TenantPermission> {
    return this.tenantPermissionService.restorePermission(id, userId, tenantId);
  }

  @Mutation(() => Boolean)
  @Roles('ADMIN', 'OWNER')
  @UseInterceptors(CasbinInterceptor)
  @Authorize('tenant-permission', 'delete')
  async clearRecycleBin(
    @Args('tenantId', { type: () => Int }) tenantId: number,
    @Args('userId', { type: () => Int }) userId: number,
  ): Promise<boolean> {
    this.tenantPermissionService.clearRecycleBin(tenantId);
    return true;
  }
}
