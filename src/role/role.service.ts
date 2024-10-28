import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { CasbinService } from '@casbin-integration/casbin.service';
import { CacheService } from '../cache/cache.service'; // Inject CacheService
import { CreateRoleDto } from '@role-dto/create-role.dto';
import { UpdateRoleDto } from '@role-dto/update-role.dto';
import { Role } from '@prisma/client';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
    private readonly cacheService: CacheService, // Injecting CacheService
  ) {}

  // Create a new role and invalidate cache for relevant tenants
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: createRoleDto,
        });

        // Add role to Casbin
        await this.casbinService.addRole(role.name);
        this.logger.log(`Role created and added to Casbin: ${role.name}`);

        // Invalidate cache (clear cache for all tenants that might use this role)
        await this.invalidateCacheForRole(role.name);

        return role;
      });
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  // Find all roles
  async findAll(): Promise<Role[]> {
    try {
      const roles = await this.prisma.role.findMany();
      this.logger.log(`Roles retrieved: ${roles.length} roles found`);
      return roles;
    } catch (error) {
      this.handleDatabaseError(error, 'retrieve');
    }
  }

  // Find a specific role by ID
  async findOne(id: number): Promise<Role> {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
      });
      if (!role) {
        const notFoundMessage = `Role with ID ${id} not found`;
        this.logger.warn(notFoundMessage);
        throw new NotFoundException(notFoundMessage);
      }
      this.logger.log(`Role retrieved: ${role.name}`);
      return role;
    } catch (error) {
      this.handleDatabaseError(error, 'find', id);
    }
  }

  // Update a role and invalidate cache for relevant tenants
  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({
          where: { id },
        });
        if (!role) {
          const notFoundMessage = `Role with ID ${id} not found for update`;
          this.logger.warn(notFoundMessage);
          throw new NotFoundException(notFoundMessage);
        }

        const updatedRole = await tx.role.update({
          where: { id },
          data: updateRoleDto,
        });

        if (role.name !== updatedRole.name) {
          // Update role in Casbin if the name has changed
          await this.casbinService.updateRole(role.name, updatedRole.name);
          this.logger.log(`Role updated and Casbin policies updated: ${updatedRole.name}`);

          // Invalidate cache for all tenants using this role
          await this.invalidateCacheForRole(updatedRole.name);
        } else {
          this.logger.log(`Role updated without changes to Casbin: ${updatedRole.name}`);
        }

        return updatedRole;
      });
    } catch (error) {
      this.handleDatabaseError(error, 'update', id);
    }
  }

  // Delete a role and invalidate cache for relevant tenants
  async remove(id: number): Promise<Role> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.findUnique({
          where: { id },
        });
        if (!role) {
          const notFoundMessage = `Role with ID ${id} not found for deletion`;
          this.logger.warn(notFoundMessage);
          throw new NotFoundException(notFoundMessage);
        }

        const deletedRole = await tx.role.delete({
          where: { id },
        });

        // Remove role from Casbin
        await this.casbinService.removeRole(role.name);
        this.logger.log(`Role deleted and removed from Casbin: ${deletedRole.name}`);

        // Invalidate cache for all tenants using this role
        await this.invalidateCacheForRole(role.name);

        return deletedRole;
      });
    } catch (error) {
      this.handleDatabaseError(error, 'delete', id);
    }
  }

  // Invalidate cache for tenants using this role
  private async invalidateCacheForRole(roleName: string): Promise<void> {
    try {
      // Get all tenant IDs that use this role
      const tenantIds = await this.prisma.userRole.findMany({
        where: { role: { name: roleName } },
        select: { tenantId: true },
      });

      const tenantCacheKeys = tenantIds.map((tenant) =>
        this.cacheService.generateCacheKey('tenant', tenant.tenantId.toString(), 'feature-access'),
      );

      // Invalidate the cache for all tenants that use this role
      await this.cacheService.clearMany(tenantCacheKeys);
      this.logger.log(`Cache invalidated for tenants using role: ${roleName}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for role ${roleName}: ${error.message}`);
    }
  }

  // Centralized error handling
  private handleDatabaseError(error: any, action: string, id?: number) {
    const actionMessage = id ? `${action} for ID ${id}` : action;
    const logMessage = `Error during role ${actionMessage}`;

    this.logger.error(logMessage, error.stack);

    if (error.code === 'P2002') {
      this.logger.warn(`Unique constraint violation during role ${actionMessage}`);
      throw new BadRequestException('Role name must be unique');
    }

    let errorMessage = `Failed to ${action} role`;
    if (id) {
      errorMessage += ` with ID ${id}`;
    }
    throw new BadRequestException(errorMessage);
  }
}
