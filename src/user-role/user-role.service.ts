import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './models/user-role.model';
import { plainToInstance } from 'class-transformer';
import { FeatureAccessService } from '../feature-access/feature-access.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AccessLevel } from '@prisma/client';
import retry from 'async-retry';

@Injectable()
export class UserRoleService {
  private readonly logger = new Logger(UserRoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureAccessService: FeatureAccessService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  // Update roles for a tenant due to subscription change
  public async updateRolesForSubscriptionChange(tenantId: number): Promise<void> {
    this.logger.log(`Updating roles for tenant ${tenantId} due to subscription change`);
  
    const roles = await this.prisma.userRole.findMany({
      where: { tenantId },
      include: { role: true },
    });
  
    for (const role of roles) {
      const accessLevel = this.determineAccessLevel(role.role.name);
      await this.featureAccessService.createOrUpdateFeatureAccess(role.id, role.roleId, tenantId, accessLevel);
    }
  
    this.logger.log(`Successfully updated roles for tenant ${tenantId} due to subscription change`);
  }

  // Create a new user role
  async createUserRole(createUserRoleDto: CreateUserRoleDto): Promise<UserRole> {
    const { userId, tenantId, roleId, isPrimaryRole, startDate, endDate } = createUserRoleDto;

    return await this.prisma.$transaction(async (prisma) => {
      // Validate if the user, tenant, and role exist
      await this.validateUserTenantRole(userId, tenantId, roleId);

      // If assigning a primary role, ensure no other primary role exists for this user
      if (isPrimaryRole) {
        await prisma.userRole.updateMany({
          where: { userId, isPrimaryRole: true },
          data: { isPrimaryRole: false },
        });
      }

      // Create user role
      const userRole = await prisma.userRole.create({
        data: {
          userId,
          tenantId,
          roleId,
          isPrimaryRole,
          startDate,
          endDate,
        },
        include: {
          user: true,
          tenant: true,
          role: true,
        },
      });

      // Assign feature access dynamically based on role
      if (tenantId) {
        const accessLevel = this.determineAccessLevel(userRole.role.name);
        await this.featureAccessService.createOrUpdateFeatureAccess(userRole.id, roleId, tenantId, accessLevel);
      }

      // Invalidate cache
      await this.invalidateUserRoleCache(userId, tenantId);

      // Log audit action
      await this.logUserRoleAction(AuditAction.CREATE_USER_ROLE, userId, tenantId, null, userRole);

      return plainToInstance(UserRole, userRole);
    });
  }

  // Update an existing user role
  async updateUserRole(id: number, updateUserRoleDto: UpdateUserRoleDto): Promise<UserRole> {
    return await this.prisma.$transaction(async (prisma) => {
      const userRole = await prisma.userRole.findUnique({
        where: { id },
        include: { user: true, tenant: true, role: true },
      });
      if (!userRole) {
        throw new NotFoundException(`User role with ID ${id} not found`);
      }

      // Validate if the role exists (if roleId is being updated)
      if (updateUserRoleDto.roleId) {
        const role = await prisma.role.findUnique({ where: { id: updateUserRoleDto.roleId } });
        if (!role) {
          throw new BadRequestException(`Role with ID ${updateUserRoleDto.roleId} not found`);
        }
      }

      // Ensure only one primary role for a user
      if (updateUserRoleDto.isPrimaryRole) {
        await prisma.userRole.updateMany({
          where: { userId: userRole.userId, isPrimaryRole: true },
          data: { isPrimaryRole: false },
        });
      }

      // Update user role
      const updatedUserRole = await prisma.userRole.update({
        where: { id },
        data: updateUserRoleDto,
        include: {
          user: true,
          tenant: true,
          role: true,
        },
      });

      // Update feature access if tenantId or roleId changes
      if (
        (updateUserRoleDto.tenantId && updateUserRoleDto.tenantId !== userRole.tenantId) ||
        (updateUserRoleDto.roleId && updateUserRoleDto.roleId !== userRole.roleId)
      ) {
        const tenantId = updateUserRoleDto.tenantId || userRole.tenantId;
        await this.featureAccessService.updateFeatureAccessForRoles(tenantId);
      }

      // Invalidate cache
      await this.invalidateUserRoleCache(userRole.userId, userRole.tenantId);

      // Log audit action
      await this.logUserRoleAction(AuditAction.UPDATE_USER_ROLE, userRole.userId, userRole.tenantId, userRole, updatedUserRole);

      return plainToInstance(UserRole, updatedUserRole);
    });
  }

  // Delete a user role by ID (Soft delete)
  async deleteUserRole(id: number): Promise<UserRole> {
    return await this.prisma.$transaction(async (prisma) => {
      const userRole = await prisma.userRole.findUnique({
        where: { id },
        include: { user: true, tenant: true, role: true },
      });
      if (!userRole) {
        throw new NotFoundException(`User role with ID ${id} not found`);
      }

      // Soft delete user role
      const deletedUserRole = await prisma.userRole.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { user: true, tenant: true, role: true },
      });

      // Update feature access after deleting the role
      if (userRole.tenantId) {
        await this.featureAccessService.updateFeatureAccessForRoles(userRole.tenantId);
      }

      // Invalidate cache
      await this.invalidateUserRoleCache(userRole.userId, userRole.tenantId);

      // Log audit action
      await this.logUserRoleAction(AuditAction.DELETE_USER_ROLE, userRole.userId, userRole.tenantId, userRole, null);

      return plainToInstance(UserRole, deletedUserRole);
    });
  }

  // Permanently delete user roles from recycle bin
  async clearRecycleBin(): Promise<void> {
    const softDeletedRoles = await this.prisma.userRole.findMany({
      where: { deletedAt: { not: null } },
    });

    for (const role of softDeletedRoles) {
      try {
        // Delete associated feature access
        await this.prisma.featureAccess.deleteMany({
          where: {
            userRoleId: role.id,
          },
        });

        // Delete the user role
        await this.prisma.userRole.delete({
          where: { id: role.id },
        });
        this.logger.log(`Permanently deleted user role with ID ${role.id} from recycle bin.`);
      } catch (error) {
        this.logger.error(`Failed to permanently delete user role with ID ${role.id}: ${error.message}`);
      }
    }
  }

  // Helper to invalidate cache for user roles and related feature access
  private async invalidateUserRoleCache(userId: number, tenantId: number) {
    const userRoleCacheKey = this.cacheService.generateCacheKey('user', userId.toString(), 'roles');
    const tenantUserRoleCacheKey = this.cacheService.generateCacheKey('tenant', tenantId.toString(), 'user-roles');

    await retry(async () => {
      await Promise.all([
        this.cacheService.clear(userRoleCacheKey),
        this.cacheService.clear(tenantUserRoleCacheKey),
      ]);
      this.logger.log(`Cache invalidated for user roles of user ${userId} and tenant ${tenantId}`);
    }, {
      retries: 3,
      onRetry: (err, attempt) => this.logger.warn(`Retry attempt ${attempt} for cache invalidation: ${err.message}`),
    });
  }

  // Helper function to log actions for audit purposes
  private async logUserRoleAction(action: AuditAction, userId: number, tenantId: number, before: any, after: any) {
    try {
      await this.auditService.logAction({
        action,
        userId,
        tenantId,
        before,
        after,
      });
    } catch (error) {
      this.logger.error(`Failed to log user role action for user ${userId}: ${error.message}`);
    }
  }

  // Helper function to determine access level based on role name
  private determineAccessLevel(roleName: string): AccessLevel {
    const accessLevelMap: { [key: string]: AccessLevel } = {
      ADMIN: AccessLevel.MANAGE,
      MEMBER: AccessLevel.EDIT,
      GUEST: AccessLevel.VIEW,
    };
    return accessLevelMap[roleName] || AccessLevel.VIEW;
  }

  // Helper function to validate if user, tenant, and role exist
  private async validateUserTenantRole(userId: number, tenantId: number | null, roleId: number) {
    const [user, tenant, role] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      tenantId ? this.prisma.tenant.findUnique({ where: { id: tenantId } }) : Promise.resolve(null),
      this.prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new BadRequestException(`User with ID ${userId} not found`);
    if (tenantId && !tenant) throw new BadRequestException(`Tenant with ID ${tenantId} not found`);
    if (!role) throw new BadRequestException(`Role with ID ${roleId} not found`);
  }
}
