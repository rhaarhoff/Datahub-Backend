// src/tenant/tenant-role/dto/update-tenant-role.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateTenantRoleDto {
  @IsOptional()
  @IsString()
  roleName?: string;

  @IsOptional()
  @IsString({ each: true })
  inheritedRoleIds?: string[];
}