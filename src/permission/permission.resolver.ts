// src/permission/permission.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { PermissionService } from './permission.service';
import { Permission } from '@permission-model/permission.model';
import { CreatePermissionDto } from '@permission-dto/create-permission.dto';
import { UpdatePermissionDto } from '@permission-dto/update-permission.dto';

@Resolver(() => Permission)
export class PermissionResolver {
  constructor(private readonly permissionService: PermissionService) {}

  // Query to get all permissions
  @Query(() => [Permission], { name: 'permissionsV1' })
  async permissions() {
    return this.permissionService.findAll();
  }

  // Query to get a permission by ID
  @Query(() => Permission, { name: 'permissionV1' })
  async permission(@Args('id', { type: () => Int }) id: number) {
    return this.permissionService.findOne(id);
  }

  // Mutation to create a new permission
  @Mutation(() => Permission, { name: 'createPermissionV1' })
  async createPermission(
    @Args('createPermissionDto') createPermissionDto: CreatePermissionDto,
  ) {
    return this.permissionService.create(createPermissionDto);
  }

  // Mutation to update a permission by ID
  @Mutation(() => Permission, { name: 'updatePermissionV1' })
  async updatePermission(
    @Args('id', { type: () => Int }) id: number,
    @Args('updatePermissionDto') updatePermissionDto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(id, updatePermissionDto);
  }

  // Mutation to delete a permission by ID
  @Mutation(() => Permission, { name: 'removePermissionV1' })
  async removePermission(@Args('id', { type: () => Int }) id: number) {
    return this.permissionService.remove(id);
  }
}
