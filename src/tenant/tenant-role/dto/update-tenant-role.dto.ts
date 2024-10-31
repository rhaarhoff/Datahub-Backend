// src/tenant/tenant-role/dto/update-tenant-role.dto.ts
import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

export class UpdateTenantRoleDto {
  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })  // Ensure all elements in the array are integers
  inheritedRoleIds?: number[];
}
