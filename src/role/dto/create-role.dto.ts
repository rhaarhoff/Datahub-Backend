// src/role/dto/create-role.dto.ts
import { IsString, IsEnum } from 'class-validator';
import { RoleType } from '@prisma/client';  // Import the RoleType enum from Prisma

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  description?: string;

  @IsEnum(RoleType)  // Add validation for the type field
  type: RoleType;  // RoleType is required by Prisma's RoleCreateInput
}