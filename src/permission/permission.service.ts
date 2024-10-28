import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@prisma-service/prisma.service'; // Adjust this path as needed
import { CasbinService } from '@casbin-integration/casbin.service'; // Adjust this path as needed
import { Permission } from '@prisma/client'; // Adjust import to match your Prisma setup
import { CreatePermissionDto } from '@permission-dto/create-permission.dto'; // Adjust path
import { UpdatePermissionDto } from '@permission-dto/update-permission.dto'; // Adjust path

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly casbinService: CasbinService,
  ) {}

  // Create a new permission
  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    try {
      const permission = await this.prisma.permission.create({
        data: createPermissionDto,
      });

      // Add permission to Casbin policies
      await this.casbinService.addPolicy(
        'p',
        permission.name,
        createPermissionDto.resource,
        createPermissionDto.action,
      );

      this.logger.log(`Permission created and added to Casbin: ${permission.name}`);
      return permission;
    } catch (error) {
      this.logger.error('Error creating permission', error);
      if (error.code === 'P2002') {
        throw new BadRequestException('Permission name already exists');
      }
      throw new BadRequestException('Failed to create permission');
    }
  }

  // Find all permissions
  async findAll(): Promise<Permission[]> {
    try {
      return await this.prisma.permission.findMany();
    } catch (error) {
      this.logger.error('Error retrieving permissions', error);
      throw new BadRequestException('Failed to retrieve permissions');
    }
  }

  // Find a permission by ID
  async findOne(id: number): Promise<Permission> {
    try {
      const permission = await this.prisma.permission.findUnique({
        where: { id },
      });
      if (!permission) {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }
      return permission;
    } catch (error) {
      this.logger.error(`Error finding permission with ID ${id}`, error);
      throw new BadRequestException('Failed to find permission');
    }
  }

  // Update a permission
  async update(id: number, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    try {
      const permission = await this.prisma.permission.update({
        where: { id },
        data: updatePermissionDto,
      });

      this.logger.log(`Permission updated: ${permission.name}`);
      return permission;
    } catch (error) {
      this.logger.error(`Error updating permission with ID ${id}`, error);
      if (error.code === 'P2025') {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }
      throw new BadRequestException('Failed to update permission');
    }
  }

  // Delete a permission
  async remove(id: number): Promise<Permission> {
    try {
      const permission = await this.prisma.permission.delete({
        where: { id },
      });

      this.logger.log(`Permission deleted: ${permission.name}`);
      return permission;
    } catch (error) {
      this.logger.error(`Error deleting permission with ID ${id}`, error);
      if (error.code === 'P2025') {
        throw new NotFoundException(`Permission with ID ${id} not found`);
      }
      throw new BadRequestException('Failed to delete permission');
    }
  }
}

export default PermissionService;
