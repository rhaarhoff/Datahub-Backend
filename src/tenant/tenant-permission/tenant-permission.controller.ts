import { Controller, UseGuards, Post, Get, Put, Delete, Param, Body, ForbiddenException, Query,  } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantPermissionService } from './tenant-permission.service';
import { CreateTenantPermissionDto } from './dto/create-tenant-permission.dto';
import { UpdateTenantPermissionDto } from './dto/update-tenant-permission.dto';
import { TenantPermission } from './models/tenant-permission.model';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles/roles.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CasbinHelperService } from '../../casbin-integration/casbin-helper.service';

@ApiTags('Tenant Permissions')
@ApiBearerAuth()
@Controller('tenant-permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantPermissionController {
  constructor(
    private readonly tenantPermissionService: TenantPermissionService,
    private readonly casbinHelperService: CasbinHelperService,
  ) {}

  private async enforceAuthorization(userId: number, action: string, tenantId: number) {
    try {
      await this.casbinHelperService.enforceAuthorization(userId, 'tenant-permission', action, tenantId);
    } catch (error) {
      throw new ForbiddenException(`Access denied: ${error.message}`);
    }
  }

  @Post()
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Create a tenant permission' })
  @ApiResponse({ status: 201, description: 'Tenant permission successfully created.', type: TenantPermission })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createTenantPermission(
    @Body() createTenantPermissionDto: CreateTenantPermissionDto,
    @Body('tenantId') tenantId: number,
    @Body('userId') userId: number,
  ): Promise<TenantPermission> {
    await this.enforceAuthorization(userId, 'create', tenantId);
    return this.tenantPermissionService.createTenantPermission(createTenantPermissionDto, userId, tenantId);
  }

  @Get(':tenantId')
  @Roles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'Get permissions for a tenant' })
  @ApiResponse({ status: 200, description: 'List of tenant permissions.', type: [TenantPermission] })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getPermissionsForTenant(
    @Param('tenantId') tenantId: number,
    @Query('userId') userId: number,
  ): Promise<TenantPermission[]> {
    await this.enforceAuthorization(userId, 'view', tenantId);
    return this.tenantPermissionService.getPermissionsForTenant(tenantId, userId);
  }

  @Put(':id')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update a tenant permission' })
  @ApiResponse({ status: 200, description: 'Tenant permission successfully updated.', type: TenantPermission })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async updateTenantPermission(
    @Param('id') id: number,
    @Body('tenantId') tenantId: number,
    @Body('userId') userId: number,
    @Body() updateTenantPermissionDto: UpdateTenantPermissionDto,
  ): Promise<TenantPermission> {
    await this.enforceAuthorization(userId, 'update', tenantId);
    return this.tenantPermissionService.updateTenantPermission(id, updateTenantPermissionDto, userId, tenantId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Delete a tenant permission (soft delete)' })
  @ApiResponse({ status: 200, description: 'Tenant permission successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async deleteTenantPermission(
    @Param('id') id: number,
    @Body('userId') userId: number,
    @Body('tenantId') tenantId: number,
  ): Promise<boolean> {
    await this.enforceAuthorization(userId, 'delete', tenantId);
    await this.tenantPermissionService.deleteTenantPermission(id, userId, tenantId);
    return true;
  }

  @Get(':tenantId/deleted')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get deleted permissions for a tenant' })
  @ApiResponse({ status: 200, description: 'List of deleted tenant permissions.', type: [TenantPermission] })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getDeletedPermissionsForTenant(
    @Param('tenantId') tenantId: number,
    @Body('userId') userId: number,
  ): Promise<TenantPermission[]> {
    await this.enforceAuthorization(userId, 'view', tenantId);
    const deletedPermissions = await this.tenantPermissionService.getDeletedPermissionsForTenant(tenantId);
    return deletedPermissions.map(permission => ({
      ...permission,
      tenant: {
        id: tenantId,
        users: [], // Add appropriate default values or fetch actual data
        tenantFeatures: [],
        userRoles: []
      }
    }));
  }

  @Post('restore/:id')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Restore a deleted tenant permission' })
  @ApiResponse({ status: 200, description: 'Tenant permission successfully restored.', type: TenantPermission })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async restorePermission(
    @Param('id') id: number,
    @Body('userId') userId: number,
    @Body('tenantId') tenantId: number,
  ): Promise<TenantPermission> {
    await this.enforceAuthorization(userId, 'update', tenantId);
    return this.tenantPermissionService.restorePermission(id, userId, tenantId);
  }

  @Delete(':tenantId/recycle-bin')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Clear recycle bin for a tenant' })
  @ApiResponse({ status: 200, description: 'Recycle bin successfully cleared.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async clearRecycleBin(
    @Param('tenantId') tenantId: number,
    @Body('userId') userId: number,
  ): Promise<boolean> {
    await this.enforceAuthorization(userId, 'delete', tenantId);
    this.tenantPermissionService.clearRecycleBin(tenantId);
    return true;
  }
}
