import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { CreateTenantRoleDto } from './dto/create-tenant-role.dto';
import { UpdateTenantRoleDto } from './dto/update-tenant-role.dto';
import { TenantRole } from './models/tenant-role.model';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class TenantRoleService {
  private readonly logger = new Logger(TenantRoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Create a new tenant role
  async createTenantRole(createTenantRoleDto: CreateTenantRoleDto): Promise<TenantRole> {
    try {
      const tenantRole = await this.prisma.tenantRole.create({
        data: createTenantRoleDto,
      });
      this.logger.log(`Tenant role created with ID: ${tenantRole.id}`);
      return plainToInstance(TenantRole, tenantRole);
    } catch (error) {
      this.logger.error(`Failed to create tenant role: ${error.message}`);
      throw new BadRequestException('Failed to create tenant role');
    }
  }

  // Find roles for a specific tenant
  async findRolesForTenant(tenantId: number): Promise<TenantRole[]> {
    try {
      const tenantRoles = await this.prisma.tenantRole.findMany({
        where: { tenantId },
      });
      if (tenantRoles.length === 0) {
        throw new NotFoundException(`No roles found for tenant with ID ${tenantId}`);
      }
      return tenantRoles.map((tenantRole) => plainToInstance(TenantRole, tenantRole));
    } catch (error) {
      this.logger.error(`Failed to find roles for tenant ${tenantId}: ${error.message}`);
      throw error;
    }
  }

  // Update an existing tenant role
  async updateTenantRole(id: number, updateTenantRoleDto: UpdateTenantRoleDto): Promise<TenantRole> {
    try {
      const tenantRole = await this.prisma.tenantRole.findUnique({ where: { id } });
      if (!tenantRole) {
        throw new NotFoundException(`Tenant role with ID ${id} not found`);
      }
      const updatedTenantRole = await this.prisma.tenantRole.update({
        where: { id },
        data: updateTenantRoleDto,
      });
      this.logger.log(`Tenant role updated with ID: ${id}`);
      return plainToInstance(TenantRole, updatedTenantRole);
    } catch (error) {
      this.logger.error(`Failed to update tenant role with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  // Delete a tenant role by ID
  async deleteTenantRole(id: number): Promise<void> {
    try {
      const tenantRole = await this.prisma.tenantRole.findUnique({ where: { id } });
      if (!tenantRole) {
        throw new NotFoundException(`Tenant role with ID ${id} not found`);
      }
      await this.prisma.tenantRole.delete({ where: { id } });
      this.logger.log(`Tenant role deleted with ID: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete tenant role with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  // Assign default roles to a tenant
  async assignDefaultRoles(tenantId: number): Promise<void> {
    try {
      const defaultRoles = [
        { name: 'OWNER', description: 'Owner of the tenant', tenantId },
        { name: 'ADMIN', description: 'Admin role with management access', tenantId },
        { name: 'MEMBER', description: 'Standard user with limited access', tenantId },
      ];
      for (const role of defaultRoles) {
        await this.prisma.tenantRole.create({
          data: role,
        });
      }
      this.logger.log(`Default roles assigned for tenant with ID: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to assign default roles for tenant with ID ${tenantId}: ${error.message}`);
      throw new BadRequestException('Failed to assign default roles');
    }
  }

  // Delete all roles for a tenant
  async deleteRolesForTenant(tenantId: number): Promise<void> {
    try {
      await this.prisma.tenantRole.deleteMany({
        where: { tenantId },
      });
      this.logger.log(`All roles deleted for tenant with ID: ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to delete roles for tenant with ID ${tenantId}: ${error.message}`);
      throw new BadRequestException('Failed to delete roles for tenant');
    }
  }
  // Method to inherit roles from tenant role
  public async inheritRolesFromTenantRole(tenantId: number, roleId: number): Promise<void> {
    this.logger.log(`Starting role inheritance for tenant role ${roleId} of tenant ${tenantId}`);
  
    // Fetch tenant role and inherited role IDs
    const tenantRole = await this.prisma.tenantRole.findUnique({ where: { id: roleId, tenantId } });
    if (!tenantRole) {
      throw new NotFoundException(`Tenant role with ID ${roleId} not found for tenant with ID ${tenantId}`);
    }
  
    if (!tenantRole.inheritedRoleIds || tenantRole.inheritedRoleIds.length === 0) {
      this.logger.warn(`No inherited roles found for tenant role ${roleId}`);
      return;
    }
  
    // Fetch roles to inherit from
    const rolesToInherit = await this.prisma.role.findMany({
      where: { id: { in: tenantRole.inheritedRoleIds } },
    });
  
    if (rolesToInherit.length === 0) {
      throw new NotFoundException(`No valid roles found to inherit for tenant role ${roleId}`);
    }
  
    // Collect permissions to apply from inherited roles
    const permissionsToInherit = await this.prisma.permission.findMany({
      where: {
        roleId: { in: rolesToInherit.map((role) => role.id) },
      },
    });
  
    // Use bulk upsert to apply all inherited permissions to the tenant role
    await this.prisma.$transaction(async (prisma) => {
      await prisma.permission.createMany({
        data: permissionsToInherit.map((permission) => ({
          roleId: roleId,
          permissionId: permission.id,
        })),
        skipDuplicates: true, // Prevent duplicate permission assignments
      });
    });
  
    this.logger.log(`Successfully inherited roles for tenant role ${roleId} from roles: ${tenantRole.inheritedRoleIds.join(', ')}`);
  
    // Invalidate cache for permissions if necessary
    await this.invalidatePermissionCache(tenantId, roleId);
  }
  

  // Helper method for invalidating permission cache
  private async invalidatePermissionCache(tenantId: number, roleId: number): Promise<void> {
    const permissionCacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), `role-${roleId}-permissions`);

    await retry(async () => {
      await this.cacheService.clear(permissionCacheKey);
      this.logger.log(`Cache invalidated for permissions of tenant role ${roleId} of tenant ${tenantId}`);
    }, {
      retries: 3,
      onRetry: (err, attempt) => this.logger.warn(`Retry attempt ${attempt} for cache invalidation: ${err.message}`),
    });
  }

  // Assign default permissions to a tenant role
async assignDefaultPermissionsToRole(roleId: number, tenantId: number): Promise<void> {
    try {
      // Define default permissions for different roles
      let defaultPermissions: string[] = [];
      const role = await this.prisma.tenantRole.findUnique({ where: { id: roleId } });
  
      if (role) {
        switch (role.name) {
          case 'OWNER':
            defaultPermissions = ['MANAGE_TENANT', 'VIEW_ALL', 'MANAGE_USERS'];
            break;
          case 'ADMIN':
            defaultPermissions = ['VIEW_ALL', 'MANAGE_USERS'];
            break;
          case 'MEMBER':
            defaultPermissions = ['VIEW_SELF'];
            break;
          default:
            defaultPermissions = ['VIEW_SELF'];
        }
  
        // Create tenant permissions for role
        await this.prisma.tenantPermission.createMany({
          data: defaultPermissions.map(permissionName => ({
            name: permissionName,
            tenantId,
            roles: { connect: { id: roleId } },
          })),
          skipDuplicates: true,
        });
  
        this.logger.log(`Assigned default permissions to role ID: ${roleId}`);
      } else {
        throw new NotFoundException(`Role with ID ${roleId} not found for tenant ${tenantId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to assign permissions to role ID ${roleId}: ${error.message}`);
      throw error;
    }
  }
}
