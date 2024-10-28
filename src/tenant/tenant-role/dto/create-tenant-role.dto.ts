// src/tenant/tenant-role/dto/create-tenant-role.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTenantRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsOptional()
  @IsString({ each: true })
  inheritedRoleIds?: string[];  // Inherited roles if any
}
