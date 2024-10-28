// src/tenant/tenant-role/tenant-role.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { TenantRoleService } from './tenant-role.service';
import { CreateTenantRoleDto } from './dto/create-tenant-role.dto';
import { UpdateTenantRoleDto } from './dto/update-tenant-role.dto';
import { TenantRole } from './models/tenant-role.model';

@Resolver(() => TenantRole)
export class TenantRoleResolver {
  constructor(private readonly tenantRoleService: TenantRoleService) {}

  @Mutation(() => TenantRole)
  async createTenantRole(@Args('createTenantRoleDto') createTenantRoleDto: CreateTenantRoleDto): Promise<TenantRole> {
    return await this.tenantRoleService.createTenantRole(createTenantRoleDto);
  }

  @Query(() => [TenantRole])
  async tenantRoles(@Args('tenantId') tenantId: number): Promise<TenantRole[]> {
    return await this.tenantRoleService.findRolesForTenant(tenantId);
  }

  @Mutation(() => TenantRole)
  async updateTenantRole(
    @Args('id') id: number,
    @Args('updateTenantRoleDto') updateTenantRoleDto: UpdateTenantRoleDto,
  ): Promise<TenantRole> {
    return await this.tenantRoleService.updateTenantRole(id, updateTenantRoleDto);
  }

  @Mutation(() => Boolean)
  async deleteTenantRole(@Args('id') id: number): Promise<boolean> {
    await this.tenantRoleService.deleteTenantRole(id);
    return true;
  }
}
