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
}
