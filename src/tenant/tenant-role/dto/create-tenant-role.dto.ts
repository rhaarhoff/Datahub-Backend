// src/tenant/tenant-role/dto/create-tenant-role.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateTenantRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })  // Ensure all elements in the array are integers
  inheritedRoleIds?: number[];  // Inherited roles, if any, should be an array of integers
}
