// src/tenant/tenant-role/tenant-role.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException } from '@nestjs/common';
import { TenantRoleService } from './tenant-role.service';
import { CreateTenantRoleDto } from './dto/create-tenant-role.dto';
import { UpdateTenantRoleDto } from './dto/update-tenant-role.dto';

@Controller('tenant-role')
export class TenantRoleController {
  constructor(private readonly tenantRoleService: TenantRoleService) {}

  @Post()
  async create(@Body() createTenantRoleDto: CreateTenantRoleDto) {
    return await this.tenantRoleService.createTenantRole(createTenantRoleDto);
  }

  @Get(':tenantId')
  async findByTenantId(@Param('tenantId') tenantId: number) {
    const roles = await this.tenantRoleService.findRolesForTenant(tenantId);
    if (!roles || roles.length === 0) {
      throw new NotFoundException(`No roles found for tenant with ID ${tenantId}`);
    }
    return roles;
  }

  @Patch(':id')
  async update(@Param('id') id: number, @Body() updateTenantRoleDto: UpdateTenantRoleDto) {
    return await this.tenantRoleService.updateTenantRole(id, updateTenantRoleDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return await this.tenantRoleService.deleteTenantRole(id);
  }
}
